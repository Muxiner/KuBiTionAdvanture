/**
 * src/systems/studio.js —— 制作/科研/建筑/行动 系统
 * 科研台、制造台/炼金台/秘术台（StudioComponent）、建筑入口、通用耗时行动(ActionComponent)。
 */

var ScienceComponent = React.createClass({
    contextTypes:{
        getScienceLevel     :React.PropTypes.func.isRequired,
        buildingSaveData    :React.PropTypes.object.isRequired,
        boxSaveData         :React.PropTypes.object.isRequired,
        setStateFromChildren:React.PropTypes.func.isRequired,
    },
    onUpdate:function(name){
        var level = this.context.getScienceLevel('背包属性');
        var boxSaveData = this.context.boxSaveData;
        boxSaveData['bag'].size = BAG_BASE_SIZE + level;
    },
    render:function(){
        return <StudioComponent onUpdate = {this.onUpdate} type = 'scienceTable' alwayMakeOne = {true} attachData = {SCIENCE_DATA} />
    }
})
var StudioComponent = React.createClass({
    contextTypes:{
        buildingSaveData    : React.PropTypes.object.isRequired,
        boxSaveData         : React.PropTypes.object.isRequired,
        useTime             : React.PropTypes.func.isRequired,
        changeItem          : React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        useItem             : React.PropTypes.func.isRequired,
        getMaxTimeOfRequire : React.PropTypes.func.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        getTheMaxTimeToUse  : React.PropTypes.func.isRequired,
        getScienceLevel     : React.PropTypes.func.isRequired,
        getBuildingLevel    : React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        checkFull           : React.PropTypes.func.isRequired,
        AudioEngine         : React.PropTypes.object.isRequired,
        eventSaveData       : React.PropTypes.object.isRequired,
        changeMsg           : React.PropTypes.func.isRequired,
    },
    getDefaultProps:function(){
        return {
            attachData:null,
            type:null,
            isBuildingUpdate:false,
            onUpdate:null
        }
    },
    getInitialState:function(){
        return {
            itemToMake:null,
            displayWindow:false,
            makeAmount:1,
            cookAmount:1,
            makeAmountMax:1,
            require:null,
            alwayMakeOne:false,
        }
    },
    getTimeNeed:function(timeNeed){
        if(this.props.attachData != MAKE_DATA)return timeNeed;
        var level = this.context.getScienceLevel('制作台属性');
        return Math.pow(MAKE_SPEED_MUL,level) * timeNeed;
    },
    make:function(name){
        var data = this.props.attachData[name];
        var amount = this.state.makeAmount;
        this.context.useItemThatPlayerHave(cloneMul(data.require,amount));
        function callBack(){
            this.context.changeItem(o(name,amount * (data.amount || 1)),this.props.type);
            // setTimeout((function(){
                if(this.props.alwayMakeOne){
                    this.setState({displayWindow:null});
                    if(this.props.onUpdate){
                        this.props.onUpdate(name);
                    }
                }else{
                    this.updateSchedule();
                }
                if(!this.props.alwayMakeOne)this.makeWindow(name);

            // }).bind(this),0);
        }
        this.context.useTime(callBack.bind(this),this.getTimeNeed(data.timeNeed * amount));
        if(data.timeNeed * amount > 2)this.context.AudioEngine.playEffect('build');
    },
    updateBuilding:function(name){
        var data = BUILDING_UPDATE_DATA[this.props.type][name];
        var o = {};
        o[name] = 1;
        this.context.useItemThatPlayerHave(data.require);
        function callBack(){
            this.context.changeItem(o,this.props.type);
            if(this.props.onUpdate){
                this.props.onUpdate(name);
            }
        }
        this.context.useTime(callBack.bind(this),data.timeNeed);
        if(data.timeNeed > 2)this.context.AudioEngine.playEffect('build');
    },
    makeWindow:function(name){
        var require = this.props.attachData[name].require;
        this.context.AudioEngine.playEffect('open');
        this.setState({
            itemToMake:name,
            makeAmount:1,
            displayWindow:true,
            require:require,
            makeAmountMax:this.context.getMaxTimeOfRequire(require)
        });
    },
    updateSchedule:function(sender){
        // var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        var value =  parseInt($('.scheduleInput')[0].value) ;
        // var value =  parseInt(obj.value);
        if(isNaN(value))value = 1;
        if(value > this.state.makeAmountMax)value = this.state.makeAmountMax;
        if(value < 1)value = 1;
        var maxTime = this.context.getTheMaxTimeToUse();
        var maxAmount = Math.floor(maxTime/this.getTimeNeed(this.props.attachData[this.state.itemToMake].timeNeed)|| 1) ;
        if(value > maxAmount)value = maxAmount;
        this.setState({makeAmount:value});
    },
    getCookResult:function(){
        var metList = this.context.boxSaveData.cooker.things;
        if(getLength(metList)<2)return false;
        for (var i = COOK_DATA.length - 1; i >= 0; i--) {
            var require = COOK_DATA[i].require;
            if(require.length == 1){
                var flag = false;
                for (var attr in metList) {
                    if(attr == require[0]){
                        flag = true;
                        break;
                    }
                }
            }else{
                flag = true;
                for (var attr in metList) {
                        if(!(require[0] == attr||require[1] == attr)){
                            flag = false;
                            break;
                        }
                    }
            }
            if(flag)return COOK_DATA[i].name;
        };
        return false;
    },
    checkMaxCookAmount:function(){
        var max = Math.floor(this.context.getTheMaxTimeToUse() * this.state.cookAmount/this.getCookTime());
        var met = this.context.boxSaveData.cooker.things;
        for(var attr in met){
            if(max > met[attr])max = met[attr];
        }
        return max;
    },
    changeCookAmount:function(sender){
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        // var value =  parseInt($('.scheduleInput')[0].value) ;
        var value =  parseInt(obj.value);
        if(isNaN(value))value = 1;
        if(value < 1)value = 1;

        var max = this.checkMaxCookAmount();
        if(value > max){
            value = max;
        }
        this.setState({cookAmount:value});
    },
    getCookTime:function(){
        var amount = this.state.cookAmount;
        var level = this.context.getBuildingLevel('烹饪技能');
        var result = amount * COOK_TIME_NEED * (Math.pow(COOK_SPEED_MUL,level));
        return result;
    },
    handleCook:function(){
        var met = this.context.boxSaveData.cooker.things;
        var cookResult = this.getCookResult();
        var amount = this.state.cookAmount;
        function callBack(){
            var o = {};
            for (var attr in met) {
                o[attr] = amount;
            };
            this.context.useItem(o,'cooker');
            o = {};
            o[cookResult] = amount;
            this.context.changeItem(o,'cooked');
            this.setState({cookAmount:1});
        }
        this.context.useTime(callBack.bind(this),this.getCookTime());
    },
    render:function(){
        // return <p></p>;
        var type = this.props.type;//选择类型，名称为对于的成品箱子名称
        if(this.props.isBuildingUpdate){
            //建筑升级的情况
            var result = getUpdateDesc.bind(this)();
            if(!result)return null;
            return  <div>
                        <div className = 'updateOuter'>
                            <div className = "studioTableOuter">
                                <table className="table table-condensed table-hover ">
                                    <tbody>
                                        {result}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
        }else{
            //生产的情况
            var attachData = this.props.attachData;
            var boxList = this.context.boxSaveData;//选择箱子
            var box = boxList[type];

            //烹调的情况
            if(type == 'cooked'){
                var cookResult = this.getCookResult();
                var disabled = (this.context.getTheMaxTimeToUse() < 1)||(this.state.cookAmount == 0)||(this.state.cookAmount > this.checkMaxCookAmount());
                if(!cookResult){
                    return <div></div>;
                }
                return <div style = {{width:'100%',height:'100%'}}>
                            <div className = ''>
                                <div className = "tableOuter">
                                    <table className="table table-condensed table-hover ">
                                        <tbody>
                                            <tr>
                                                <td>{ITEM_DATA[cookResult].name}</td>
                                                <td>{ITEM_DATA[cookResult].desc}</td>
                                                <td><input className = 'scheduleInput form-control' value = {String(this.state.cookAmount)} type = 'number' onChange = {this.changeCookAmount}/></td>
                                                <td>耗时:{Math.round(this.getCookTime())}</td>
                                                <td><BtnComponent disabled = {disabled} disabledReason = {'饱食或水分不足，或烹调数量无效'} desc = '烹调' handleClick = {this.handleCook}/></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
            }
            var result = getMakeDesc.bind(this)();

            return <div style = {{width:'100%',height:'100%'}}>
                        <div className = 'viewOuter'>
                            <div className = "tableOuter studioTableOuter">
                                <div className = "makeGroups">
                                    {result}
                                </div>
                            </div>
                            <div className = 'studioBottom' >
                                {this.state.displayWindow?schedule.bind(this)():''}
                                {this.props.alwayMakeOne?null:<BoxComponent box = {this.props.type}/>}
                                <BtnBack/>
                            </div>
                        </div>
                    </div>
        }
        function haveTimeToMake(item){
            var item = item || this.state.itemToMake;
            return this.context.getTheMaxTimeToUse() >= (this.props.attachData||BUILDING_UPDATE_DATA[type])[item].timeNeed
        }
        function getUpdateDesc(){
            var list = BUILDING_UPDATE_DATA[type];
            var result = [];
            var count = 0;
            for (var attr in  list) {
                var tmp = list[attr];
                if(this.context.boxSaveData[type].things[attr])continue;
                //科技类的物品的检查
                if(BUILDING_UPDATE_DATA[type][attr].science  && !this.context.boxSaveData[type].things[BUILDING_UPDATE_DATA[type][attr].science])continue;
                var disabled = !this.context.checkHaveResourceAll(tmp.require,true) || !haveTimeToMake.bind(this,attr)();
                result.push(<tr key = {'update' + count} title = {getItemInfoText(attr)} onMouseEnter = {this.context.changeMsg.bind(null,attr,'item')}>
                                <td>{ITEM_DATA[attr] ? ITEM_DATA[attr].name : attr}</td>
                                <td><RequireComponent requireList = {tmp.require} haveBox = {true}/></td>
                                <td>
                                    <BtnComponent disabled = {disabled} disabledReason = {'饱食或水分不足，撑不过升级耗时'} handleClick = {this.updateBuilding.bind(this,attr)} desc = "升级" />
                                </td>
                            </tr>);
                count ++;
            };
            if(count == 0)return false;
            return result;
        }
        function getMakeDesc(){
            var list = attachData;
            var bag = together(this.context.boxSaveData.bag.things,this.context.boxSaveData.bigBox.things);
            var entries = [];
            for (var attr in  list) {
                var tmp = list[attr];
                //只需一次的，科技类的物品的检查
                if(this.props.alwayMakeOne && this.context.boxSaveData[type].things[attr])continue;
                //需要科技的情况的检查
                if(attachData[attr].science  && !this.context.boxSaveData['scienceTable'].things[attachData[attr].science])continue;
                //需要事件的情况的检查
                if(attachData[attr].event  && !this.context.eventSaveData[attachData[attr].event].experienced)continue;
                //需要建筑的情况的检查
                if(tmp.building && !this.context.buildingSaveData[tmp.building].own)continue;
                entries.push({attr:attr,tmp:tmp});
            };
            // 先按「现有材料可制作的次数」从多到少排序，再按物品类型分组
            entries.sort(function(a,b){
                return getCraftableCount(b.tmp.require,bag) - getCraftableCount(a.tmp.require,bag);
            });
            var MAKE_CATEGORY_ORDER = ['weapon','equip','tool','met','bullet','poizon','food','cooked','art','special','quest'];
            var groups = {};
            var catOrder = [];
            entries.forEach(function(entry){
                var t = (ITEM_DATA[entry.attr] && ITEM_DATA[entry.attr].type) || '?';
                if(!groups[t]){
                    groups[t] = [];
                    catOrder.push(t);
                }
                groups[t].push(entry);
            });
            catOrder.sort(function(a,b){
                var ia = MAKE_CATEGORY_ORDER.indexOf(a); if(ia < 0)ia = 99;
                var ib = MAKE_CATEGORY_ORDER.indexOf(b); if(ib < 0)ib = 99;
                return ia - ib;
            });
            if(entries.length == 0)return false;
            return catOrder.map(function(cat){
                return <div className = 'makeGroup' key = {cat}>
                            <div className = 'makeGroupTitle'>{TYPE_DATA[cat] ? TYPE_DATA[cat].name : cat}</div>
                            <div className = 'makeGrid'>
                                {groups[cat].map(function(entry,count){
                                    var attr = entry.attr, tmp = entry.tmp;
                                    return <div className = 'makeItem' onClick = {this.makeWindow.bind(this,attr)} key = {'make_' + cat + '_' + count} title = {getItemInfoText(attr)} onMouseEnter = {this.context.changeMsg.bind(null,attr,'item')}>
                                                <span className = 'makeName'>{ITEM_DATA[attr] ? ITEM_DATA[attr].name : attr}{list[attr].amount?' * '+list[attr].amount:null}</span>
                                                <span className = 'makeRequire'><RequireComponent requireList = {tmp.require} haveBox = {true}/></span>
                                            </div>;
                                }.bind(this))}
                            </div>
                        </div>;
            }.bind(this));
        }
        function schedule(){
            var name = this.state.itemToMake;
            var amount = this.state.makeAmount;
            var require = this.props.attachData[name].require;
            var totalRequire = cloneMul(require,amount);
            //检查产物寄存是否被占用
            var disabled = !this.context.checkHaveResourceAll(totalRequire,true) || !haveTimeToMake.bind(this,name)()||( !this.props.alwayMakeOne && this.context.checkFull(this.props.type,name));

            return  <div className = 'schedule'>
                            <table className="table table-hover ">
                                <thead><tr><td>清单</td>{this.props.alwayMakeOne?null:<td>个数</td>}<td>消耗</td><td>耗时</td><td></td></tr></thead>
                                <tbody><tr>
                                    <td>{ITEM_DATA[name].name}</td>
                                    {this.props.alwayMakeOne?null:<td><input className = 'scheduleInput form-control' value = {String(amount)} type = 'number' onChange = {this.updateSchedule}/></td>}
                                    <td><RequireComponent haveBox = {true} withSpace = {true} showTotal = {true} requireList = {totalRequire} /></td>
                                    <td>{Math.round(this.getTimeNeed(this.props.attachData[name].timeNeed * amount))}</td>
                                    <td><BtnComponent disabled = {disabled} disabledReason = {'饱食或水分不足，或容器已满'} handleClick = {this.make.bind(this,name)} desc = "执行" /></td>
                                </tr></tbody>
                            </table>
                    </div>
        }
    }
});
var BuildingComponent = React.createClass({
    //display the building btn ,the entry to your buildings
    //call window to get the building view
    getDefaultProps:function(){
        return {
            building:null,
        }
    },
    contextTypes:{
        callWindow      :React.PropTypes.func.isRequired,
        AudioEngine     :React.PropTypes.object.isRequired,
        boxSaveData     :React.PropTypes.object.isRequired,
        buildingSaveData:React.PropTypes.object.isRequired,
    },
    callWindow:function(wind){
        this.context.callWindow(wind);
    },
    handleClick:function(){
        this.context.AudioEngine.playEffect('pick');
        var buildingMap = {
            trap        :<TrapComponent/>,
            makeTable   :<StudioComponent type = 'makeTable' attachData = {MAKE_DATA}/>,
            alchemyTable:<StudioComponent type = 'alchemyTable' attachData = {ALCHEMY_DATA}/>,
            magicTable  :<StudioComponent type = 'magicTable' attachData = {MAGIC_DATA}/>,
            scienceTable:<ScienceComponent/>,
            build       :<BuildComponent/>,
            cooker      :<CookerComponent/>,
            well        :<WellComponent/>,
            bigBox      :<BigBoxComponent/>,
            farm        :<WaitMakeComponent building = 'farm' attachData = {CROP_DATA}/>,
            alco        :<WaitMakeComponent building = 'alco' attachData = {ALCO_DATA}/>,
            toilet      :<ToiletComponent/>,
            sleepPlace  :<SleepPlaceComponent/>,
        }
        var wind = buildingMap[this.props.building];
        this.callWindow(wind);
    },
    render:function(){
        var buildingSaveData = this.context.buildingSaveData;
        var building = this.props.building;
        var size = (BUILDING_LAYOUT[building] && BUILDING_LAYOUT[building].size) || 'medium';
        return (
                <div onClick = {this.handleClick} className = {'building btn btn-default building-' + size}>
                    {BUILDING_DATA[building].name}
                    {buildingSaveData[building].hint?<span className = 'badge'>!</span>:null}
                </div>
            );
    }
});
var ActionComponent = React.createClass({
    contextTypes:{
        getTheMaxTimeToUse  :React.PropTypes.func.isRequired,
        useTime             :React.PropTypes.func.isRequired,
        useItemThatPlayerHave             :React.PropTypes.func.isRequired,
        playerStateChange   :React.PropTypes.func.isRequired,
        playerState         :React.PropTypes.object.isRequired,
        changeItem          :React.PropTypes.func.isRequired,
        checkHaveResourceAll:React.PropTypes.func.isRequired,
        setcoolDownSaveData   :React.PropTypes.func.isRequired,
        getcoolDownSaveData   :React.PropTypes.func.isRequired,
    },
    getDefaultProps:function(){
        return{
            canGet:null,
            desc:'',
            timeNeed:1,
            changable:false,
            require:null,
            action:null,
            coolDown:null,
            disabled:false,
            props:{},
        }
    },
    getInitialState:function(){
        return{
            timeNeed:1
        }
    },
    updateSchedule:function(sender){
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        // var value =  parseInt($('.scheduleInput_'+this.props.type)[0].value);
        var value =  parseInt(obj.value);
        if(this.state.timeNeed == value)return;
        if(isNaN(value))value = 1;
        var max = this.context.getTheMaxTimeToUse();
        value =  max < value?max:value;
        value =  value < 1?1:value;
        this.setState({timeNeed:value},function(){
        });
    },
    act:function(){
        var timeNeed = this.state.timeNeed;
        var canGet = this.props.canGet;
        canGet = cloneMul(canGet,timeNeed);
        var require = cloneMul(this.props.require,this.state.timeNeed);
        var stateCanGet = {};
        for (var attr in canGet) {
            if(this.context.playerState[attr] != undefined){
                stateCanGet[attr] = canGet[attr];
                delete canGet[attr];
            }
        };
        for(var attr in canGet){
            canGet[attr] = Math.floor(canGet[attr]);
        }
        function callBack(){
            this.context.playerStateChange(stateCanGet);
            this.context.changeItem(canGet,'shit');
            this.context.useItemThatPlayerHave(require,'bag');
            if(this.props.coolDown){
                this.context.setcoolDownSaveData(this.props.action,this.props.coolDown);
            }
        }
        this.context.useTime(callBack.bind(this),timeNeed,this.props.props);
    },
    render:function(){
        var name = this.state.itemToMake;
        var amount = this.state.makeAmount;
        var canGet = this.props.canGet;
        canGet = cloneMul(canGet,this.state.timeNeed);
        for(var attr in canGet){
            canGet[attr] = Math.floor(canGet[attr]);
        }
        function getTimeDesc(){
            if (this.props.changable){
                return <input value = {this.state.timeNeed} className = {'scheduleInput form-control scheduleInput_'+this.props.type} type = 'number' onChange = {this.updateSchedule}/>
            }else{
                return <span>{this.props.timeNeed}</span>
            }
        }
        var require = this.props.require;
        var disabled = this.props.disabled || this.context.getTheMaxTimeToUse() < this.state.timeNeed || !this.context.checkHaveResourceAll(require,true);

        var coolDown = this.context.getcoolDownSaveData(this.props.action);
        var hasCooledDown = (coolDown == 0 || coolDown == undefined);
        return <div className = 'schedule'>
                            <table className="table table-hover ">
                                <thead><tr>{require?<td>需求</td>:null}<td>获得</td><td>耗时</td><td></td></tr></thead>
                                <tbody><tr>
                                    {require?<td><RequireComponent haveBox = {true} requireList = {cloneMul(require,this.state.timeNeed)}/></td>:null}
                                    <td><RequireComponent isGreen = 'true' requireList = {canGet}/></td>
                                    <td>{getTimeDesc.bind(this)()}</td>
                                    {hasCooledDown?<td><BtnComponent disabled = {disabled} disabledReason = {'饱食或水分不足，撑不过该行动耗时'} handleClick = {this.act.bind(this,name)} desc = {this.props.desc} /></td>:<td><BtnComponent disabled = {true} disabledReason = {'冷却中，还需约 ' + Math.round(coolDown) + ' 小时'} desc = {this.props.desc + '(冷却:' + Math.round(coolDown) + ')'} /></td>}
                                </tr></tbody>
                            </table>
                    </div>
    }
});
