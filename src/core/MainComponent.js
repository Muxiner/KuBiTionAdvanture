/**
 * src/core/MainComponent.js —— 全局状态中心
 * 持有全部游戏状态，通过 context 向子组件下发；负责时间推进、每日结算、物品操作、
 * 装备/耐久、死亡与转生、天气季节、存档（账号/本地）等核心逻辑。
 */

// ===== 4) 全局状态中心 =====
// MainComponent：持有全部游戏状态（背包/建筑/地牢/事件/玩家六维/时间/技能等），
// 通过 context 向约 50 个子组件下发；负责时间推进、每日结算、物品操作、死亡与转生、
// 天气季节、以及（账号/本地）存档等核心逻辑。
var MainComponent = React.createClass({
    startSeason:'',//游戏开始时的季节
    instanceSeq:1,//耐久类物品实例化时的自增序号
    getInitialState:function(){
        var startSeason = Math.random() > 0.5?'spring':'autumn';
        var state = {
            boxSaveData     :clone(BOX_INIT),
            buildingSaveData:clone(BUILDING_INIT),
            coolDownSaveData:clone(COOL_DOWN_INIT),
            currentBox      :'',
            currentEquip    :{head:null,body:null,foot:null,neck:null,hand:null,weapon1:null,weapon2:null},
            currentScene    :'home',
            defaultWeapon   :[],
            detailedItem    :'',
            detailedList    :[],
            detailedType    :'',
            dungeonSaveData :{stairCount:1,roomCount:1,deepest:1,stairData:{}},
            durableSaveData :clone(DURABLE_INIT),
            itemInstances   :{},//耐久类物品实例键 -> 基础物品id
            robberSaveData  :clone(ROBBER_INIT),
            eventSaveData   :clone(EVENT_INIT),
            isDueling       :false,
            menuDesc        :{},
            menuHint        :0,
            misk            :0,
            msgList         :[],
            mstState        :{},//怪物的状态
            placeSaveData   :clone(PLACE_INIT),
            playerState     :clone(PLAYER_STATE_INIT),
            progress        :0,
            startSeason     :startSeason,
            season          :startSeason,
            showMenu        :'',
            skill           :{},
            time            :{day:1,hour:6},
            tradeSaveData   :clone(TRADE_INIT),
            settings        :{sort:false,autoSave:true},
            wind            :null,
            maouLevel       :0,
            campSaveData    :{
                choice:null,
                picked:false,
            },
            generation      :0,
        }
        if(MODE=='DEBUG'){
            state.skill = DEBUG_SKILL;
        }
        var saveData = clone(state);
        state.saveData = saveData;
        return state;
    },
    childContextTypes:{
        maouLevel            : React.PropTypes.number.isRequired,
        parentState          : React.PropTypes.object.isRequired,
        AudioEngine          : React.PropTypes.object.isRequired,
        boxSaveData          : React.PropTypes.object.isRequired,
        buildingSaveData     : React.PropTypes.object.isRequired,
        cancelEquip          : React.PropTypes.func.isRequired,
        unequipSlot          : React.PropTypes.func.isRequired,
        discardItem          : React.PropTypes.func.isRequired,
        changeItem           : React.PropTypes.func.isRequired,
        changeMsg            : React.PropTypes.func.isRequired,
        checkFull            : React.PropTypes.func.isRequired,
        checkHaveResource    : React.PropTypes.func.isRequired,
        checkHaveResourceAll : React.PropTypes.func.isRequired,
        currentEquip         : React.PropTypes.object.isRequired,
        currentScene         : React.PropTypes.string.isRequired,
        defaultWeapon        : React.PropTypes.array.isRequired,
        detailedItem         : React.PropTypes.string.isRequired,
        detailedList         : React.PropTypes.array.isRequired,
        detailedType         : React.PropTypes.string.isRequired,
        dungeonSaveData      : React.PropTypes.object.isRequired,
        durableSaveData      : React.PropTypes.object.isRequired,
        eventSaveData        : React.PropTypes.object.isRequired,
        getBuildingLevel     : React.PropTypes.func.isRequired,
        getMaxDurable        : React.PropTypes.func.isRequired,
        getMaxTimeOfRequire  : React.PropTypes.func.isRequired,
        getMstCircle         : React.PropTypes.func.isRequired,
        getScienceLevel      : React.PropTypes.func.isRequired,
        getTempDesc          : React.PropTypes.func.isRequired,
        getTheMaxTimeToUse   : React.PropTypes.func.isRequired,
        getValue             : React.PropTypes.func.isRequired,
        getcoolDownSaveData  : React.PropTypes.func.isRequired,
        getTimeNeed          : React.PropTypes.func.isRequired,
        handleDeath          : React.PropTypes.func.isRequired,
        handleExchange       : React.PropTypes.func.isRequired,
        isDueling            : React.PropTypes.bool.isRequired,
        menuDesc             : React.PropTypes.object.isRequired,
        menuHint             : React.PropTypes.number.isRequired,
        msgList              : React.PropTypes.array.isRequired,
        mstState             : React.PropTypes.object.isRequired,
        mstStateChange       : React.PropTypes.func.isRequired,
        placeSaveData        : React.PropTypes.object.isRequired,
        playerState          : React.PropTypes.object.isRequired,
        playerStateChange    : React.PropTypes.func.isRequired,
        playerStateUse       : React.PropTypes.func.isRequired,
        season               : React.PropTypes.string.isRequired,
        startSeason          : React.PropTypes.string.isRequired,
        setCurrentBox        : React.PropTypes.func.isRequired,
        setCurrentScene      : React.PropTypes.func.isRequired,
        setDueling           : React.PropTypes.func.isRequired,
        setStateFromChildren : React.PropTypes.func.isRequired,
        setcoolDownSaveData  : React.PropTypes.func.isRequired,
        showMenu             : React.PropTypes.string.isRequired,
        showMsg              : React.PropTypes.func.isRequired,
        skill                : React.PropTypes.object.isRequired,
        time                 : React.PropTypes.object.isRequired,
        tradeSaveData        : React.PropTypes.array.isRequired,
        useItem              : React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        useTime              : React.PropTypes.func.isRequired,
        upload               : React.PropTypes.func.isRequired,
        download             : React.PropTypes.func.isRequired,
        saveLocal            : React.PropTypes.func.isRequired,
        loadLocal            : React.PropTypes.func.isRequired,
        deleteLocal          : React.PropTypes.func.isRequired,
        getLocalSaves        : React.PropTypes.func.isRequired,
        settings             : React.PropTypes.object.isRequired,
        setVolume            : React.PropTypes.func.isRequired,
        callWindow           : React.PropTypes.func.isRequired,
        campSaveData         : React.PropTypes.object.isRequired,
        robberSaveData       : React.PropTypes.object.isRequired,
        handleItemClick      : React.PropTypes.func.isRequired,
        getEnveronmentTemperature: React.PropTypes.func.isRequired,
        currentBox           : React.PropTypes.string.isRequired,
        sort                 : React.PropTypes.func.isRequired,
        getMaxState          : React.PropTypes.func.isRequired,
        reBorn               : React.PropTypes.func.isRequired,
        generation           : React.PropTypes.number.isRequired,
    },
    getChildContext: function() {
        return {
            generation          : this.state.generation,
            reBorn              : this.reBorn,
            maouLevel           : this.state.maouLevel,
            sort                : this.sort,
            currentBox          : this.state.currentBox,
            parentState         : this.state,
            AudioEngine         : this.AudioEngine,
            boxSaveData         : this.state.boxSaveData,
            buildingSaveData    : this.state.buildingSaveData,
            cancelEquip         : this.cancelEquip,
            unequipSlot         : this.unequipSlot,
            discardItem         : this.discardItem,
            changeItem          : this.changeItem,
            changeMsg           : this.changeMsg,
            checkFull           : this.checkFull,
            checkHaveResource   : this.checkHaveResource,
            checkHaveResourceAll: this.checkHaveResourceAll,
            currentEquip        : this.state.currentEquip,
            currentScene        : this.state.currentScene,
            defaultWeapon       : this.state.defaultWeapon,
            detailedItem        : this.state.detailedItem,
            detailedList        : this.state.detailedList,
            detailedType        : this.state.detailedType,
            dungeonSaveData     : this.state.dungeonSaveData,
            durableSaveData     : this.state.durableSaveData,
            eventSaveData       : this.state.eventSaveData,
            getBuildingLevel    : this.getBuildingLevel,
            getMaxDurable       : this.getMaxDurable,
            getMaxTimeOfRequire : this.getMaxTimeOfRequire,
            getMstCircle        : this.getMstCircle,
            getScienceLevel     : this.getScienceLevel,
            getTempDesc         : this.getTempDesc,
            getTheMaxTimeToUse  : this.getTheMaxTimeToUse,
            getValue            : this.getValue,
            getcoolDownSaveData : this.getcoolDownSaveData,
            getTimeNeed         : this.getTimeNeed,
            handleDeath         : this.handleDeath,
            handleExchange      : this.handleExchange,
            isDueling           : this.state.isDueling,
            menuDesc            : this.state.menuDesc,
            menuHint            : this.state.menuHint,
            msgList             : this.state.msgList,
            mstState            : this.state.mstState,
            mstStateChange      : this.mstStateChange,
            placeSaveData       : this.state.placeSaveData,
            playerState         : this.state.playerState,
            playerStateChange   : this.playerStateChange,
            playerStateUse      : this.playerStateUse,
            season              : this.state.season,
            startSeason         : this.state.startSeason,
            setCurrentBox       : this.setCurrentBox,
            setCurrentScene     : this.setCurrentScene,
            setDueling          : this.setDueling,
            setStateFromChildren: this.setStateFromChildren,
            setcoolDownSaveData : this.setcoolDownSaveData,
            showMenu            : this.state.showMenu,
            showMsg             : this.showMsg,
            skill               : this.state.skill,
            time                : this.state.time,
            tradeSaveData       : this.state.tradeSaveData,
            useItem             : this.useItem,
            useItemThatPlayerHave: this.useItemThatPlayerHave,
            useTime             : this.useTime,
            upload              : this.upload,
            download            : this.download,
            saveLocal           : this.saveLocal,
            loadLocal           : this.loadLocal,
            deleteLocal         : this.deleteLocal,
            getLocalSaves       : this.getLocalSaves,
            settings            : this.state.settings,
            setVolume           : this.setVolume,
            callWindow          : this.callWindow,
            campSaveData        : this.state.campSaveData,
            handleItemClick     : this.handleItemClick,
            getEnveronmentTemperature:this.getEnveronmentTemperature,
            robberSaveData      : this.state.robberSaveData,
            getMaxState         : this.getMaxState,
        };
    },
    // 转生：保留天赋技能并重置世界，进入下一代（generation+1）
    reBorn:function(skill){
        var skillNow = clone(this.state.skill);
        for(var attr in skillNow){
            // if(!SKILL_DATA[attr].isTalent)delete skillNow[attr];
            if(!SKILL_DATA[attr].isTalent)skillNow[attr] = (Math.round(skillNow[attr]/10));
            if(skillNow[attr] == 0){
                delete skillNow[attr];
            }
        }
        skillNow[skill] = (skillNow[skill]||0) + 1;
        var generation = this.state.generation + 1;
        var state = this.getInitialState();
        state.skill = skillNow;
        state.generation = generation;
        this.setState(state);
        setTimeout(function(){
            for(var attr in this.state.playerState){
                if(attr == 'temp')continue;
                this.playerStateChange(o(attr,1000000));
            }
        }.bind(this),0);
    },
    // 计算某状态(生命/满腹/水分/体力/精神)的当前上限（含技能加成）
    getMaxState:function(type){
        var skill = this.state.skill;
        var buff = 0;
        switch(type){
            case 'ps':
            case 'san':
                buff += skill.durable?SKILL_DATA.durable.buff * skill.durable:0;
                break;
            case 'hp':
            case 'full':
            case 'moist':
                buff += skill.physique?SKILL_DATA.physique.buff * skill.physique:0;
                break;
            default:
                break;
        }
        var base = MAX_STATE;
        return Math.round(base * (1 + buff));
    },
    sort:function(box){
        var boxSaveData = (this.state.boxSaveData);
        var result = {};
        var source = clone(boxSaveData[box].things);
        var typeList = {};
        do{
            var flag = false;
            for(var attr in source){
                var temp = ITEM_DATA[attr];
                if(temp.type && typeList[temp.type] == undefined){
                    typeList[temp.type] = true;
                    flag = true;
                }
            }
        }while(flag == true)

        for(var type in typeList){
            for(var attr in source){
                var temp = ITEM_DATA[attr];
                if(temp.type == type){
                    result[attr] = source[attr];
                }
            }
        }
        boxSaveData[box].things = result;
        this.setState({boxSaveData:boxSaveData});
    },
    // 处理物品点击：食用/饮用、回城卷轴、武器充能、装备穿戴、能力提升道具等
    handleItemClick:function(item,box){
        //食物、药剂效果
        if(ITEM_DATA[item].effect){
            this.playerStateChange(ITEM_DATA[item].effect);
            this.useItem(o(item,1),box);
            //play effect
            var type = ITEM_DATA[item].type;
            switch(type){
                case 'food':
                case 'cooked':
                if(ITEM_DATA[item].isDrink){
                    this.AudioEngine.playEffect('drink');
                    break;
                }
                this.AudioEngine.playEffect('eat');
                break;
                case 'poizon':
                this.AudioEngine.playEffect('drink');
                break;
            }
        }

        //回城卷轴
        if(item == 'scroll'){
            if(getLength(this.state.mstState) != 0){
                this.showMsg(<p key = {Math.random()} >你不能在战斗中进行传送！</p>)
            }else{
                this.useItem({scroll:1},box);
                this.useTime(function(){
                    var dungeonSaveData = this.state.dungeonSaveData;
                    dungeonSaveData.stairCount = 1;
                    dungeonSaveData.roomCount = 1;
                    this.setState({currentScene:'home',dungeonSaveData:dungeonSaveData,wind:null});
                }.bind(this),0.3);
                this.AudioEngine.playEffect(item.sound || 'pick');
            }
        }
        //能量球
        var durableRec = ITEM_DATA[item].durableRec;
        if(durableRec){
            var durableSaveData = this.state.durableSaveData;
            this.useItem(o(item,1),box);
            this.useTime(function(){
                for(var attr in durableSaveData){
                    var wt = ITEM_DATA[attr].weaponType;
                    if(wt == durableRec || (durableRec == 'unmagic' && (wt == 'melee'||wt == 'shoot'))){
                        if(Array.isArray(durableSaveData[attr])){
                            for(var ci2 = 0;ci2 < durableSaveData[attr].length;ci2++)durableSaveData[attr][ci2] = 0;
                        }else{
                            durableSaveData[attr] = 0;
                        }
                    }
                }
                this.setState({durableSaveData:durableSaveData});
            }.bind(this),0.3);
            this.AudioEngine.playEffect(item.sound || 'pick');
        }
        if(box == 'bag' && (ITEM_DATA[item].equipType || ITEM_DATA[item].type == 'weapon')){
            if(getLength(this.state.mstState) != 0){
                this.showMsg(<p key = {Math.random()} >你不能在战斗中更改装备！</p>)
            }else{
                this.equipItem(item);
            }
        }
        //能力提升物品
        if(ITEM_DATA[item].type == 'special'){
            var play = ITEM_DATA[item].isDrink?'drink':'scroll';
            this.AudioEngine.playEffect(play);
            this.setState({menuHint:this.state.menuHint+1});
            var upgrade = ITEM_DATA[item].upgrade;
            var skill = this.state.skill;
            if(skill[upgrade]){
                skill[upgrade] ++;
            }else{
                skill[upgrade] = 1;
            }
            this.setState({skill:skill});
            this.useItem(o(item,1),box);
        }
    },
    getTimeNeed:function(placeName){
        //获得装备的速度加成
        var buff = 1;
        var currentEquip = this.state.currentEquip;
        for(var attr in currentEquip){
            var equip = currentEquip[attr];
            if(!equip)continue;
            if(ITEM_DATA[equip].moveFaster)buff *= ITEM_DATA[equip].moveFaster;
        }
        var timeNeed = PLACE_DATA[placeName].timeNeed * buff;
        return timeNeed;
    },
    callWindow:function(wind){
        this.setState({wind:wind});
    },
    AudioEngine:{
        on:true,
        playEffect:function(name){
            if(!this.on)return;
            var tar = document.getElementById('effect_'+name);
            tar.play();
            if(tar.currentTime>0.01)tar.currentTime = 0;
        },
        clearBg:function(name){
            var list = document.getElementsByTagName('audio');
            for (var i = list.length - 1; i >= 0; i--) {
                if(list[i].id.lastIndexOf('bg')==-1 || list[i].id == 'bg_'+name)continue;
                list[i].pause();
            };
        },
        playBg:function(name){
            if(!this.on)return;
            this.clearBg(name);
            var tar = document.getElementById('bg_'+name);
            if(!tar)return false;
            tar.play();
        },
        stopBg:function(name){
            var tar = document.getElementById('bg_'+name);
            if(!tar)return false;
            tar.pause();
        },
    },
    showMsg:function(msg){
        var msgList = this.state.msgList;
        msgList.push(msg);
        this.setState({msgList:msgList});
        setTimeout((function(){
            var msgList = this.state.msgList;
            if(msgList.length==0)return;
            msgList.splice(0,1);
            this.setState({msgList:msgList});
        }).bind(this),MSG_TIME)
    },
    getValue:function(give){
        if(ITEM_DATA[give].value)return ITEM_DATA[give].value;
        var value = 0;
        if(ITEM_DATA[give].effect){
            for(var attr in ITEM_DATA[give].effect){
                var mul = 1;
                if(attr == 'ps')mul *= 0.5;
                value += mul * (((ITEM_DATA[give].effect[attr] > 0) && (attr != 'temp'))?ITEM_DATA[give].effect[attr]:0);
            }
        }else{
            var done = false;
            function check(data){
                if(data[give]){
                    var require = data[give].require;
                    for(var attr in require){
                        value += this.getValue(attr) * require[attr];
                        done = true;
                    }
                    return true;
                }
                return false;
            }
            if(!check.bind(this,MAKE_DATA)()){
                if(!check.bind(this,ALCHEMY_DATA)()){
                    if(!check.bind(this,MAGIC_DATA)()){
                    }
                }
            }
        }
        return value;
    },
    setDueling:function(value){
        this.setState({isDueling:value});
    },
    getScienceLevel:function(type){
        var buildingSaveData = this.state.buildingSaveData;
        var boxSaveData = this.state.boxSaveData;
        var count = 0;
        for (var attr in boxSaveData['scienceTable'].things){
            if(ITEM_DATA[attr].type == type){
                count ++;
            }
        }
        return count;
    },
    getBuildingLevel:function(update){
        var updateBox = this.state.boxSaveData[update].things;
        var count = 0;
        for(var attr in updateBox){
            count ++;
        }
        return count;
    },
    setCurrentBox:function(value){
        this.setState({currentBox:value})
    },
    setCurrentScene:function(value){
        this.setState({currentScene:value})
    },
    getcoolDownSaveData:function(attr){
        var coolDownSaveData = this.state.coolDownSaveData;
        return coolDownSaveData[attr];
    },
    setcoolDownSaveData:function(attr,value){
        var coolDownSaveData = this.state.coolDownSaveData;
        coolDownSaveData[attr] = value;
        this.setState({
            coolDownSaveData:coolDownSaveData
        })
    },
    mstStateChange:function(list,isNegative){
        var o = this.state.mstState;
        for (var attr in list){
            var stateName = attr,amount = list[attr];
            if(o[stateName]==undefined)continue;
            o[stateName] += isNegative? -amount:amount;
        }
        this.setState({mstState:o});
    },
    getMstCircle:function(amount,balancedAmount,speed){
        var still = 0.1;//最少增长量
        var c = speed || 1;//曲线陡峭系数
        if(amount>balancedAmount)return 0;
        if(amount>balancedAmount*0.5)return c*(balancedAmount - amount)/balancedAmount;
        return still + c*amount/balancedAmount;
    },
    setStateFromChildren:function(obj,isAdding){
        if(isAdding){
            for(var attr in obj){
                obj[attr] += this.state[attr];
            }
        }
        this.setState(obj);
    },
    getMaxTimeOfRequire:function(require){
        //仅用于家内物品最大制造个数的判断
        var req = {};
        for(var attr in require){
            req[attr]= require[attr];
        }
        for(var i = 0;;i++){
            if(!this.checkHaveResourceAll(req,true))break;
            for(var attr in require){
                req[attr] += require[attr];
            }
        }
        return i;
    },
    useItemThatPlayerHave:function(require){
        // 从背包/大箱子/装备栏扣除材料（兼容实例化武器/工具按 baseId 扣除）
        for(var attr in require){
            var need = require[attr];
            need = this.consumeFromBox('bag',attr,need);
            if(need > 0)need = this.consumeFromBox('bigBox',attr,need);
            if(need > 0)need = this.consumeFromEquip(attr,need);
        }
    },
    // 从装备栏扣除某基础物品（已装备的工具被配方消耗时的兜底）
    consumeFromEquip:function(baseId,amount){
        var currentEquip = this.state.currentEquip;
        var durableSaveData = this.state.durableSaveData;
        var itemInstances = this.state.itemInstances;
        for(var slot in currentEquip){
            if(amount <= 0)break;
            var it = currentEquip[slot];
            if(it && itemBaseId(it) == baseId){
                currentEquip[slot] = null;
                if(it.indexOf('#') >= 0){
                    delete durableSaveData[it];
                    delete itemInstances[it];
                    delete ITEM_DATA[it];
                }
                amount--;
            }
        }
        this.setState({currentEquip:currentEquip,durableSaveData:durableSaveData,itemInstances:itemInstances});
        return amount;
    },
    // 从指定容器扣除某基础物品 amount 个：优先扣未实例化堆叠，再扣实例
    consumeFromBox:function(box,baseId,amount){
        var boxSaveData = this.state.boxSaveData;
        var tar = boxSaveData[box].things;
        var durableSaveData = this.state.durableSaveData;
        var itemInstances = this.state.itemInstances;
        if(tar[baseId]){
            var take = Math.min(amount,tar[baseId]);
            tar[baseId] -= take;
            amount -= take;
            if(tar[baseId] <= 0)delete tar[baseId];
            // stackable 耐久物品：同步移除对应份数的耐久记录
            if(ITEM_DATA[baseId] && ITEM_DATA[baseId].stackable && Array.isArray(durableSaveData[baseId])){
                durableSaveData[baseId].splice(0,take);
                if(durableSaveData[baseId].length === 0)delete durableSaveData[baseId];
            }
        }
        for(var k in tar){
            if(amount <= 0)break;
            if(k.indexOf('#') >= 0 && itemBaseId(k) == baseId){
                delete tar[k];
                delete durableSaveData[k];
                delete ITEM_DATA[k];
                delete itemInstances[k];
                amount--;
            }
        }
        this.setState({boxSaveData:boxSaveData,durableSaveData:durableSaveData,itemInstances:itemInstances});
        return amount;
    },
    getItemThatPlayerHave:function(){
        //可以使用大箱子里的资源
    },

    checkFull:function(box,itemName){
        if(typeof box == 'string'){
            box = this.state.boxSaveData[box];
        }
        return (box.size <= getLength(box.things) && !box.things[itemName]);
    },
    getTheMaxTimeToUse:function(){
        //这个检查函数是为了防止出现使用时间导致饥饿和水分不足而死亡的情况。。
        var fullTime = Math.floor(this.state.playerState.full.amount/FULL_DESC_PER_HOUR - 0.0001);
        var moistTime =  Math.floor(this.state.playerState.moist.amount/MOIST_DESC_PER_HOUR - 0.0001);
        return moistTime > fullTime?fullTime:moistTime;
    },
    // 从背包装备物品：移入装备栏（不再占用背包格子）
    // 武器有 2 个槽位(weapon1/weapon2)，其余按 equipType(head/body/foot/neck/hand)
    equipItem:function(item){
        var data = ITEM_DATA[item];
        if(!data)return;
        if(!this.state.boxSaveData.bag.things[item])return;
        var currentEquip = clone(this.state.currentEquip);
        var slot;
        if(data.type == 'weapon'){
            // 优先放入空武器槽，都满则替换 武器1
            if(!currentEquip.weapon1)slot = 'weapon1';
            else if(!currentEquip.weapon2)slot = 'weapon2';
            else slot = 'weapon1';
        }else if(data.equipType){
            slot = data.equipType;
            if(currentEquip[slot] === undefined)currentEquip[slot] = null;
        }else{
            return;
        }
        var old = currentEquip[slot];
        currentEquip[slot] = item;
        this.useItem(o(item,1),'bag');
        if(old)this.changeItem(o(old,1),'bag');
        this.setState({currentEquip:currentEquip});
        this.AudioEngine.playEffect('wear');
    },
    // 卸下装备栏某槽的物品，放回背包
    unequipSlot:function(slot){
        var currentEquip = clone(this.state.currentEquip);
        var item = currentEquip[slot];
        if(!item)return;
        if(this.checkFull(this.state.boxSaveData.bag,item)){
            this.showMsg(<p key = {Math.random()} >背包已满，无法卸下！</p>);
            return;
        }
        currentEquip[slot] = null;
        this.changeItem(o(item,1),'bag');
        this.setState({currentEquip:currentEquip});
        this.AudioEngine.playEffect('pick');
    },
    cancelEquip:function(itemName){
        //卸下装备（在任意槽位中查找并放回背包）
        var currentEquip = this.state.currentEquip;
        for(var slot in currentEquip){
            if(currentEquip[slot] == itemName){
                this.unequipSlot(slot);
                return;
            }
        }
    },
    // 在背包与当前打开的容器之间转移物品（Ctrl/Shift 可批量）
    handleExchange:function(itemName,box,onlyOne){
        var fromBox = box,toBox;
        if(box == 'bag'){
            if(this.state.currentBox == '')return;
            toBox = this.state.currentBox;
        }else{
            toBox = 'bag';
        }
        if(this.checkFull(this.state.boxSaveData[toBox],itemName))return 'box is full!';

        var amount = this.state.boxSaveData[fromBox].things[itemName];

        if(CTRL_PRESSED || SHIFT_PRESSED){
            var max_num = SHIFT_PRESSED?100:10;
            if(amount > max_num){
                amount = max_num;
            }
        }else{
            if(onlyOne){
                amount = 1;
            }
        }
        var o = {};
        o[itemName] = -Math.ceil(amount);
        this.changeItem(o,fromBox);
        o[itemName] = Math.ceil(amount);
        this.changeItem(o,toBox);
        this.cancelEquip(itemName);
        this.AudioEngine.playEffect('exchange');

        if(this.state.settings.sort)this.sort('bag');
    },
    // 创建耐久类物品的一个实例（独立耐久、不堆叠），并注册动态 ITEM_DATA 条目
    createInstance:function(baseId,durableSaveData,itemInstances){
        var key;
        do{ key = baseId + '#' + (this.instanceSeq++); }while(ITEM_DATA[key]);
        var data = ITEM_DATA[baseId];
        var copy = {};
        for(var k in data)copy[k] = data[k];
        copy.baseId = baseId;
        copy.isInstance = true;
        copy.instanceId = key;
        ITEM_DATA[key] = copy;
        durableSaveData[key] = 0;
        itemInstances[key] = baseId;
        return key;
    },
    // 增减指定容器中的物品数量（数量<=0 时删除该条目）
    // 耐久类武器/工具按“实例”处理：各自独立耐久、不堆叠
    changeItem:function(items,box,isNegative){
        var boxSaveData = this.state.boxSaveData;
        var tar = boxSaveData[box].things;
        var durableSaveData = this.state.durableSaveData;
        var itemInstances = this.state.itemInstances;
        var self = this;
        function addInstances(baseId,n){
            for(var i = 0;i < n;i++){
                tar[self.createInstance(baseId,durableSaveData,itemInstances)] = 1;
            }
        }
        function removeInstances(baseId,n){
            // 优先移除实例（耐久损耗最多的先坏），不足再扣未实例化堆叠
            var keys = [];
            for(var k in tar){
                if(k.indexOf('#') >= 0 && itemBaseId(k) == baseId)keys.push(k);
            }
            keys.sort(function(a,b){ return (durableSaveData[b]||0) - (durableSaveData[a]||0); });
            for(var i = 0;i < keys.length && n > 0;i++){
                var k = keys[i];
                delete tar[k];
                delete durableSaveData[k];
                delete ITEM_DATA[k];
                delete itemInstances[k];
                n--;
            }
            if(n > 0 && tar[baseId]){
                var take = Math.min(n,tar[baseId]);
                tar[baseId] -= take; n -= take;
                if(tar[baseId] <= 0)delete tar[baseId];
            }
        }
        // stackable 耐久物品：只占一个格子（堆叠数量），耐久按每份存入数组
        function addStackable(baseId,n){
            var oldCount = tar[baseId] || 0;
            tar[baseId] = oldCount + n;
            var arr = Array.isArray(durableSaveData[baseId]) ? durableSaveData[baseId] : [];
            while(arr.length < oldCount)arr.push(0);
            for(var i = 0;i < n;i++)arr.push(0);
            durableSaveData[baseId] = arr;
        }
        function removeStackable(baseId,n){
            var oldCount = tar[baseId] || 0;
            var take = Math.min(n,oldCount);
            tar[baseId] = oldCount - take;
            var arr = Array.isArray(durableSaveData[baseId]) ? durableSaveData[baseId] : [];
            arr.splice(0,take);
            if(tar[baseId] <= 0)delete tar[baseId];
            if(arr.length === 0)delete durableSaveData[baseId];
            else durableSaveData[baseId] = arr;
        }
        for (var attr in items) {
            var value = isNegative ? -items[attr] : items[attr];
            var data = ITEM_DATA[itemBaseId(attr)];
            if(data && data.durable && attr.indexOf('#') < 0){
                if(data.stackable){
                    if(value > 0)addStackable(attr,value);
                    else if(value < 0)removeStackable(attr,-value);
                }else{
                    if(value > 0)addInstances(attr,value);
                    else if(value < 0)removeInstances(attr,-value);
                }
            }else{
                if(tar[attr]){
                    tar[attr] += value;
                }else{
                    tar[attr] = value;
                }
                if(tar[attr] <= 0 || isNaN(tar[attr]))delete tar[attr];
            }
        };
        this.setState({boxSaveData:boxSaveData,durableSaveData:durableSaveData,itemInstances:itemInstances});
    },
    useItem:function(items,box){
        var box = box || 'bag';
        var o = {};
        for (var attr in items) {
            o[attr] = -items[attr];
        }
        this.changeItem(o,box);
    },
    // 丢弃物品（用于详情面板“丢弃”按钮）：耐久实例一并清理注册
    discardItem:function(item,box,amount){
        amount = amount || 1;
        this.useItem(o(item,amount),box);
        if(item.indexOf('#') >= 0){
            var durableSaveData = this.state.durableSaveData;
            var itemInstances = this.state.itemInstances;
            delete durableSaveData[item];
            delete itemInstances[item];
            delete ITEM_DATA[item];
            this.setState({durableSaveData:durableSaveData,itemInstances:itemInstances});
        }
    },
    clickUse:function(item,box){
        var type = ITEM_DATA[item].type;
        switch(type){
            case 'food':
            case 'cooked':
            case 'poizon':
            var effect = type.effect;
        }
    },
    // 依据季节与天数用正弦曲线计算环境温度
    getEnveronmentTemperature:function(day){
        var season = this.getSeason(day);
        var seasonMap = {
            'spring':0,
            'summer':1,
            'autumn':2,
            'winter':3,
        };
        var base = seasonMap[this.state.startSeason]* SEASON_CIRCLE - SEASON_CIRCLE/2 ;
        var temperature = (Math.sin(Math.PI*(day+base)/(2*SEASON_CIRCLE)));
        temperature = 50 * (temperature > 0?1:-1) * Math.pow(temperature,4);

        return temperature;
    },
    // 按当前天数推算所属季节（每 SEASON_CIRCLE 天一季，四季循环）
    getSeason:function(day){
        var startSeason = this.state.startSeason;
        var seasonNumber = Math.floor(day / SEASON_CIRCLE)%4;
        var seasonMap = {
            0:'spring',
            1:'summer',
            2:'autumn',
            3:'winter',
        };
        for (var i in seasonMap) {
            if (seasonMap[i] == startSeason){
                var offset = i;
            }
        };
        var index = (parseInt(offset) + seasonNumber)%4;
        return seasonMap[index];
    },
    // 跨日结算：资源/怪物刷新、沼气池、水井、陷阱、商队、地牢衰减、盗贼来袭、季节更新
    handleDayOver:function(day){
        var skill = this.state.skill
        //经营手腕等级
        var manageLevel = (skill.manage || 0) * SKILL_DATA.manage.buff;

        var placeSaveData = this.state.placeSaveData;
        var boxSaveData = this.state.boxSaveData;
        var buildingSaveData = this.state.buildingSaveData;
        var season = this.state.season;
        function setInc(tar,speed) {
            tar.count += speed;
            var incAmount = Math.floor(tar.count);
            tar.amount += incAmount;
            tar.count -= incAmount;
        }

        for(var place in placeSaveData){
            //set new creature
            for(var mstAttr in placeSaveData[place].mst){
                var mst = placeSaveData[place].mst[mstAttr];
                var speed = this.getMstCircle(mst.amount, PLACE_DATA[place].mst[mstAttr].balancedAmount);
                setInc(mst,speed);
            }
            //set resources
            for(var resourceAttr in placeSaveData[place].resource){
                var resource = placeSaveData[place].resource[resourceAttr];
                var spd = PLACE_DATA[place].resource[resourceAttr].circle;
                var speed = this.getMstCircle(resource.amount, PLACE_DATA[place].resource[resourceAttr].initAmount,spd);
                if(season == 'spring')speed *= 5;
                if(season == 'autumn')speed *= 0.5;
                if(season == 'winter')speed *= 0;

                setInc(resource,speed);
            }
        }
        this.setState({placeSaveData:placeSaveData});

        //set marshGasTank
        for(var attr in boxSaveData.marshGasTank.things){
            boxSaveData.marshGasTank.things[attr] -= 1;
            if(!boxSaveData.marshGasTank.things[attr])delete boxSaveData.marshGasTank.things[attr];
            boxSaveData.marshGasTank.things.fertilizer = (boxSaveData.marshGasTank.things.fertilizer || 0) + 1 + manageLevel;
        }

        //set well
        var haveWell = this.state.buildingSaveData.well.own;
        if(haveWell){
            var level = this.getBuildingLevel('wellUpdate');
            var o = {water:level+3};
            o = cloneMul(o,manageLevel + 1);
            this.changeItem(o,'well');
        }
        //set trap
        var haveTrap = this.state.buildingSaveData.trap.own;
        if(haveTrap){
            var list = this.state.buildingSaveData.trap.list;
            for(var i = 0;i < list.length;i++ ){

                var tmp = list[i];
                if(tmp.succeed)continue;
                var data = TRAP_DATA[tmp.type];
                var chance = data.chance;
                var level = this.getScienceLevel('trapChance');
                chance *= 1 + 0.5 * level;
                if(Math.random() < chance){
                    tmp.itemGet = getRandom(data.itemGet).attr;
                    tmp.itemAmount = data.itemGet[tmp.itemGet];
                    tmp.succeed = true;

                    //提示
                    buildingSaveData['trap'].hint = true;
                }
            }
        }

        //set trade
        var step = boxSaveData.scienceTable.things['beacon']?1:2;
        var timeMul = boxSaveData.scienceTable.things['beacon_2']?2:1;
        if(day%step == 0){
            var tradeSaveData = this.state.tradeSaveData;
            for(var i = 0; i < timeMul; i++){
                do{
                    var trade = getRandom(TRADE_DATA,{noAttr:'type'}).attr;
                }while((TRADE_DATA[trade].season && TRADE_DATA[trade].season != season) || (TRADE_DATA[trade].day && this.state.time.day < TRADE_DATA[trade].day));
                var time = TRADE_DATA[trade].time;
                tradeSaveData.push({trade:trade,time:time})
            }
            this.setState({tradeSaveData:tradeSaveData});
        }
        //set season
        this.setState({season:this.getSeason(day)});
        this.setState({buildingSaveData:buildingSaveData});

        //set dungeon
        var dungeonSaveData = this.state.dungeonSaveData;
        var stairCount = 1;
        for(var attr in dungeonSaveData.stairData){
            if(parseInt(stairCount)< parseInt(attr))stairCount = attr;
        }
        while(stairCount > 0){
            dungeonSaveData.stairData[stairCount] = (dungeonSaveData.stairData[stairCount] || 0) - DUNGEON_DEC;
            if(dungeonSaveData.stairData[stairCount] < 0)dungeonSaveData.stairData[stairCount] = 0;
            stairCount --;
        }
        this.setState({dungeonSaveData:dungeonSaveData});

        //set robber
        var robberSaveData = this.state.robberSaveData;
        var level = this.getScienceLevel('lockUpdate');
        var securityBox = this.getScienceLevel('securityBox');
        var stoledPersont = STOLE * Math.pow(0.9,securityBox);

        var deadLine = ROBBER_DAY + (MODE == 'DEBUG'?0:level) + Math.random()*3 - Math.random()*3;
        if(day - robberSaveData.lastDate > deadLine){
            robberSaveData.lastDate = day;
            //防盗
            var  buildingSaveData = this.state.buildingSaveData;
            var trapList = buildingSaveData.trap.list;
            var flag = false;
            if(this.state.currentScene != 'home'){
                for(var i = 0; i < trapList.length;i++){
                    if(trapList[i].succeed)continue;
                    if(trapList[i].type == 'antiRogue'){
                        trapList[i].succeed = true;
                        var get = getRandom(TRAP_DATA.antiRogue.itemGet).attr;
                        trapList[i].itemGet = get;
                        trapList[i].itemAmount = TRAP_DATA.antiRogue.itemGet[get];
                        buildingSaveData['trap'].hint = true;
                        flag = true;
                        break;
                    }
                }
                if(flag == false){
                    var get = {};
                    addTo(get,stole.bind(this,'bigBox')());
                    addTo(get,stole.bind(this,'cooker')());
                    addTo(get,stole.bind(this,'well')());
                    addTo(get,stole.bind(this,'marshGasTank')());
                    addTo(robberSaveData.stoled,get);
                    if(robberSaveData.stoledAll == undefined){
                        robberSaveData.stoledAll = {};
                    }
                    addTo(robberSaveData.stoledAll,get);
                }
            }
        }
        this.setState({robberSaveData:robberSaveData});

        function stole(box){
            var get = {};
            var length = getLength(boxSaveData[box].things);
            length = Math.ceil(length * STOLE_CHANCE);
            var stoleList = {};
            while(length > 0){
                do{
                    var random = getRandom(boxSaveData[box].things).attr;
                }
                while(stoleList[attr]);
                stoleList[attr] = boxSaveData[box].things[attr];
                length --;
            }
            for(var attr in boxSaveData[box].things){
                if(
                    (ITEM_DATA[attr].type == 'food') || (ITEM_DATA[attr].type == 'cooked') || (ITEM_DATA[attr].type == 'met') 
                    ){
                    var amount = boxSaveData[box].things[attr];

                    var stoleAmount = Math.round(stoledPersont * Math.sqrt(amount) * (0.5 + Math.random()));

                    var o = {};
                    o[attr] = stoleAmount;
                    if(stoleAmount){
                        addTo(get,o);
                    }
                }
            }
            this.changeItem(get,box,true);
            return get;
        }
    },
    //TimeManager
    isInNight:function(time){
        return (time < NIGHT_END || time > NIGHT_BEGIN);
    },
    getTimeInNight:function(from,to) {
        var timeInNight = 0;
        var i = from;
        while (1) {
            if(this.isInNight(i%24))timeInNight += 0.1;
            if(i > to)break;
            i+=0.1;
        };
        return timeInNight;
    },
    // 死亡处理：显示死因，并提供读档 / 重新开始
    handleDeath:function(type){
        var reason = '';
        switch(type){
            case'frozen':
            reason = '寒冷';
            break;
            case'hunger':
            reason = '饥荒';
            break;
            case'thirsty':
            reason = '脱水';
            break;
            case'health':
            reason = '失血过多';
            break;
        }
        var desc = (
                <div style = {{margin:100}}>
                    <p>你死了！</p>
                    <p>死因：{reason}</p>
                    <BtnComponent handleClick = {this.download.bind(null)}>读档</BtnComponent>
                    <BtnComponent handleClick = {this.init}>重新开始</BtnComponent>
                </div>
            )
        this.setState({
            menuDesc:desc,
            showMenu:'custom',
        });
    },
    // 检查六维状态是否归零并触发相应死亡（RELEASE 模式才生效）
    checkDeath:function(){
        if(MODE == 'DEBUG')return;
        var playerState = (this.state.playerState);
        if(playerState.hp.amount <= 0){
            if(playerState.ps.amount == 0 && (this.getTempDesc() == 'cold' ||  this.getTempDesc() == 'veryCold')){
                this.handleDeath('frozen');
            }
            this.handleDeath('health');
        }
        if(playerState.full.amount <= 0){
            this.handleDeath('hunger');
        }
        if(playerState.moist.amount <= 0){
            this.handleDeath('thirsty');
        }
    },
    // 推进游戏时间：处理昼夜、体温变化、饥饿/口渴、精神、冷却、生产、死亡判定等
    addTime:function(timeNeed,props){

        var skill = this.state.skill;
        var manageLevel = (skill.manage || 0) * SKILL_DATA.manage.buff;

        var season = this.state.season;
        var currentEquip = this.state.currentEquip;

        var now = this.state.time.hour;
        var to = now + timeNeed;
        var timeInNight = this.getTimeInNight(now,to);
        now += timeNeed;
        var day = this.state.time.day;
        while(now >= 24){
            now = now - 24;
            this.handleDayOver(day);
            day += 1;
        }
        var playerState = clone(this.state.playerState);

        //装备
        var tempDownBuff = [];
        var tempUpBuff = [];
        var tempBuff = 0;
        for(var attr in currentEquip){
            if(currentEquip[attr]){
                //体温变化修正
                tempBuff += ITEM_DATA[currentEquip[attr]].tempBuff || 0;
                if(ITEM_DATA[currentEquip[attr]].tempDownMul)tempDownBuff.push(ITEM_DATA[currentEquip[attr]].tempDownMul);
                if(ITEM_DATA[currentEquip[attr]].tempUpMul)tempUpBuff.push(ITEM_DATA[currentEquip[attr]].tempUpMul);

                //恢复累物品
                var rec = currentEquip[attr] && ITEM_DATA[currentEquip[attr]].rec;
                if(rec){
                    for(var attr in rec){
                        playerState[attr].amount += timeNeed * rec[attr];
                        var max = this.getMaxState(attr);
                        if(playerState[attr].amount > max)playerState[attr].amount = max;
                    }
                }

            }
        }

        //set temperature
        var tempMul = 2;
        var temp = (props && props.temp)||this.getEnveronmentTemperature(day);

        temp += tempBuff;
        if(PLACE_DATA[this.state.currentScene] && PLACE_DATA[this.state.currentScene].temp)temp += PLACE_DATA[this.state.currentScene].temp;
        var playerTemp = this.state.playerState['temp'].amount;
        var tempChange = (temp > playerTemp)?timeNeed:-timeNeed;
        tempChange = tempChange * tempMul;


        var oldPlayerTemp = playerTemp;

        //建筑影响
        // if(this.state.currentScene == 'home' && this.state.buildingSaveData.)

        if(tempChange<0){
            for (var i = tempDownBuff.length - 1; i >= 0; i--) {
                tempChange *= tempDownBuff[i];
            };
        }
        if(tempChange>0){
            for (var i = tempUpBuff.length - 1; i >= 0; i--) {
                tempChange *= tempUpBuff[i];
            };
        }


        playerState.temp.amount += tempChange/2;

        //防止矫枉过正
        if((tempChange > 0) == (playerState.temp.amount > temp))playerState.temp.amount = temp;

        //set temp influences
        if(playerState.temp.amount < -20){
            playerState.ps.amount -= Math.ceil(timeNeed * (-20 - playerState.temp.amount) /10);
        }
        if(playerState.ps.amount < 0){
            playerState.hp.amount += playerState.ps.amount;
            playerState.ps.amount = 0;
        }
        if(playerState.temp.amount > 20){
            playerState.moist.amount -= Math.ceil(timeNeed * (playerState.temp.amount - 20) /10);
        }

        playerState.temp.amount += tempChange/2;

        //防止矫枉过正
        if((tempChange > 0) == (playerState.temp.amount > temp))playerState.temp.amount = temp;

        //set full and moist
        playerState.full.amount -= FULL_DESC_PER_HOUR * timeNeed;
        playerState.moist.amount -= MOIST_DESC_PER_HOUR * timeNeed;
        //set san dec
        if(this.state.currentScene != 'home'){
            playerState.san.amount -= SAN_DESC_PER_HOUR * timeInNight;
        }
        var stateCurrentSum = 0;
        var stateSum = 0;
        for(var attr in playerState){
            var max = this.getMaxState(attr);
            if(attr == 'temp'){
                stateCurrentSum += max - 2*Math.abs(playerState.temp.amount)
            }else{
                stateCurrentSum += playerState[attr].amount;
            }
            stateSum += max;
        }

        var totalState = stateCurrentSum/stateSum;
        playerState.san.amount += (totalState - 0.7) * this.getMaxState('san') / MAX_STATE;

        var sanMax = this.getMaxState('san');
        playerState.san.amount = playerState.san.amount>sanMax?sanMax:playerState.san.amount;
        playerState.san.amount = playerState.san.amount<0?0:playerState.san.amount;
        //set cool down
        var coolDown = this.state.coolDownSaveData;
        for(var attr in coolDown){
            coolDown[attr] -= timeNeed;
            coolDown[attr] = coolDown[attr]>0?coolDown[attr]:0;
        }
        //set date hour
        this.setState({
            time:{day:day,hour:now},
            coolDownSaveData:coolDown,
        });
        //set duel people
        var trade = this.state.tradeSaveData;
        for(var i = 0; i < trade.length ; i++){
            trade[i].time -= timeNeed;
            if(trade[i].time<0){
                trade.splice(i,1);
            }
        }
        this.setState({tradeSaveData:trade});
        //set wait make buildings
        var buildingSaveData = this.state.buildingSaveData;
        function addToAll(building){
            var list = buildingSaveData[building].list;
            var map = {
                'farm':CROP_DATA,
                'alco':ALCO_DATA,
            }
            var attachData = map[building];
            if(season == 'winter' && (building == 'alco' || building == 'farm'))return false;

            for (var i = list.length - 1; i >= 0; i--) {
                //生产
                list[i].timeNow += timeNeed;

                //春季产出翻倍
                if(season == 'spring' && (building == 'farm'))list[i].timeNow += timeNeed;
                
                //成熟提醒
                var timeMax = attachData[list[i].type].timeMax/(1 + manageLevel);
                if(list[i].timeNow > timeMax){
                    buildingSaveData[building].hint = true;
                }
            };
        }
        addToAll.bind(this,'farm')();
        addToAll.bind(this,'alco')();
        this.setState({buildingSaveData:buildingSaveData});
        //finally setState
        this.setState({playerState:playerState});

        //检查死亡
        this.checkDeath();
        return true;
    },
    playerStateChange:function(list,isNegative){
        var o = this.state.playerState;
        for (var attr in list){
            var stateName = attr,amount = list[attr];
            if(o[stateName] == undefined)continue;
            o[stateName].amount += isNegative? -amount:amount;
            var max = this.getMaxState(stateName);
            (o[stateName].amount > max)?o[stateName].amount = max:null;
        }
        if(o.san.amount < 0)o.san.amount = 0;
        this.setState({playerState:o});
        //检查死亡
        this.checkDeath();
    },
    playerStateUse:function(list,isNegative){
        this.playerStateChange(list,!(isNegative||false));
        this.durableChange(list);
    },
    getMaxDurable:function  (item) {
        var durable = ITEM_DATA[item].durable;
        var weaponType = ITEM_DATA[item].weaponType;
        var level = weaponType == 'melee' ? this.getScienceLevel('durableUpdate') : this.getScienceLevel('magicDurableUpdate');
        return Math.round(durable * (1 + level * 0.25));
    },
    durableChange:function(list,isNegative){
        var o = this.state.durableSaveData;
        var currentEquip = this.state.currentEquip;
        var boxSaveData = this.state.boxSaveData;
        var itemInstances = this.state.itemInstances;
        for (var attr in list){
            var itemName = attr,amount = list[attr];
            if(o[itemName]==undefined)continue;
            // stackable 耐久物品：耐久为数组（每份一份），只占一个格子
            if(Array.isArray(o[itemName])){
                var arr = o[itemName];
                if(arr.length === 0){ delete o[itemName]; continue; }
                // 取损耗最小的一份来承受本次损耗
                var idx = 0;
                for(var i = 1;i < arr.length;i++){ if(arr[i] < arr[idx])idx = i; }
                arr[idx] += isNegative? -amount:amount;
                if(arr[idx] >= this.getMaxDurable(itemName)){
                    arr.splice(idx,1);
                    for(var b0 in boxSaveData){
                        if(boxSaveData[b0].things && boxSaveData[b0].things[itemName]){
                            boxSaveData[b0].things[itemName] -= 1;
                            if(boxSaveData[b0].things[itemName] <= 0)delete boxSaveData[b0].things[itemName];
                            break;
                        }
                    }
                }
                if(arr.length === 0)delete o[itemName];
                continue;
            }
            o[itemName] += isNegative? -amount:amount;
            if(o[itemName] >= this.getMaxDurable(itemName)){
                if(itemName.indexOf('#') >= 0){
                    // 实例化武器/工具损坏：从装备槽/任意容器中移除该实例并清理
                    for(var slot in currentEquip){
                        if(currentEquip[slot] == itemName)currentEquip[slot] = null;
                    }
                    for(var b in boxSaveData){
                        if(boxSaveData[b].things && boxSaveData[b].things[itemName]){
                            delete boxSaveData[b].things[itemName];
                            break;
                        }
                    }
                    delete o[itemName];
                    delete ITEM_DATA[itemName];
                    delete itemInstances[itemName];
                }else{
                    // 兼容旧的非实例化武器
                    o[itemName] = 0;
                    var use = {};use[itemName] = 1;
                    this.useItem(use,'bag');
                }
            }
        }
        this.setState({durableSaveData:o,currentEquip:currentEquip,boxSaveData:boxSaveData,itemInstances:itemInstances});
    },
    getTempDesc:function(){
        var playerState = this.state.playerState;
        var state = playerState.temp;
        if(state.amount>30)return 'veryHot';
        if(state.amount>20)return 'hot';
        if(state.amount>10)return 'warm';
        if(state.amount>0)return 'nice';
        if(state.amount>-10)return 'nice';
        if(state.amount>-20)return 'cool';
        if(state.amount>-30)return 'cold';
        return 'veryCold';
    },
    // 执行一个耗时动作：播放进度动画，结束后回调并推进游戏时间
    useTime:function(callBack,timeNeed,props){
        if(timeNeed == 0){
            callBack();
            return;
        }
        var delay = timeNeed * DELAY_MUL;
        if(delay > 5000){
            delay = 5000 + Math.log(2,(delay - 5000));
        }
        var min = MIX_DELAY;
        delay = delay>min?delay:min;
        var miskChangeTime = ((delay*0.25)<(min*0.4))?(delay*0.25):(min*0.4);
        this.setMisk(miskChangeTime);

        var doCallBack = function(){
            callBack();
            this.clearMisk(miskChangeTime);
            this.addTime(timeNeed,props);
        }.bind(this);
        if(delay >= 500){
            this.setProgress(delay,doCallBack);
        }else{
            setTimeout(doCallBack, delay);
        }
    },
    setProgress:function(delay,callBack){
        var progress = 0;
        var foo = bindAnimation(
                function(step){
                    progress += step/delay;
                    this.setState({progress:progress});
                    if(progress >= 1){
                        callBack();
                        this.setState({progress:0});
                    }else{
                        requestAnimationFrame(foo);
                    }
                }.bind(this)
            )()
        requestAnimationFrame(foo);
    },
    setMisk:function(delay){
        var step = 100;
        var misk = 0;
        var foo = bindAnimation(
                function(step){
                    misk += step/delay;
                    this.setState({misk:misk});
                    if(misk >= 1){
                        this.setState({misk:1})
                    }else{
                        requestAnimationFrame(foo);
                    }
                }.bind(this)
            )()
        requestAnimationFrame(foo);
    },
    clearMisk:function(delay){
        var step = 100;
        var misk = 1;
        var foo = bindAnimation(
                function(step){
                    misk -= step/delay;
                    this.setState({misk:misk});
                    if(misk <= 0){
                        this.setState({misk:0})
                    }else{
                        requestAnimationFrame(foo);
                    }
                }.bind(this)
            )()
        requestAnimationFrame(foo);
    },
    checkHaveResource:function(resName,resAmount,bag){
        // check form bagData to stateData
        // 多用型的检查（按 baseId 统计，兼容实例化武器/工具，并计入装备栏）
        var state = this.state.playerState;
        var total = countBagItem(bag,resName);
        for(var slot in this.state.currentEquip){
            var eq = this.state.currentEquip[slot];
            if(eq && itemBaseId(eq) == resName)total++;
        }
        if(total >= resAmount)return true;
        if(state[resName] && state[resName].amount >= resAmount)return true;
        return false;
    },
    // 检查是否满足一组资源需求；haveBox 为真时把大箱子一并计入
    checkHaveResourceAll:function(resList,haveBox){
        var flag = true;

        //获得背包与大箱子的所有资源
        if(haveBox){
            var bag = together(this.state.boxSaveData.bag.things,this.state.boxSaveData.bigBox.things);
        }else{
            var bag = clone(this.state.boxSaveData.bag.things);
        }

        for (var attr in resList) {
            flag = flag && this.checkHaveResource(attr,resList[attr],bag);
        };
        return flag;
    },
    changeMsg:function(name,type){
        if(type == 'desc'){
            this.setState({detailedList:name,detailedType:type});
        }else{
            this.setState({detailedItem:name,detailedType:type});
        }
    },
    preventDefault:function(event){
         event.preventDefault();
    },
    render:function() {
        return  <div className = "main clearFix"  onContextMenu = {this.preventDefault} onSelect = {this.preventDefault}>
                    <MenuComponent type = {this.state.showMenu}/>
                    <AdvanComponent misk = {this.state.misk} progress = {this.state.progress}>{this.state.wind}</AdvanComponent>
                    <BagComponent items = {this.state.boxSaveData.bag.things} size = {this.state.boxSaveData.bag.size} />

                </div>;
    },
    componentWillMount:function(){
        if(this.state.saveData==null){
            this.init();
        }
    },
    init:function(){
        var initState = this.getInitialState();
        this.setState(initState);
    },
    setVolume:function (argument) {
        this.AudioEngine.on = !this.AudioEngine.on;
        render();
    },
    loadState:function(data){
        this.setState({currentScene:'home'});
        //对存档的预处理
        data.misk = 0;
        data.progress = 0;
        data.wind = null;
        data.detailedItem = '';
        data.detailedType = '';
        data.detailedList = [];
        data.currentBox = '';

        if(!data.generation){
            data.generation = 0;
        }
        if(!data.maouLevel){
            data.maouLevel = 0;
        }
        if(!data.robberSaveData){
            data.robberSaveData = ROBBER_INIT;
        }
        if(data.dungeonSaveData.stairData == undefined){
            data.dungeonSaveData.stairData = {};
        }
        //补丁
        for(var attr in BOX_INIT){
            if(!data.boxSaveData[attr]){
                data.boxSaveData[attr] = clone(BOX_INIT[attr]);
            }
        }
        // 兼容旧存档：旧版本装备后物品仍留在背包中；这里把已装备物品从背包扣除一次，
        // 使装备不再占用背包格子（仅对旧结构存档执行），并补齐新增的装备槽位。
        if(data.currentEquip){
            var isOldEquipSchema = (data.currentEquip.weapon1 === undefined && data.currentEquip.weapon2 === undefined && data.currentEquip.neck === undefined);
            if(isOldEquipSchema){
                for(var eqSlot in data.currentEquip){
                    var eqItem = data.currentEquip[eqSlot];
                    if(eqItem && data.boxSaveData.bag.things[eqItem]){
                        data.boxSaveData.bag.things[eqItem] -= 1;
                        if(data.boxSaveData.bag.things[eqItem] <= 0)delete data.boxSaveData.bag.things[eqItem];
                    }
                }
            }
            var equipSlotList = ['head','body','foot','neck','hand','weapon1','weapon2'];
            for(var es = 0;es < equipSlotList.length;es++){
                if(data.currentEquip[equipSlotList[es]] === undefined)data.currentEquip[equipSlotList[es]] = null;
            }
        }
        // 耐久类武器/工具实例化：同名武器各自独立耐久、不堆叠。
        // - 旧存档里以 baseId 堆叠的耐久物品，拆分为实例；
        // - 已有实例键在读档时重新注册动态 ITEM_DATA 条目；
        // - 首次迁移时把所有已拥有武器/工具耐久刷新为满（durableRefreshed 标记，只执行一次）。
        if(!data.durableSaveData)data.durableSaveData = {};
        if(!data.itemInstances)data.itemInstances = {};
        var refreshDurability = !data.durableRefreshed;
        for(var boxName in data.boxSaveData){
            var thingsBox = data.boxSaveData[boxName].things;
            if(!thingsBox)continue;
            var boxKeys = [];
            for(var tk0 in thingsBox)boxKeys.push(tk0);
            for(var ki = 0;ki < boxKeys.length;ki++){
                var tk = boxKeys[ki];
                if(thingsBox[tk] === undefined)continue;
                var tkCount = thingsBox[tk];
                if(tk.indexOf('#') >= 0){
                    var base = data.itemInstances[tk] || tk.split('#')[0];
                    if(ITEM_DATA[base] && ITEM_DATA[base].stackable){
                        // stackable：实例并入同一格堆叠（耐久存入数组）
                        thingsBox[base] = (thingsBox[base] || 0) + tkCount;
                        var arrSt = Array.isArray(data.durableSaveData[base]) ? data.durableSaveData[base] : [];
                        for(var z = 0;z < tkCount;z++)arrSt.push(data.durableSaveData[tk] || 0);
                        data.durableSaveData[base] = arrSt;
                        delete thingsBox[tk];
                        delete data.durableSaveData[tk];
                        delete data.itemInstances[tk];
                        delete ITEM_DATA[tk];
                        continue;
                    }
                    // 已有实例：注册动态 ITEM_DATA
                    if(ITEM_DATA[base] && !ITEM_DATA[tk]){
                        var inst = clone(ITEM_DATA[base]);
                        inst.baseId = base; inst.isInstance = true; inst.instanceId = tk;
                        ITEM_DATA[tk] = inst;
                    }
                    data.itemInstances[tk] = base;
                    if(data.durableSaveData[tk] === undefined)data.durableSaveData[tk] = 0;
                }else if(ITEM_DATA[tk] && ITEM_DATA[tk].durable){
                    if(ITEM_DATA[tk].stackable){
                        // stackable：保持堆叠，耐久为数组（长度=数量）
                        var arr1 = Array.isArray(data.durableSaveData[tk]) ? data.durableSaveData[tk] : [];
                        while(arr1.length < tkCount)arr1.push(0);
                        arr1.length = tkCount;
                        data.durableSaveData[tk] = arr1;
                    }else{
                        // 旧堆叠 -> 拆分为实例
                        delete thingsBox[tk];
                        for(var ci = 0;ci < tkCount;ci++){
                            var ikey;
                            do{ ikey = tk + '#' + (this.instanceSeq++); }while(ITEM_DATA[ikey] || data.itemInstances[ikey]);
                            var inst2 = clone(ITEM_DATA[tk]);
                            inst2.baseId = tk; inst2.isInstance = true; inst2.instanceId = ikey;
                            ITEM_DATA[ikey] = inst2;
                            thingsBox[ikey] = 1;
                            data.itemInstances[ikey] = tk;
                            data.durableSaveData[ikey] = 0;
                        }
                    }
                }
            }
        }
        if(refreshDurability){
            for(var instKey in data.itemInstances){
                data.durableSaveData[instKey] = 0;
            }
            for(var cb in data.durableSaveData){
                if(Array.isArray(data.durableSaveData[cb])){
                    for(var ai = 0;ai < data.durableSaveData[cb].length;ai++)data.durableSaveData[cb][ai] = 0;
                }
            }
            data.durableRefreshed = true;
        }
        //新地图资源
        for(var place in PLACE_DATA){
            if(data.placeSaveData[place] == undefined){
                data.placeSaveData[place] = clone(PLACE_INIT[place]);
            }else{
                //资源补丁
                for(var attr in PLACE_INIT[place].resource){
                    if(!data.placeSaveData[place].resource[attr]){
                        data.placeSaveData[place].resource[attr] = clone(PLACE_INIT[place].resource[attr]);
                    }
                }
                for(var attr in data.placeSaveData[place].resource){
                    //清除资料片中不存在的资源
                    for(var res in data.placeSaveData[place].resource){
                        if(PLACE_DATA[place].resource[res] == undefined){
                            delete data.placeSaveData[place].resource[res];
                        }
                    }
                }
                //怪物补丁
                for(var attr in PLACE_INIT[place].mst){
                    if(!data.placeSaveData[place].mst[attr]){
                        data.placeSaveData[place].mst[attr] = clone(PLACE_INIT[place].mst[attr]);
                    }
                }
                for(var attr in data.placeSaveData[place].mst){
                    //清除资料片中不存在的怪兽
                    for(var mst in data.placeSaveData[place].mst){
                        if(PLACE_DATA[place].mst[mst] == undefined){
                            delete data.placeSaveData[place].mst[mst];
                        }
                    }
                }

            }
        }
        for(var attr in ITEM_DATA){
            if(ITEM_DATA[attr].durable && data.durableSaveData[attr] == undefined){
                data.durableSaveData[attr] = 0;
            }
        }
        //新事件
        for(var attr in EVENT_INIT){
            if(EVENT_INIT[attr] != undefined && (data.eventSaveData[attr] == undefined)){
                data.eventSaveData[attr] = EVENT_INIT[attr];
            }
        }
        this.setState(data);
        this.setState({showMenu:''});
        this.setState({currentScene:'home'});
        var level = this.getScienceLevel('bagSizeBonus');
        var boxSaveData = this.state.boxSaveData;
        boxSaveData['bag'].size = BAG_BASE_SIZE + level;
        this.setState({boxSaveData:boxSaveData});
    },
    loadData:function (str) {
        this.setState({currentScene:'branch'});
        setTimeout(function(){
            this.setState({currentScene:'home'});
            var data = eval('(' + str + ')');
            //对存档的预处理
            this.loadState(data);
        }.bind(this),100)
    },
    // 读取账号存档：向后端查询并载入数据
    download:function(){
        var saveData = (this.state);
        var save_account = saveData.settings.save_account;
        var save_pass = saveData.settings.save_pass;
        var jsonStr = 'action=load&account=' + save_account + '&pass=' + save_pass + '&data=nope';
        var self = this;
        var htmlobj = $.ajax({
            contentType:"application/x-www-form-urlencoded",
            type:'POST',
            url:SAVE_URL,
            async:true,
            data:jsonStr,
            success:function(){
                if(htmlobj.responseText=='no account'){
                    alert("没有这个账号...");
                    return;
                }
                if(htmlobj.responseText=='incorrect pass'){
                    alert("密码错误...");
                    return;
                }
                if(htmlobj.responseText=='invalid'){
                    alert("账号、密码必须是3-12位的数字以及字母的组合...");
                    return;
                }
                    lll(htmlobj.responseText);
                    alert("读取成功！");
                    self.setState({saveData:htmlobj.responseText});
                    self.loadData(htmlobj.responseText);
        }});
    },
    // 保存账号存档到后端（需填写账号/密码）；callback(ok, reason) 用于回显结果
    upload:function(doNotShow, callback){
        var saveData = clone(this.state);
        var save_account = saveData.settings.save_account;
        var save_pass = saveData.settings.save_pass;
        var day = saveData.time.day;
        var g = saveData.generation;
        if(save_account == null||save_account == ''){
            alert('不输入账号怎么保存啊。。。');
            return;
        }
        if(save_pass == null||save_pass == ''){
            alert('不输入密码怎么保存啊。。。');
            return;
        }
        delete saveData.settings;
        delete saveData.saveData;
        delete saveData.wind;
        delete saveData.detailedItem;
        delete saveData.detailedList;
        delete saveData.detailedType;
        var jsonStr = 'action=save&account=' + save_account + '&pass=' + save_pass + '&data=' + encodeURI(JSON.stringify(saveData)) + '&day=' + day + '&g=' + g;
        var htmlobj = $.ajax({
            contentType:"application/x-www-form-urlencoded",
            type:'POST',
            url:SAVE_URL,
            async:true,
            data:jsonStr,
            success:function(){
                if(htmlobj.responseText=='incorrect pass'){
                    alert("密码错误...");
                    callback&&callback(false,'密码错误');
                    return;
                }
                if(htmlobj.responseText=='invalid'){
                    alert("账号、密码必须是3-12位的数字以及字母的组合...");
                    callback&&callback(false,'账号或密码格式错误');
                    return;
                }
                if(!doNotShow)alert("保存成功！");
                callback&&callback(true);
                    // self.setState({saveData:decodeURI(encodeURI(JSON.stringify(saveData)))});
        }});
    },
    getLocalSaveKey:function(slot){
        return LOCAL_SAVE_PREFIX + slot;
    },
    getLocalSaves:function(){
        //读取所有本地存档槽的元信息（含自动存档槽 0）
        var result = {};
        for(var i = LOCAL_SAVE_AUTO_SLOT;i <= LOCAL_SAVE_SLOTS;i++){
            var raw = null;
            try{
                raw = localStorage.getItem(this.getLocalSaveKey(i));
            }catch(e){
                raw = null;
            }
            var save = null;
            if(raw){
                try{
                    save = JSON.parse(raw);
                }catch(e){
                    save = null;
                }
            }
            result[i] = save;
        }
        return result;
    },
    saveLocal:function(slot){
        var saveData = clone(this.state);
        delete saveData.settings;
        delete saveData.saveData;
        delete saveData.wind;
        delete saveData.detailedItem;
        delete saveData.detailedList;
        delete saveData.detailedType;
        var save = {
            version : 1,
            savedAt : Date.now(),
            day     : saveData.time.day,
            hour    : saveData.time.hour,
            season  : saveData.season,
            generation: saveData.generation,
            data    : JSON.stringify(saveData),
        };
        try{
            localStorage.setItem(this.getLocalSaveKey(slot),JSON.stringify(save));
        }catch(e){
            alert('本地保存失败，浏览器可能不支持或存储已满...');
            return false;
        }
        return true;
    },
    loadLocal:function(slot){
        var saves = this.getLocalSaves();
        var save = saves[slot];
        if(!save || !save.data){
            alert('该存档位是空的...');
            return false;
        }
        this.setState({saveData:save.data});
        this.loadData(save.data);
        return true;
    },
    deleteLocal:function(slot){
        try{
            localStorage.removeItem(this.getLocalSaveKey(slot));
        }catch(e){}
    },
});
