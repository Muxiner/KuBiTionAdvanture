/**
 * src/ui/menu.js —— 菜单与系统界面
 * 主菜单/设置/技能、升级地点入口、寄存器（拾取）、背包(含装备栏/所有物品/丢弃)、状态栏。
 */

//弹窗
var MenuBtnComponent = React.createClass({
    contextTypes:{
        showMenu            :React.PropTypes.string.isRequired,
        menuHint            :React.PropTypes.number.isRequired,
        setStateFromChildren:React.PropTypes.func.isRequired,
    },
    handleClick:function(){
        this.context.setStateFromChildren({showMenu:'menu'});
    },
    render:function(){
        var menuHint = this.context.menuHint;
        return <BtnComponent style = {{backgroundColor:'#9FAA83'}} className = 'stateVector' handleClick = {this.handleClick}><span>菜单</span>{(menuHint>0?<span className = 'badge'>{menuHint}</span>:'')}</BtnComponent>
    }
});
var CustomMenuComponent = React.createClass({
    contextTypes:{
        menuDesc:React.PropTypes.object.isRequired,
    },
    render:function(){
        return <div>{this.context.menuDesc}</div>
    }
});
// 容器快捷转移：把当前建筑容器内的物品一键放入「大箱子」
// props.box 为当前容器名（如 'cooked' 等）
var BoxTransferComponent = React.createClass({
    getDefaultProps:function(){
        return {
            box:null,
        }
    },
    contextTypes:{
        boxSaveData :React.PropTypes.object.isRequired,
        checkFull   :React.PropTypes.func.isRequired,
        changeItem  :React.PropTypes.func.isRequired,
        AudioEngine :React.PropTypes.object.isRequired,
    },
    // 放入大箱子：把当前容器内的物品全部移回大箱子（受容量限制）
    putOut:function(){
        var box = this.props.box;
        if(!box || box == 'bigBox')return;
        var boxSaveData = this.context.boxSaveData;
        var from = clone(boxSaveData[box].things);
        var move = {};
        for(var id in from){
            if(this.context.checkFull(boxSaveData['bigBox'],id))continue;
            move[id] = from[id];
        }
        if(getLength(move) == 0)return;
        this.context.changeItem(clone(move),'bigBox');
        this.context.changeItem(clone(move),box,true);
        this.context.AudioEngine.playEffect('exchange');
    },
    render:function(){
        if(!this.props.box || this.props.box == 'bigBox')return null;
        return <div className = 'boxTransfer'>
                    <BtnComponent handleClick = {this.putOut}>放入大箱子</BtnComponent>
                </div>;
    }
});
// ===== 2) 菜单与系统界面 =====
// 常规主菜单：技能列表/描述、设置；账号存档与本地多槽存档的保存/读取/删除
var NormalMenuComponent = React.createClass({
    contextTypes:{
        setStateFromChildren:React.PropTypes.func.isRequired,
        skill               :React.PropTypes.object.isRequired,
        settings            :React.PropTypes.object.isRequired,
        upload              :React.PropTypes.func.isRequired,
        download            :React.PropTypes.func.isRequired,
        saveLocal           :React.PropTypes.func.isRequired,
        loadLocal           :React.PropTypes.func.isRequired,
        deleteLocal         :React.PropTypes.func.isRequired,
        getLocalSaves       :React.PropTypes.func.isRequired,
        setVolume           :React.PropTypes.func.isRequired,
        AudioEngine         :React.PropTypes.object.isRequired,
        currentScene        :React.PropTypes.string.isRequired,
        menuHint            :React.PropTypes.number.isRequired,
        mstState            :React.PropTypes.object.isRequired,
        robberSaveData      :React.PropTypes.object.isRequired,
    },
    getDefaultProps:function(){
    },
    getInitialState:function(){
        var menuType ='settings';
        if(this.context.menuHint){
            menuType = 'skill';
        }
        return{
            menuType:menuType,
            selectedSkill:null,
            localSaves:null,
            saveMsg:'',
        }
    },
    componentWillMount:function(){
        this.context.setStateFromChildren({menuHint:0});
    },
    componentDidMount:function(){
        this.refreshLocalSaves();
    },
    refreshLocalSaves:function(){
        this.setState({localSaves:this.context.getLocalSaves()});
    },
    slotName:function(slot){
        return slot == LOCAL_SAVE_AUTO_SLOT?'自动存档':('第' + slot + '号');
    },
    handleLocalSave:function(slot){
        //不使用原生 confirm，避免浏览器弹窗节流导致无法重复保存
        if(this.context.saveLocal(slot)){
            this.refreshLocalSaves();
            this.setState({saveMsg:this.slotName(slot) + '保存成功'});
        }else{
            this.setState({saveMsg:this.slotName(slot) + '保存失败'});
        }
    },
    handleLocalLoad:function(slot){
        var saves = this.context.getLocalSaves();
        if(!saves[slot]){
            this.setState({saveMsg:'该存档位是空的...'});
            return;
        }
        this.context.loadLocal(slot);
    },
    handleLocalDelete:function(slot){
        if(confirm('确定删除' + this.slotName(slot) + '存档吗？')){
            this.context.deleteLocal(slot);
            this.refreshLocalSaves();
            this.setState({saveMsg:this.slotName(slot) + '已删除'});
        }
    },
    upload:function() {
        this.context.upload();
    },
    download:function() {
        this.context.download();
    },
    quitMenu:function(){
        this.context.setStateFromChildren({showMenu:''});
    },
    handleTab:function(menuType){
        this.setState({menuType:menuType});
    },
    handleSkillTab:function(skill){
        this.setState({selectedSkill:skill});
    },
    handleChange:function(type,sender){
        // var value =  ($('#'+type)[0].value);
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        // var value =  parseInt($('.scheduleInput_'+this.props.type)[0].value);
        var value =  (obj.value);
        var settings = this.context.settings;
        settings['save_' + type] = value;
        this.context.setStateFromChildren({settings:settings});
    },
    handleAuto:function(){
        var value =  ($('#autoSave')[0].value);
        var settings = this.context.settings;
        settings['autoSave'] = !settings['autoSave'];
        this.context.setStateFromChildren({settings:settings});
    },
    willUpload:function(){
        //不使用原生 confirm，避免浏览器弹窗节流导致无法重复保存
        this.context.upload(true, function(ok, reason){
            this.setState({saveMsg:ok?'账号保存成功':('账号保存失败' + (reason?'（' + reason + '）':''))});
        }.bind(this));
    },
    setSort:function(){
        var settings = this.context.settings;
        settings.sort = !settings.sort;
        this.context.setStateFromChildren({settings:settings});
    },
    render:function(){
        var menuType = this.state.menuType;
        var skill = this.context.skill;
        var selectedSkill = this.state.selectedSkill;
        function getSkillList(){
            if(getLength(skill)==0){
                return <p style = {{color:COLOR.YELLOW}}>你还没有习得任何技能</p>
            }
            var result = [];
            for(var attr in skill){
                if(!SKILL_DATA[attr].name)continue;
                result.push(<div className = 'btn skillItem' onClick = {this.handleSkillTab.bind(this,attr)} key = {SKILL_DATA[attr].name}>{SKILL_DATA[attr].name} &nbsp; {SKILL_DATA[attr].one?null:<span className = 'badge'>{skill[attr]}</span>}</div>)
            }
            return result;
        }
        function getSkillDesc(){
            selectedSkill = selectedSkill||(getFirst(skill) && getFirst(skill).attr)||null;
            if(!selectedSkill)return null;

            function getAmount(){
                var lv = skill[selectedSkill];
                var buffTotal = lv * SKILL_DATA[selectedSkill].buff;
                var desc_1,desc_2;
                switch(selectedSkill){
                    case 'greedy'  :
                    case 'durable' :
                    case 'physique':
                    case 'lucky'   :
                    case 'fighter' :
                        desc_1 = '当前加成:';
                        desc_2 = Math.round(100 * buffTotal) + '%';
                        break;
                    case 'magic'  :
                        desc_1 = '当前魔法加成:';
                        desc_2 = Math.round(100 * buffTotal) + '%';
                        break;
                    case 'melee'  :
                        desc_1 = '当前近战加成:';
                        desc_2 = Math.round(100 * buffTotal) + '%';
                        break;
                    case 'shoot':
                        desc_1 = '当前远程加成:';
                        desc_2 = Math.round(100 * buffTotal) + '%';
                        break;
                    case 'alco':
                        desc_1 = '当前酿酒加成:';
                        desc_2 = Math.round(100 * buffTotal) + '%';
                        break;
                    case 'farm' :
                        desc_1 = '当前种植收益加成:'
                        desc_2 = Math.round(100 * buffTotal) + '%';
                        break;
                    case 'def'  :
                        var buffTotal =  100 - Math.round(100 * (Math.pow(SKILL_DATA[selectedSkill].buff,lv) * 0.95) + 0.05 * (10/(10 + lv)));
                        desc_1 = '当前伤害减免:';
                        desc_2 = (buffTotal) + '%';
                        break;
                    case 'agile':
                        desc_1 = '当前射程加成:';
                        desc_2 = buffTotal;
                        break;
                }
                return <p>{desc_1}<span style = {{color:COLOR.GREEN}}>{desc_2}</span></p>
            }
            return <div>
                        <p>{SKILL_DATA[selectedSkill].desc}</p>
                        {getAmount.bind(this)()}
                    </div>
        }
        function getMenu(){
            switch(menuType){
                case'skill':
                return (
                    <div className = 'skillMenu'>
                        <div className = 'skill panel panel-primary'>
                            <div className = 'panel-heading'>所有技能</div>
                            <div className = 'panel-body'>
                                {getSkillList.bind(this)()}
                            </div>
                        </div>
                        <div className = 'skill panel panel-primary'>
                            <div className = 'panel-heading'>描述</div>
                            <div className = 'panel-body' style = {{padding:'5px'}}>
                                {getSkillDesc.bind(this)()}
                            </div>
                        </div>
                    </div>
                )
                break;
                case'settings':
                var settings = this.context.settings;
                var canSaveRemote = this.context.currentScene == 'home' && (getLength(this.context.mstState) == 0) && !this.context.robberSaveData.robber;
                return (
                    <div className = 'skillMenu settingsMenu'>
                        <div className = 'settingsRow'>
                            <div className = 'settingsField'>
                                <label htmlFor="account">账号</label>
                                <input onChange = {this.handleChange.bind(this,'account')} type="text" className = "form-control settingsInput" id="account" value = {settings.save_account}></input>
                            </div>
                            <div className = 'settingsField'>
                                <label htmlFor="pass">密码</label>
                                <input onChange = {this.handleChange.bind(this,'pass')} type="password" className = "form-control settingsInput" id="pass" value = {settings.save_pass}></input>
                            </div>
                        </div>
                        {function(){
                            var warns = [];
                            if(this.context.currentScene != 'home')warns.push('在家才能保存哦。。。');
                            if(getLength(this.context.mstState) != 0)warns.push('战斗中不能保存哦。。。');
                            if(this.context.robberSaveData.robber)warns.push('你正处于危险之中。。。');
                            if(warns.length == 0)return null;
                            return <div className = 'settingsRow settingsWarn'>
                                        {warns.map(function(w,i){return <span key = {i}>{w}</span>})}
                                    </div>;
                        }.bind(this)()}
                        <div className = 'settingsRow'>
                            <BtnComponent disabled = {!canSaveRemote} handleClick = {this.willUpload}>保存</BtnComponent>
                            <BtnComponent handleClick = {this.download}>读取</BtnComponent>
                        </div>
                        <div className = 'settingsRow settingsStatus'>{this.state.saveMsg}</div>
                        <div className = 'settingsRow settingsTitle'>自动存档</div>
                        {function(){
                            var self = this;
                            var canSave = canSaveRemote;
                            var localSaves = this.state.localSaves || this.context.getLocalSaves();
                            var seasonName = {spring:'春',summer:'夏',autumn:'秋',winter:'冬'};
                            function makeRow(slot,label){
                                var save = localSaves[slot];
                                var desc = save
                                    ? ((save.generation?'轮回' + save.generation + ' ':'') + (seasonName[save.season]||'') + '第' + save.day + '日')
                                    : '空存档';
                                return (
                                    <div key = {'localSave' + slot} className = 'settingsRow localSaveRow'>
                                        <span className = 'localSaveDesc'>{label + ' ' + desc}</span>
                                        <BtnComponent disabled = {!canSave} handleClick = {self.handleLocalSave.bind(self,slot)}>保存</BtnComponent>
                                        <BtnComponent disabled = {!save} handleClick = {self.handleLocalLoad.bind(self,slot)}>读取</BtnComponent>
                                        <BtnComponent disabled = {!save} handleClick = {self.handleLocalDelete.bind(self,slot)}>删除</BtnComponent>
                                    </div>
                                );
                            }
                            var rows = [makeRow(LOCAL_SAVE_AUTO_SLOT,'')];
                            rows.push(<div key = 'manualTitle' className = 'settingsRow settingsTitle'>本地存档</div>);
                            for(var i = 1;i <= LOCAL_SAVE_SLOTS;i++){
                                rows.push(makeRow(i,i + '.'));
                            }
                            return rows;
                        }.bind(this)()}
                        <label className = 'settingsRow settingsCheckbox' htmlFor="autoSave">
                            <input checked = {this.context.settings.autoSave} onChange = {this.handleAuto} id="autoSave" type="checkbox" />
                            <span>出门时保存</span>
                        </label>
                        <div className = 'settingsRow'>
                            <BtnComponent handleClick = {this.context.setVolume}>声音：{this.context.AudioEngine.on?'开':'关'}</BtnComponent>
                            <BtnComponent handleClick = {this.setSort}>自动整理背包：{this.context.settings.sort?'开':'关'}</BtnComponent>
                        </div>
                        <div className = 'settingsRow'>
                            <a target="blank" href = "http://1.maou.sinaapp.com/?page_id=47">作者的小站</a>
                        </div>
                    </div>
                )
            }
        }
        return  <div className = 'menuOuter'>
                    <div className = 'menuInner'>
                        <div className = 'menu'>
                            <div className = 'menuMain'>
                                {getMenu.bind(this)()}
                            </div>
                            <ul className="nav">
                                <div className='btn' onClick = {this.handleTab.bind(this,'skill')}>技能</div>
                                <div className='btn' onClick = {this.handleTab.bind(this,'settings')}>设置</div>
                            </ul>
                            <BtnComponent desc = '返回' handleClick = {this.quitMenu}/>
                        </div>
                    </div>
                </div>
    }
});
var MenuComponent = React.createClass({
    contextTypes:{
        showMenu            :React.PropTypes.string.isRequired,
        setStateFromChildren:React.PropTypes.func.isRequired,
        skill               :React.PropTypes.object.isRequired,
    },
    render:function(){
        var type = this.context.showMenu;
        if(!type || type == '')return null
        switch(type){
            case 'menu':
            var inner = <NormalMenuComponent />
            break;
            case 'custom':
            var inner = <CustomMenuComponent />
        }
        return <div className = 'menuOuter'>
                    <div className = 'menuInner'>
                        <div className = 'menu'>
                            <div className = 'menuMain'>
                                {inner}
                            </div>
                        </div>
                    </div>
                </div>
    }
});

//outer components
//中组件
var UpgradePlaceComponent = React.createClass({
    contextTypes:{
        skill:React.PropTypes.object.isRequired,
        setStateFromChildren:React.PropTypes.func.isRequired,
        useTime:React.PropTypes.func.isRequired,
    },
    getInitialState:function(){
        return{
            teacher:false,
        }
    },
    handleDone:function(type) {
        var skillType = EVENT_DATA[type].skill;
        var skill = this.context.skill;
        skill[skillType] = (skill[skillType]||0) + 1;
        this.context.useTime(function(){
            this.context.setStateFromChildren({skill:skill});
            this.context.setStateFromChildren({menuHint:1},true);
            this.setState({rewarding:true});
        }.bind(this),0.1);
    },
    getTeathers:function(){
        var list = {
            meleeUpgrade:true,
            shootUpgrade:true,
            magicUpgrade:true,
            agileUpgrade:true,
            defUpgrade:true,
            farmUpgrade:true,
            alcoUpgrade:true,
        }
        var skill = this.context.skill;
        var result = [];
        for(var attr in list){
            var itemList = EVENT_DATA[attr].want || {gold:10};
            var skillType  = EVENT_DATA[attr].skill;
            var level = skill[skillType];
            itemList = cloneMul(itemList,((1+1 *level)*(1+0.001 *level)),true);
            if(EVENT_DATA[attr]){
                result.push(<tr key = {attr}>
                                <td>{EVENT_DATA[attr].name}</td>
                                <td>{SKILL_DATA[skillType].name}</td>
                                <td><GiveComponent itemList = {itemList} onDone = {this.handleDone.bind(null,attr)}/></td>
                            </tr>)
            }
        }
        return result;
    },
    handleTeacherWindow:function(teacher){
        this.setState({teacher:teacher})
    },
    render:function(){
        if(this.state.teacher){
            return  <div>
                        <TeacherComponent type = {this.state.teacher}/>
                        <BtnComponent desc= '返回' handleClick = {this.handleTeacherWindow.bind(null,null)}/>
                    </div>
        }
        return  <div>
                    <div className = "tableOuter">
                        <table className="table table-condensed table-hover">
                            <thead>
                                <tr><td>教师</td><td>内容</td><td>学费</td></tr>
                            </thead>
                            <tbody>
                                {this.getTeathers()}
                            </tbody>
                        </table>
                    </div>
                    <BtnHome placeName = {'upgradePlace'}/>
                </div>

    }
})


var RegisterComponent = React.createClass({
    //寄存器，用于存放获得物品
    getDefaultProps:function(){
        return {
            itemList:null,
            willUnmount:null,
            canPick:true,//显示'全部拾取'
            canBack:true,//显示'返回'
            canBeEmpty:false,//为空时自动返回
        }
    },
    contextTypes:{
        boxSaveData         :React.PropTypes.object.isRequired,
        setStateFromChildren:React.PropTypes.func.isRequired,
        checkFull           :React.PropTypes.func.isRequired,
        changeItem          :React.PropTypes.func.isRequired,
        callWindow          :React.PropTypes.func.isRequired,
    },
    componentWillMount:function(){
        var itemList = this.props.itemList;
        if(!itemList){
            return;
        }
        var saveData = this.context.boxSaveData;
        saveData.register.things = cloneMul(itemList,1);
        this.context.setStateFromChildren({boxSaveData:saveData});
    },
    componentWillUnmount:function(){
        // if(this.props.willUnmount){
        //     this.props.willUnmount();
        // }
    },
    grabAll:function(){
        var saveData = this.context.boxSaveData;
        var itemList = saveData.register.things;
        for(var attr in itemList){
            if(!this.context.checkFull('bag',attr)){
                this.context.changeItem(o(attr,itemList[attr]),'bag');
                this.context.changeItem(o(attr,itemList[attr]),'register',true);
            }
        }
        this.context.setStateFromChildren({boxSaveData:saveData});
        this.check();
    },
    check:function(){
        if(this.props.canBeEmpty == true)return;
        var saveData = this.context.boxSaveData;
        var itemList = saveData.register.things;
        if(getLength(itemList) == 0){
            this.context.callWindow(null);
            this.props.willUnmount && this.props.willUnmount();
        }
    },
    render:function(){
        var things = this.context.boxSaveData.register.things;
        var disabled = (getLength(things)== 0);
        return  <div>
                    {this.props.canBack?<BtnBack callBack = {this.props.willUnmount || null}/>:null}
                    <BoxComponent isRegister = {true} box = 'register' itemList = {things} handleClick = {this.check}/>
                    {this.props.canPick?<BtnComponent sound = 'pickall' disabled = {disabled} handleClick = {this.grabAll} desc = '全部拾取'/>:null}
                </div>
    }
});
var BagComponent = React.createClass({
    contextTypes:{
        getScienceLevel:React.PropTypes.func.isRequired,
        boxSaveData    :React.PropTypes.object.isRequired,
        detailedItem   :React.PropTypes.string.isRequired,
        detailedType   :React.PropTypes.string.isRequired,
        detailedList   :React.PropTypes.array.isRequired,
        durableSaveData:React.PropTypes.object.isRequired,
        getMaxDurable  :React.PropTypes.func.isRequired,
        getTempDesc    :React.PropTypes.func.isRequired,
        currentEquip   :React.PropTypes.object.isRequired,
        unequipSlot    :React.PropTypes.func.isRequired,
        playerState    :React.PropTypes.object.isRequired,
        handleItemClick:React.PropTypes.func.isRequired,
        currentBox     :React.PropTypes.string.isRequired,
        useItem        :React.PropTypes.func.isRequired,
        cancelEquip    :React.PropTypes.func.isRequired,
        changeMsg      :React.PropTypes.func.isRequired,
        AudioEngine    :React.PropTypes.object.isRequired,
        discardItem    :React.PropTypes.func.isRequired,
        skill          :React.PropTypes.object.isRequired,
        getMaxState    :React.PropTypes.func.isRequired,
    },
    getInitialState:function(){
        return {
            discardConfirm:null,
        }
    },
    getDefaultProps:function(){
        return {
            items:[],
            size:1,
            msg:'',
            changeMsg:null
        };
    },
    componentWillMount:function(){
        var level = this.context.getScienceLevel('bagSizeBonus');
        var boxSaveData = this.context.boxSaveData;
        boxSaveData['bag'].size = BAG_BASE_SIZE + level;
    },
    getItemBoxFromDetail:function(){
        var detailedItem = this.context.detailedItem;
        var boxSaveData = this.context.boxSaveData;
        var currentBox = this.context.currentBox;
        var box;
        if(boxSaveData.bag.things[detailedItem]){
            box = 'bag';
        }else{
            if(currentBox && boxSaveData[currentBox].things[detailedItem]){
                box = currentBox;
            }else{
                box = false;
            }
        }
        return box;
    },
    useItemFromDetail:function(){
        var detailedItem = this.context.detailedItem;
        this.context.handleItemClick(detailedItem,this.getItemBoxFromDetail());
    },
    // 丢弃物品：默认丢 1 个，按住 Shift 丢该容器内全部；需二次确认
    handleDiscard:function(item,event){
        if(this.state.discardConfirm != item){
            this.setState({discardConfirm:item});
            return;
        }
        var box = this.getItemBoxFromDetail();
        if(!box)return;
        this.context.cancelEquip(item);
        var have = this.context.boxSaveData[box].things[item] || 0;
        var amount = (event && event.shiftKey) ? have : 1;
        if(amount < 1)amount = 1;
        this.context.discardItem(item,box,amount);
        this.setState({discardConfirm:null});
        this.context.changeMsg('','item');
        this.context.AudioEngine.playEffect('pick');
    },
    cancelDiscard:function(){
        this.setState({discardConfirm:null});
    },
    // 汇总所有容器（背包/大箱子/各工作台等）内的物品，按类别分组、组内按数量降序
    getOwnedList:function(){
        var boxSaveData = this.context.boxSaveData;
        var owned = {};
        for(var box in boxSaveData){
            var things = boxSaveData[box] && boxSaveData[box].things;
            if(!things)continue;
            for(var id in things){
                var base = itemBaseId(id);
                owned[base] = (owned[base] || 0) + things[id];
            }
        }
        // 按物品类型分组
        var order = ['weapon','equip','tool','bullet','met','food','cooked','poizon','art','special','quest','?'];
        var groups = {};
        var catOrder = [];
        for(var id2 in owned){
            var t = (ITEM_DATA[id2] && ITEM_DATA[id2].type) || '?';
            if(!groups[t]){ groups[t] = []; catOrder.push(t); }
            groups[t].push({id:id2,amount:owned[id2]});
        }
        catOrder.sort(function(a,b){
            var ia = order.indexOf(a); if(ia < 0)ia = 99;
            var ib = order.indexOf(b); if(ib < 0)ib = 99;
            return ia - ib;
        });
        return catOrder.map(function(cat){
            var items = groups[cat];
            items.sort(function(a,b){ return b.amount - a.amount; });
            return <div className = 'ownedGroup' key = {cat}>
                        <div className = 'ownedGroupTitle'>{TYPE_DATA[cat] ? TYPE_DATA[cat].name : cat}</div>
                        {items.map(function(entry){
                            var name = ITEM_DATA[entry.id] ? ITEM_DATA[entry.id].name : entry.id;
                            return <div className = 'ownedItem' key = {entry.id}>
                                        <span className = 'ownedName'>{name}</span>
                                        <span className = 'ownedAmount'>×{entry.amount}</span>
                                    </div>;
                        })}
                    </div>;
        });
    },
    // 属性统计：由当前装备与技能推导出的关键属性
    getStatPanel:function(){
        var skill = this.context.skill || {};
        var currentEquip = this.context.currentEquip;
        var getMaxState = this.context.getMaxState;
        function skillPct(id){
            return Math.round(100 * (skill[id] || 0) * SKILL_DATA[id].buff);
        }
        var rows = [];
        rows.push(['生命上限', getMaxState('hp')]);
        rows.push(['体力上限', getMaxState('ps')]);
        rows.push(['精神上限', getMaxState('san')]);
        rows.push(['近战加成', '+' + skillPct('melee') + '%']);
        rows.push(['远程加成', '+' + skillPct('shoot') + '%']);
        rows.push(['魔法加成', '+' + skillPct('magic') + '%']);
        rows.push(['伤害加成', '+' + skillPct('fighter') + '%']);
        var dl = skill.def || 0;
        var mul = Math.pow(SKILL_DATA.def.buff, dl) * 0.95 + 0.05 * (10 / (10 + dl));
        rows.push(['伤害减免', Math.round(100 * (1 - mul)) + '%']);
        var moveMul = 1, collect = 0, temp = 0;
        for(var slot in currentEquip){
            var eq = currentEquip[slot];
            if(!eq)continue;
            var d = ITEM_DATA[eq];
            if(d.moveFaster)moveMul *= d.moveFaster;
            if(d.collectSpeed)collect += d.collectSpeed;
            if(d.tempBuff)temp += d.tempBuff;
        }
        rows.push(['移速加成', '+' + Math.round(100 * (1 - moveMul)) + '%']);
        rows.push(['采集速度', '+' + Math.round(100 * collect) + '%']);
        rows.push(['体温修正', (temp > 0 ? '+' : '') + Math.round(temp)]);
        rows.push(['贪婪', '+' + skillPct('greedy') + '%']);
        rows.push(['幸运', '+' + skillPct('lucky') + '%']);
        return rows.map(function(r){
            return <div className = 'statRow' key = {r[0]}>
                        <span className = 'statName'>{r[0]}</span>
                        <span className = 'statValue'>{r[1]}</span>
                    </div>;
        });
    },
    // 装备栏：显示 头/身/足/颈/武器1/武器2；点击已装备槽可卸下放回背包
    getEquipBar:function(){
        var currentEquip = this.context.currentEquip;
        return EQUIP_SLOTS.map(function(slot){
            var item = currentEquip[slot];
            var label = EQUIP_TYPE_DATA[slot] || slot;
            return <div className = 'equipSlot' key = {slot} onClick = {item?this.context.unequipSlot.bind(null,slot):null} title = {item?ITEM_DATA[item].name:'（空）'}>
                        <span className = 'equipSlotLabel'>{label}</span>
                        <span className = {item?'equipSlotItem':'equipSlotItem empty'}>{item?ITEM_DATA[item].name:'空'}</span>
                    </div>;
        }.bind(this));
    },
    render:function() {
        var detailedType = this.context.detailedType;
        var detailedItem = this.context.detailedItem;
        var detailedList = this.context.detailedList;
        function getItemDetail(){
            if(!detailedItem)return null;
            var type = ITEM_DATA[detailedItem].type;
            //装备的处理
            var currentEquip = this.context.currentEquip;
            var equipShow = null;
            var equipType = ITEM_DATA[detailedItem].equipType;
            if(equipType){
                if(currentEquip[equipType] != detailedItem){
                    equipShow = <span style = {{color:COLOR.RED}}>右键装备</span>;
                }else{
                    equipShow = <span style = {{color:COLOR.GREEN}}>已装备</span>;
                }
            }
            function getDetailDesc(){
                if(ITEM_DATA[detailedItem].effect){
                    var res = [];
                    for (var attr in ITEM_DATA[detailedItem].effect) {
                        var effectAmount = ITEM_DATA[detailedItem].effect[attr];

                        var prefix = effectAmount > 0?'+':'';
                        var isGreen;
                        if(attr == 'temp'){
                            isGreen = (this.context.playerState['temp'].amount>0)!=(effectAmount>0);
                        }else{
                            isGreen = (effectAmount > 0);
                        }
                        res.push(<span key = {attr} className = {'detailVector '+(isGreen?"effectPlus":"effectMinus")}>{STATE_DATA[attr].name}:{prefix}{effectAmount}</span>)
                    };
                    return <p>{res}</p>
                }else{
                    return null
                }
            }
            var maxDurable = ITEM_DATA[detailedItem].durable && this.context.getMaxDurable(detailedItem);
            var durable = durableWear(this.context.durableSaveData,detailedItem);
            return  <div className = "detailHead">
                        <p className = "detailVector effectHeading clearFix">
                            {ITEM_DATA[detailedItem].name}
                        </p>
                        {equipType?<p className = "detailVector effectHeading clearFix">{EQUIP_TYPE_DATA[equipType]}</p>:null}
                        <p className = "detailVector effectHeading clearFix">
                            {equipShow || (TYPE_DATA[ITEM_DATA[detailedItem].type] ? TYPE_DATA[ITEM_DATA[detailedItem].type].name : ITEM_DATA[detailedItem].type)}
                        </p>
                        {(!IS_IPAD && ITEM_DATA[detailedItem].canUse)?<p className = "detailVector effectHeading clearFix" >右键使用</p> : null}
                        {maxDurable != undefined?<div className = "detailVector effectHeading clearFix" >耐久度：{maxDurable - durable}/{maxDurable}</div> : null}
                        <div className = "detailVector detailDesc">
                            {ITEM_DATA[detailedItem].desc}
                            {(IS_IPAD && ITEM_DATA[detailedItem].canUse)?<BtnComponent disabled = {!this.getItemBoxFromDetail()} handleClick = {this.useItemFromDetail}>使用</BtnComponent>:null}
                            {(IS_IPAD && ITEM_DATA[detailedItem].equipType )?<BtnComponent disabled = {this.getItemBoxFromDetail()!='bag'} handleClick = {this.useItemFromDetail}>装备</BtnComponent>:null}
                        </div>
                        {(ITEM_DATA[detailedItem].type != 'quest' && ITEM_DATA[detailedItem].type != 'special')?
                            <div className = "detailVector detailDiscard">
                                {this.state.discardConfirm == detailedItem ?
                                    <span>
                                        <BtnComponent disabled = {!this.getItemBoxFromDetail()} handleClick = {this.handleDiscard.bind(this,detailedItem)}>确认丢弃</BtnComponent>
                                        <BtnComponent handleClick = {this.cancelDiscard}>取消</BtnComponent>
                                        <span className = "discardHint">Shift=丢全部</span>
                                    </span>
                                    :
                                    <span>
                                        <BtnComponent disabled = {!this.getItemBoxFromDetail()} handleClick = {this.handleDiscard.bind(this,detailedItem)}>丢弃</BtnComponent>
                                        <span className = "discardHint">点两次·Shift=丢全部</span>
                                    </span>
                                }
                            </div>
                        : null}
                        {getDetailDesc.bind(this)()}
                    </div>
        }
        var tempDesc = this.context.getTempDesc();
        function getStateDetail(){
            var name = STATE_DATA[detailedItem].name;
            if(detailedItem == 'temp'){
                var desc = <div>
                                <p>{TEMP_DATA[tempDesc].desc}</p>
                            </div>
            }else{
                var desc = STATE_DATA[detailedItem].desc;
            }
            return  <div className = "detailHead">
                        <span className = 'detailVector effectHeading clearFix'>{name}</span>
                        {detailedItem == 'temp'?<span className = 'detailVector effectHeading clearFix'>{TEMP_DATA[tempDesc].name}</span> :null}
                        <div className = "detailVector detailDesc">
                            {desc}
                        </div>
                    </div>
        }
        function getDescDetail(){
            var result = [];
            for (var i = 0; i < detailedList.length; i++) {
                result.push(detailedList[i]);
            };
            return  <div className = "detailHead">
                        <div className = "detailVector detailDesc">
                            {result}
                        </div>
                    </div>
        }
        function getDetail(){
            switch(detailedType){
                case 'item':return getItemDetail.bind(this)();
                case 'state':return getStateDetail.bind(this)();
                case 'desc':return getDescDetail.bind(this)();
            }
            return false;
        }
        return  <div className="panel panel-primary equipMain">
                    <div className="panel-heading">
                        背包
                    </div>
                    <div className="panel-body  clearFix">
                        <div className = "equipBar">
                            {this.getEquipBar()}
                        </div>
                        <div className = "statPanel">
                            <div className = "statTitle">属性统计</div>
                            <div className = "statGrid">
                                {this.getStatPanel()}
                            </div>
                        </div>
                        <div className = "equip" id = "equip">
                            <BoxComponent box = 'bag'/>
                        </div>
                        <div className = "detail" id = "detail">
                            {getDetail.bind(this)()}
                        </div>
                        <div className = "ownedList">
                            <div className = "ownedTitle">所有物品</div>
                            {this.getOwnedList()}
                        </div>
                    </div>
                </div>
    }
});
var StateComponent = React.createClass({
    render:function(){
        function getStatesName(){
            var result = [];
            for(var attr in PLAYER_STATE_INIT){
                result.push(<StateVectorComponent key = {attr} state = {attr}/>);
            }
            return result;
        }
        return  <div className="stateMain">
                    {getStatesName()}
                    <MenuBtnComponent />
                    {MODE=='DEBUG'?<DebugComponent/>:null}
                </div>
    }
})
