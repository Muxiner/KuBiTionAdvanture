/**
 * src/core/MainComponent.js —— 全局状态中心
 * 持有全部游戏状态，通过 context 向子组件下发；负责时间推进、每日结算、物品操作、
 * 装备/耐久、死亡与转生、天气季节、存档（账号/本地）等核心逻辑。
 */

// ===== 4) 全局状态中心 =====
// MainComponent：持有全部游戏状态（背包/建筑/地牢/事件/玩家六维/时间/技能等），
// 通过 context 向约 50 个子组件下发；负责时间推进、每日结算、物品操作、死亡与转生、
// 天气季节、以及（账号/本地）存档等核心逻辑。

// 存档格式版本。仅用于前端读档兼容判断，不参与服务端协议。
var SAVE_SCHEMA_VERSION = 2;
// 允许写入存档的游戏字段白名单：UI/临时状态（msgList/menuDesc/misk/progress/
// wind/detailed*/showMenu/currentBox/currentScene 等）一律不落盘，避免把 React
// 元素写进 JSON，也避免读档时把界面状态带回来。
var SAVE_FIELDS = [
    'boxSaveData', 'buildingSaveData', 'campSaveData', 'coolDownSaveData',
    'currentEquip', 'defaultWeapon', 'durableSaveData', 'durableRefreshed',
    'dungeonSaveData', 'eventSaveData', 'generation', 'itemInstances',
    'maouLevel', 'placeSaveData', 'playerState', 'robberSaveData', 'season',
    'skill', 'startSeason', 'time', 'tradeSaveData'
];
// 存档中保留的非敏感设置（账号/密码只在内存里，不写本地也不上传）
var SAVE_SETTING_FIELDS = ['sort', 'autoSave'];
// 只存放普通物品的容器：读档时清理已从数据表删除的物品 id，避免渲染崩溃。
// 升级/科技容器（toiletUpdate 等）里是"升级标记键"，不能按 ITEM_DATA 清理。
var ITEM_ONLY_BOXES = ['bag', 'bigBox', 'cooker', 'cooked', 'well', 'marshGasTank', 'shit', 'register', 'trade'];

var MainComponent = React.createClass({
    startSeason: '',//游戏开始时的季节
    instanceSeq: 1,//耐久类物品实例化时的自增序号
    getInitialState: function () {
        var startSeason = Math.random() > 0.5 ? 'spring' : 'autumn';
        var state = {
            boxSaveData: clone(BOX_INIT),
            buildingSaveData: clone(BUILDING_INIT),
            coolDownSaveData: clone(COOL_DOWN_INIT),
            currentBox: '',
            currentEquip: { head: null, body: null, foot: null, neck: null, hand: null, weapon1: null, weapon2: null },
            currentScene: 'home',
            defaultWeapon: [],
            detailedItem: '',
            detailedList: [],
            detailedType: '',
            dungeonSaveData: { stairCount: 1, roomCount: 1, deepest: 1, stairData: {} },
            durableSaveData: clone(DURABLE_INIT),
            itemInstances: {},//耐久类物品实例键 -> 基础物品id
            robberSaveData: clone(ROBBER_INIT),
            eventSaveData: clone(EVENT_INIT),
            isDueling: false,
            menuDesc: {},
            menuHint: 0,
            misk: 0,
            msgList: [],
            mstState: {},//怪物的状态
            placeSaveData: clone(PLACE_INIT),
            playerState: clone(PLAYER_STATE_INIT),
            progress: 0,
            startSeason: startSeason,
            season: startSeason,
            showMenu: '',
            skill: {},
            time: { day: 1, hour: 6 },
            tradeSaveData: clone(TRADE_INIT),
            settings: { sort: false, autoSave: true },
            wind: null,
            maouLevel: 0,
            campSaveData: {
                choice: null,
                picked: false,
            },
            generation: 0,
        }
        if (MODE == 'DEBUG') {
            state.skill = DEBUG_SKILL;
        }
        var saveData = clone(state);
        state.saveData = saveData;
        return state;
    },
    childContextTypes: {
        maouLevel: React.PropTypes.number.isRequired,
        parentState: React.PropTypes.object.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        buildingSaveData: React.PropTypes.object.isRequired,
        cancelEquip: React.PropTypes.func.isRequired,
        unequipSlot: React.PropTypes.func.isRequired,
        discardItem: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        changeMsg: React.PropTypes.func.isRequired,
        checkFull: React.PropTypes.func.isRequired,
        checkHaveResource: React.PropTypes.func.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        currentScene: React.PropTypes.string.isRequired,
        defaultWeapon: React.PropTypes.array.isRequired,
        detailedItem: React.PropTypes.string.isRequired,
        detailedList: React.PropTypes.array.isRequired,
        detailedType: React.PropTypes.string.isRequired,
        dungeonSaveData: React.PropTypes.object.isRequired,
        durableSaveData: React.PropTypes.object.isRequired,
        eventSaveData: React.PropTypes.object.isRequired,
        getBuildingLevel: React.PropTypes.func.isRequired,
        getMaxDurable: React.PropTypes.func.isRequired,
        getMaxTimeOfRequire: React.PropTypes.func.isRequired,
        getMstCircle: React.PropTypes.func.isRequired,
        getScienceLevel: React.PropTypes.func.isRequired,
        getTempDesc: React.PropTypes.func.isRequired,
        getTheMaxTimeToUse: React.PropTypes.func.isRequired,
        getValue: React.PropTypes.func.isRequired,
        getcoolDownSaveData: React.PropTypes.func.isRequired,
        getTimeNeed: React.PropTypes.func.isRequired,
        handleDeath: React.PropTypes.func.isRequired,
        handleExchange: React.PropTypes.func.isRequired,
        isDueling: React.PropTypes.bool.isRequired,
        menuDesc: React.PropTypes.object.isRequired,
        menuHint: React.PropTypes.number.isRequired,
        msgList: React.PropTypes.array.isRequired,
        mstState: React.PropTypes.object.isRequired,
        mstStateChange: React.PropTypes.func.isRequired,
        placeSaveData: React.PropTypes.object.isRequired,
        playerState: React.PropTypes.object.isRequired,
        playerStateChange: React.PropTypes.func.isRequired,
        playerStateUse: React.PropTypes.func.isRequired,
        season: React.PropTypes.string.isRequired,
        startSeason: React.PropTypes.string.isRequired,
        setCurrentBox: React.PropTypes.func.isRequired,
        setCurrentScene: React.PropTypes.func.isRequired,
        setDueling: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        setcoolDownSaveData: React.PropTypes.func.isRequired,
        showMenu: React.PropTypes.string.isRequired,
        showMsg: React.PropTypes.func.isRequired,
        skill: React.PropTypes.object.isRequired,
        time: React.PropTypes.object.isRequired,
        tradeSaveData: React.PropTypes.array.isRequired,
        useItem: React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        upload: React.PropTypes.func.isRequired,
        download: React.PropTypes.func.isRequired,
        saveLocal: React.PropTypes.func.isRequired,
        loadLocal: React.PropTypes.func.isRequired,
        deleteLocal: React.PropTypes.func.isRequired,
        getLocalSaves: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired,
        setVolume: React.PropTypes.func.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        campSaveData: React.PropTypes.object.isRequired,
        robberSaveData: React.PropTypes.object.isRequired,
        handleItemClick: React.PropTypes.func.isRequired,
        getEnveronmentTemperature: React.PropTypes.func.isRequired,
        currentBox: React.PropTypes.string.isRequired,
        sort: React.PropTypes.func.isRequired,
        getMaxState: React.PropTypes.func.isRequired,
        reBorn: React.PropTypes.func.isRequired,
        generation: React.PropTypes.number.isRequired,
    },
    getChildContext: function () {
        return {
            generation: this.state.generation,
            reBorn: this.reBorn,
            maouLevel: this.state.maouLevel,
            sort: this.sort,
            currentBox: this.state.currentBox,
            parentState: this.state,
            AudioEngine: this.AudioEngine,
            boxSaveData: this.state.boxSaveData,
            buildingSaveData: this.state.buildingSaveData,
            cancelEquip: this.cancelEquip,
            unequipSlot: this.unequipSlot,
            discardItem: this.discardItem,
            changeItem: this.changeItem,
            changeMsg: this.changeMsg,
            checkFull: this.checkFull,
            checkHaveResource: this.checkHaveResource,
            checkHaveResourceAll: this.checkHaveResourceAll,
            currentEquip: this.state.currentEquip,
            currentScene: this.state.currentScene,
            defaultWeapon: this.state.defaultWeapon,
            detailedItem: this.state.detailedItem,
            detailedList: this.state.detailedList,
            detailedType: this.state.detailedType,
            dungeonSaveData: this.state.dungeonSaveData,
            durableSaveData: this.state.durableSaveData,
            eventSaveData: this.state.eventSaveData,
            getBuildingLevel: this.getBuildingLevel,
            getMaxDurable: this.getMaxDurable,
            getMaxTimeOfRequire: this.getMaxTimeOfRequire,
            getMstCircle: this.getMstCircle,
            getScienceLevel: this.getScienceLevel,
            getTempDesc: this.getTempDesc,
            getTheMaxTimeToUse: this.getTheMaxTimeToUse,
            getValue: this.getValue,
            getcoolDownSaveData: this.getcoolDownSaveData,
            getTimeNeed: this.getTimeNeed,
            handleDeath: this.handleDeath,
            handleExchange: this.handleExchange,
            isDueling: this.state.isDueling,
            menuDesc: this.state.menuDesc,
            menuHint: this.state.menuHint,
            msgList: this.state.msgList,
            mstState: this.state.mstState,
            mstStateChange: this.mstStateChange,
            placeSaveData: this.state.placeSaveData,
            playerState: this.state.playerState,
            playerStateChange: this.playerStateChange,
            playerStateUse: this.playerStateUse,
            season: this.state.season,
            startSeason: this.state.startSeason,
            setCurrentBox: this.setCurrentBox,
            setCurrentScene: this.setCurrentScene,
            setDueling: this.setDueling,
            setStateFromChildren: this.setStateFromChildren,
            setcoolDownSaveData: this.setcoolDownSaveData,
            showMenu: this.state.showMenu,
            showMsg: this.showMsg,
            skill: this.state.skill,
            time: this.state.time,
            tradeSaveData: this.state.tradeSaveData,
            useItem: this.useItem,
            useItemThatPlayerHave: this.useItemThatPlayerHave,
            useTime: this.useTime,
            upload: this.upload,
            download: this.download,
            saveLocal: this.saveLocal,
            loadLocal: this.loadLocal,
            deleteLocal: this.deleteLocal,
            getLocalSaves: this.getLocalSaves,
            settings: this.state.settings,
            setVolume: this.setVolume,
            callWindow: this.callWindow,
            campSaveData: this.state.campSaveData,
            handleItemClick: this.handleItemClick,
            getEnveronmentTemperature: this.getEnveronmentTemperature,
            robberSaveData: this.state.robberSaveData,
            getMaxState: this.getMaxState,
        };
    },
    // 转生：保留天赋技能并重置世界，进入下一代（generation+1）
    reBorn: function (skill) {
        var skillNow = clone(this.state.skill);
        for (var attr in skillNow) {
            // if(!SKILL_DATA[attr].isTalent)delete skillNow[attr];
            if (!SKILL_DATA[attr].isTalent) skillNow[attr] = (Math.round(skillNow[attr] / 10));
            if (skillNow[attr] == 0) {
                delete skillNow[attr];
            }
        }
        skillNow[skill] = (skillNow[skill] || 0) + 1;
        var generation = this.state.generation + 1;
        // 转生只重置世界数据，保留设置（含账号/密码）与魔王等级
        var settingsNow = this.state.settings;
        var maouLevelNow = this.state.maouLevel;
        var state = this.getInitialState();
        state.skill = skillNow;
        state.generation = generation;
        state.settings = settingsNow;
        state.maouLevel = maouLevelNow;
        this.setState(state);
        this.showMsg(<p key='reborn'>已转生：进入第 {fmtNum(generation)} 世。天赋技能保留，世界已重置；请重新探索并建设。</p>);
        setTimeout(function () {
            for (var attr in this.state.playerState) {
                if (attr == 'temp') continue;
                this.playerStateChange(o(attr, 1000000));
            }
        }.bind(this), 0);
    },
    // 计算某状态(生命/满腹/水分/体力/精神)的当前上限（含技能加成）
    getMaxState: function (type) {
        var skill = this.state.skill;
        var buff = 0;
        switch (type) {
            case 'ps':
            case 'san':
                buff += skill.durable ? SKILL_DATA.durable.buff * skill.durable : 0;
                break;
            case 'hp':
            case 'full':
            case 'moist':
                buff += skill.physique ? SKILL_DATA.physique.buff * skill.physique : 0;
                break;
            default:
                break;
        }
        var base = MAX_STATE;
        return Math.round(base * (1 + buff));
    },
    sort: function (box) {
        var boxSaveData = (this.state.boxSaveData);
        var result = {};
        var source = clone(boxSaveData[box].things);
        var typeList = {};
        do {
            var flag = false;
            for (var attr in source) {
                var temp = ITEM_DATA[attr];
                if (temp.type && typeList[temp.type] == undefined) {
                    typeList[temp.type] = true;
                    flag = true;
                }
            }
        } while (flag == true)

        for (var type in typeList) {
            for (var attr in source) {
                var temp = ITEM_DATA[attr];
                if (temp.type == type) {
                    result[attr] = source[attr];
                }
            }
        }
        boxSaveData[box].things = result;
        this.setState({ boxSaveData: boxSaveData });
    },
    // 处理物品点击：食用/饮用、回城卷轴、武器充能、装备穿戴、能力提升道具等
    handleItemClick: function (item, box) {
        // 战斗中禁止玩家主动使用/装备物品（战斗内的弹药/状态消耗走 context.useItem，
        // 不经过这里，因此不会误伤）
        if (getLength(this.state.mstState) != 0 || this.state.isDueling) {
            this.showMsg(<p key='noItemInBattle'>无法使用：战斗中禁止使用物品，请先结束战斗再试。</p>);
            return;
        }
        //食物、药剂效果
        if (ITEM_DATA[item].effect) {
            this.playerStateChange(ITEM_DATA[item].effect);
            this.useItem(o(item, 1), box);
            //play effect
            var type = ITEM_DATA[item].type;
            switch (type) {
                case 'food':
                case 'cooked':
                    if (ITEM_DATA[item].isDrink) {
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
        if (item == 'scroll') {
            if (getLength(this.state.mstState) != 0) {
                this.showMsg(<p key='noScrollInBattle'>无法使用回城卷轴：战斗中禁止传送，请先结束战斗。</p>)
            } else {
                this.useItem({ scroll: 1 }, box);
                this.useTime(function () {
                    var dungeonSaveData = this.state.dungeonSaveData;
                    dungeonSaveData.stairCount = 1;
                    dungeonSaveData.roomCount = 1;
                    this.setState({ currentScene: 'home', dungeonSaveData: dungeonSaveData, wind: null });
                }.bind(this), 0.3);
                this.AudioEngine.playEffect(item.sound || 'pick');
            }
        }
        //能量球
        var durableRec = ITEM_DATA[item].durableRec;
        if (durableRec) {
            var durableSaveData = this.state.durableSaveData;
            this.useItem(o(item, 1), box);
            this.useTime(function () {
                for (var attr in durableSaveData) {
                    var wt = ITEM_DATA[attr].weaponType;
                    if (wt == durableRec || (durableRec == 'unmagic' && (wt == 'melee' || wt == 'shoot'))) {
                        if (Array.isArray(durableSaveData[attr])) {
                            for (var ci2 = 0; ci2 < durableSaveData[attr].length; ci2++)durableSaveData[attr][ci2] = 0;
                        } else {
                            durableSaveData[attr] = 0;
                        }
                    }
                }
                this.setState({ durableSaveData: durableSaveData });
            }.bind(this), 0.3);
            this.AudioEngine.playEffect(item.sound || 'pick');
        }
        if (box == 'bag' && (ITEM_DATA[item].equipType || ITEM_DATA[item].type == 'weapon')) {
            if (getLength(this.state.mstState) != 0) {
                this.showMsg(<p key='noEquipInBattle'>无法穿脱装备：战斗中禁止更换装备，请先结束战斗。</p>)
            } else {
                this.equipItem(item);
            }
        }
        //能力提升物品
        if (ITEM_DATA[item].type == 'special') {
            var play = ITEM_DATA[item].isDrink ? 'drink' : 'scroll';
            this.AudioEngine.playEffect(play);
            this.setState({ menuHint: this.state.menuHint + 1 });
            var upgrade = ITEM_DATA[item].upgrade;
            var skill = this.state.skill;
            if (skill[upgrade]) {
                skill[upgrade]++;
            } else {
                skill[upgrade] = 1;
            }
            this.setState({ skill: skill });
            this.useItem(o(item, 1), box);
        }
    },
    getTimeNeed: function (placeName) {
        //获得装备的速度加成
        var buff = 1;
        var currentEquip = this.state.currentEquip;
        for (var attr in currentEquip) {
            var equip = currentEquip[attr];
            if (!equip) continue;
            if (ITEM_DATA[equip].moveFaster) buff *= ITEM_DATA[equip].moveFaster;
        }
        var timeNeed = PLACE_DATA[placeName].timeNeed * buff;
        return timeNeed;
    },
    callWindow: function (wind) {
        this.setState({ wind: wind });
    },
    AudioEngine: {
        on: true,
        playEffect: function (name) {
            if (!this.on) return;
            var tar = document.getElementById('effect_' + name);
            tar.play();
            if (tar.currentTime > 0.01) tar.currentTime = 0;
        },
        clearBg: function (name) {
            var list = document.getElementsByTagName('audio');
            for (var i = list.length - 1; i >= 0; i--) {
                if (list[i].id.lastIndexOf('bg') == -1 || list[i].id == 'bg_' + name) continue;
                list[i].pause();
            };
        },
        playBg: function (name) {
            if (!this.on) return;
            this.clearBg(name);
            var tar = document.getElementById('bg_' + name);
            if (!tar) return false;
            tar.play();
        },
        stopBg: function (name) {
            var tar = document.getElementById('bg_' + name);
            if (!tar) return false;
            tar.pause();
        },
    },
    // 推送一条浮动消息，MSG_TIME 后自动移除
    showMsg: function (msg) {
        var msgList = this.state.msgList;
        msgList.push(msg);
        this.setState({ msgList: msgList });
        setTimeout((function () {
            var msgList = this.state.msgList;
            if (msgList.length == 0) return;
            msgList.splice(0, 1);
            this.setState({ msgList: msgList });
        }).bind(this), MSG_TIME)
    },
    // 估算物品价值：优先取 value，否则按效果/配方材料折算（用于交易与施舍）
    getValue: function (give) {
        if (ITEM_DATA[give].value) return ITEM_DATA[give].value;
        var value = 0;
        if (ITEM_DATA[give].effect) {
            for (var attr in ITEM_DATA[give].effect) {
                var mul = 1;
                if (attr == 'ps') mul *= 0.5;
                value += mul * (((ITEM_DATA[give].effect[attr] > 0) && (attr != 'temp')) ? ITEM_DATA[give].effect[attr] : 0);
            }
        } else {
            var done = false;
            function check(data) {
                if (data[give]) {
                    var require = data[give].require;
                    for (var attr in require) {
                        value += this.getValue(attr) * require[attr];
                        done = true;
                    }
                    return true;
                }
                return false;
            }
            if (!check.bind(this, MAKE_DATA)()) {
                if (!check.bind(this, ALCHEMY_DATA)()) {
                    if (!check.bind(this, MAGIC_DATA)()) {
                    }
                }
            }
        }
        return value;
    },
    setDueling: function (value) {
        this.setState({ isDueling: value });
    },
    // 统计 scienceTable 中某科技类型的件数，即该科技的等级
    getScienceLevel: function (type) {
        var buildingSaveData = this.state.buildingSaveData;
        var boxSaveData = this.state.boxSaveData;
        var count = 0;
        for (var attr in boxSaveData['scienceTable'].things) {
            if (ITEM_DATA[attr].type == type) {
                count++;
            }
        }
        return count;
    },
    // 统计某升级容器内的升级项数量，即该建筑的等级
    getBuildingLevel: function (update) {
        var updateBox = this.state.boxSaveData[update].things;
        var count = 0;
        for (var attr in updateBox) {
            count++;
        }
        return count;
    },
    setCurrentBox: function (value) {
        this.setState({ currentBox: value })
    },
    setCurrentScene: function (value) {
        this.setState({ currentScene: value })
    },
    // 读取某行动的冷却剩余时间
    getcoolDownSaveData: function (attr) {
        var coolDownSaveData = this.state.coolDownSaveData;
        return coolDownSaveData[attr];
    },
    // 写入某行动的冷却剩余时间
    setcoolDownSaveData: function (attr, value) {
        var coolDownSaveData = this.state.coolDownSaveData;
        coolDownSaveData[attr] = value;
        this.setState({
            coolDownSaveData: coolDownSaveData
        })
    },
    // 增减战斗中怪物（mstState）的状态数值
    mstStateChange: function (list, isNegative) {
        var o = this.state.mstState;
        for (var attr in list) {
            var stateName = attr, amount = list[attr];
            if (o[stateName] == undefined) continue;
            o[stateName] += isNegative ? -amount : amount;
        }
        this.setState({ mstState: o });
    },
    // 计算怪物数量向平衡值回复的每日增长量
    getMstCircle: function (amount, balancedAmount, speed) {
        var still = 0.1;//最少增长量
        var c = speed || 1;//曲线陡峭系数
        if (amount > balancedAmount) return 0;
        if (amount > balancedAmount * 0.5) return c * (balancedAmount - amount) / balancedAmount;
        return still + c * amount / balancedAmount;
    },
    setStateFromChildren: function (obj, isAdding) {
        if (isAdding) {
            for (var attr in obj) {
                obj[attr] += this.state[attr];
            }
        }
        this.setState(obj);
    },
    // 现有材料在「背包+大箱子」下最多可制作的份数
    getMaxTimeOfRequire: function (require) {
        //仅用于家内物品最大制造个数的判断
        var req = {};
        for (var attr in require) {
            req[attr] = require[attr];
        }
        for (var i = 0; ; i++) {
            if (!this.checkHaveResourceAll(req, true)) break;
            for (var attr in require) {
                req[attr] += require[attr];
            }
        }
        return i;
    },
    useItemThatPlayerHave: function (require) {
        // 从背包/大箱子/装备栏扣除材料（兼容实例化武器/工具按 baseId 扣除）
        for (var attr in require) {
            var need = require[attr];
            need = this.consumeFromBox('bag', attr, need);
            if (need > 0) need = this.consumeFromBox('bigBox', attr, need);
            if (need > 0) need = this.consumeFromEquip(attr, need);
        }
    },
    // 从装备栏扣除某基础物品（已装备的工具被配方消耗时的兜底）
    consumeFromEquip: function (baseId, amount) {
        var currentEquip = this.state.currentEquip;
        var durableSaveData = this.state.durableSaveData;
        var itemInstances = this.state.itemInstances;
        for (var slot in currentEquip) {
            if (amount <= 0) break;
            var it = currentEquip[slot];
            if (it && itemBaseId(it) == baseId) {
                currentEquip[slot] = null;
                if (it.indexOf('#') >= 0) {
                    delete durableSaveData[it];
                    delete itemInstances[it];
                    delete ITEM_DATA[it];
                }
                amount--;
            }
        }
        this.setState({ currentEquip: currentEquip, durableSaveData: durableSaveData, itemInstances: itemInstances });
        return amount;
    },
    // 从指定容器扣除某基础物品 amount 个：优先扣未实例化堆叠，再扣实例
    consumeFromBox: function (box, baseId, amount) {
        var boxSaveData = this.state.boxSaveData;
        var tar = boxSaveData[box].things;
        var durableSaveData = this.state.durableSaveData;
        var itemInstances = this.state.itemInstances;
        if (tar[baseId]) {
            var take = Math.min(amount, tar[baseId]);
            tar[baseId] -= take;
            amount -= take;
            if (tar[baseId] <= 0) delete tar[baseId];
            // stackable 耐久物品：同步移除对应份数的耐久记录
            if (ITEM_DATA[baseId] && ITEM_DATA[baseId].stackable && Array.isArray(durableSaveData[baseId])) {
                durableSaveData[baseId].splice(0, take);
                if (durableSaveData[baseId].length === 0) delete durableSaveData[baseId];
            }
        }
        for (var k in tar) {
            if (amount <= 0) break;
            if (k.indexOf('#') >= 0 && itemBaseId(k) == baseId) {
                delete tar[k];
                delete durableSaveData[k];
                delete ITEM_DATA[k];
                delete itemInstances[k];
                amount--;
            }
        }
        this.setState({ boxSaveData: boxSaveData, durableSaveData: durableSaveData, itemInstances: itemInstances });
        return amount;
    },
    getItemThatPlayerHave: function () {
        //可以使用大箱子里的资源
    },

    // 容器是否已满（已存在的物品仍可叠加，但放不下新物品）
    checkFull: function (box, itemName) {
        if (typeof box == 'string') {
            box = this.state.boxSaveData[box];
        }
        return (box.size <= getLength(box.things) && !box.things[itemName]);
    },
    // 在不因满腹/水分耗尽而死亡的前提下，最多可支配的时间
    getTheMaxTimeToUse: function () {
        //这个检查函数是为了防止出现使用时间导致满腹和水分不足而死亡的情况。
        var fullTime = Math.floor(this.state.playerState.full.amount / FULL_DESC_PER_HOUR - 0.0001);
        var moistTime = Math.floor(this.state.playerState.moist.amount / MOIST_DESC_PER_HOUR - 0.0001);
        return moistTime > fullTime ? fullTime : moistTime;
    },
    // 从背包装备物品：移入装备栏（不再占用背包格子）
    // 武器有 2 个槽位(weapon1/weapon2)，其余按 equipType(head/body/foot/neck/hand)
    equipItem: function (item) {
        var data = ITEM_DATA[item];
        if (!data) return;
        if (!this.state.boxSaveData.bag.things[item]) return;
        var currentEquip = clone(this.state.currentEquip);
        var slot;
        if (data.type == 'weapon') {
            // 优先放入空武器槽，都满则替换 武器1
            if (!currentEquip.weapon1) slot = 'weapon1';
            else if (!currentEquip.weapon2) slot = 'weapon2';
            else slot = 'weapon1';
        } else if (data.equipType) {
            slot = data.equipType;
            if (currentEquip[slot] === undefined) currentEquip[slot] = null;
        } else {
            return;
        }
        var old = currentEquip[slot];
        currentEquip[slot] = item;
        this.useItem(o(item, 1), 'bag');
        if (old) this.changeItem(o(old, 1), 'bag');
        this.setState({ currentEquip: currentEquip });
        this.AudioEngine.playEffect('wear');
    },
    // 卸下装备栏某槽的物品，放回背包
    unequipSlot: function (slot) {
        var currentEquip = clone(this.state.currentEquip);
        var item = currentEquip[slot];
        if (!item) return;
        if (this.checkFull(this.state.boxSaveData.bag, item)) {
            this.showMsg(<p key='bagFullUnequip'>无法卸下：背包已满（{fmtNum(getLength(this.state.boxSaveData.bag.things))}/{fmtNum(this.state.boxSaveData.bag.size)} 格），请先丢弃或转移物品到大箱子。</p>);
            return;
        }
        currentEquip[slot] = null;
        this.changeItem(o(item, 1), 'bag');
        this.setState({ currentEquip: currentEquip });
        this.AudioEngine.playEffect('pick');
    },
    // 从任意装备槽卸下指定物品并放回背包
    cancelEquip: function (itemName) {
        //卸下装备（在任意槽位中查找并放回背包）
        var currentEquip = this.state.currentEquip;
        for (var slot in currentEquip) {
            if (currentEquip[slot] == itemName) {
                this.unequipSlot(slot);
                return;
            }
        }
    },
    // 在背包与当前打开的容器之间转移物品（Ctrl/Shift 可批量）
    handleExchange: function (itemName, box, onlyOne) {
        var fromBox = box, toBox;
        if (box == 'bag') {
            if (this.state.currentBox == '') return;
            toBox = this.state.currentBox;
        } else {
            toBox = 'bag';
        }
        if (this.checkFull(this.state.boxSaveData[toBox], itemName)) return 'box is full!';

        var amount = this.state.boxSaveData[fromBox].things[itemName];

        if (CTRL_PRESSED || SHIFT_PRESSED) {
            var max_num = SHIFT_PRESSED ? 100 : 10;
            if (amount > max_num) {
                amount = max_num;
            }
        } else {
            if (onlyOne) {
                amount = 1;
            }
        }
        var o = {};
        o[itemName] = -Math.ceil(amount);
        this.changeItem(o, fromBox);
        o[itemName] = Math.ceil(amount);
        this.changeItem(o, toBox);
        this.cancelEquip(itemName);
        this.AudioEngine.playEffect('exchange');

        if (this.state.settings.sort) this.sort('bag');
    },
    // 创建耐久类物品的一个实例（独立耐久、不堆叠），并注册动态 ITEM_DATA 条目
    createInstance: function (baseId, durableSaveData, itemInstances) {
        var key;
        do { key = baseId + '#' + (this.instanceSeq++); } while (ITEM_DATA[key]);
        var data = ITEM_DATA[baseId];
        var copy = {};
        for (var k in data) copy[k] = data[k];
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
    changeItem: function (items, box, isNegative) {
        var boxSaveData = this.state.boxSaveData;
        var tar = boxSaveData[box].things;
        var durableSaveData = this.state.durableSaveData;
        var itemInstances = this.state.itemInstances;
        var self = this;
        function addInstances(baseId, n) {
            for (var i = 0; i < n; i++) {
                tar[self.createInstance(baseId, durableSaveData, itemInstances)] = 1;
            }
        }
        function removeInstances(baseId, n) {
            // 优先移除实例（耐久损耗最多的先坏），不足再扣未实例化堆叠
            var keys = [];
            for (var k in tar) {
                if (k.indexOf('#') >= 0 && itemBaseId(k) == baseId) keys.push(k);
            }
            keys.sort(function (a, b) { return (durableSaveData[b] || 0) - (durableSaveData[a] || 0); });
            for (var i = 0; i < keys.length && n > 0; i++) {
                var k = keys[i];
                delete tar[k];
                delete durableSaveData[k];
                delete ITEM_DATA[k];
                delete itemInstances[k];
                n--;
            }
            if (n > 0 && tar[baseId]) {
                var take = Math.min(n, tar[baseId]);
                tar[baseId] -= take; n -= take;
                if (tar[baseId] <= 0) delete tar[baseId];
            }
        }
        // stackable 耐久物品：只占一个格子（堆叠数量），耐久按每份存入数组
        function addStackable(baseId, n) {
            var oldCount = tar[baseId] || 0;
            tar[baseId] = oldCount + n;
            var arr = Array.isArray(durableSaveData[baseId]) ? durableSaveData[baseId] : [];
            while (arr.length < oldCount) arr.push(0);
            for (var i = 0; i < n; i++)arr.push(0);
            durableSaveData[baseId] = arr;
        }
        function removeStackable(baseId, n) {
            var oldCount = tar[baseId] || 0;
            var take = Math.min(n, oldCount);
            tar[baseId] = oldCount - take;
            var arr = Array.isArray(durableSaveData[baseId]) ? durableSaveData[baseId] : [];
            arr.splice(0, take);
            if (tar[baseId] <= 0) delete tar[baseId];
            if (arr.length === 0) delete durableSaveData[baseId];
            else durableSaveData[baseId] = arr;
        }
        for (var attr in items) {
            var value = isNegative ? -items[attr] : items[attr];
            var data = ITEM_DATA[itemBaseId(attr)];
            if (data && data.durable && attr.indexOf('#') < 0) {
                if (data.stackable) {
                    if (value > 0) addStackable(attr, value);
                    else if (value < 0) removeStackable(attr, -value);
                } else {
                    if (value > 0) addInstances(attr, value);
                    else if (value < 0) removeInstances(attr, -value);
                }
            } else {
                if (tar[attr]) {
                    tar[attr] += value;
                } else {
                    tar[attr] = value;
                }
                if (tar[attr] <= 0 || isNaN(tar[attr])) delete tar[attr];
            }
        };
        this.setState({ boxSaveData: boxSaveData, durableSaveData: durableSaveData, itemInstances: itemInstances });
    },
    // 使用/消耗物品（对 changeItem 取负值）
    useItem: function (items, box) {
        var box = box || 'bag';
        var o = {};
        for (var attr in items) {
            o[attr] = -items[attr];
        }
        this.changeItem(o, box);
    },
    // 丢弃物品（用于详情面板“丢弃”按钮）：耐久实例一并清理注册
    discardItem: function (item, box, amount) {
        // 与使用/装备同一规则：战斗中禁止主动丢弃
        if (getLength(this.state.mstState) != 0 || this.state.isDueling) {
            this.showMsg(<p key='noDiscardInBattle'>无法丢弃：战斗中禁止丢弃物品，请先结束战斗。</p>);
            return;
        }
        amount = amount || 1;
        this.useItem(o(item, amount), box);
        if (item.indexOf('#') >= 0) {
            var durableSaveData = this.state.durableSaveData;
            var itemInstances = this.state.itemInstances;
            delete durableSaveData[item];
            delete itemInstances[item];
            delete ITEM_DATA[item];
            this.setState({ durableSaveData: durableSaveData, itemInstances: itemInstances });
        }
    },
    clickUse: function (item, box) {
        var type = ITEM_DATA[item].type;
        switch (type) {
            case 'food':
            case 'cooked':
            case 'poizon':
                var effect = type.effect;
        }
    },
    // 依据季节与天数用正弦曲线计算环境温度
    getEnveronmentTemperature: function (day) {
        var season = this.getSeason(day);
        var seasonMap = {
            'spring': 0,
            'summer': 1,
            'autumn': 2,
            'winter': 3,
        };
        var base = seasonMap[this.state.startSeason] * SEASON_CIRCLE - SEASON_CIRCLE / 2;
        var temperature = (Math.sin(Math.PI * (day + base) / (2 * SEASON_CIRCLE)));
        temperature = 50 * (temperature > 0 ? 1 : -1) * Math.pow(temperature, 4);

        return temperature;
    },
    // 按当前天数推算所属季节（每 SEASON_CIRCLE 天一季，四季循环）
    getSeason: function (day) {
        var startSeason = this.state.startSeason;
        var seasonNumber = Math.floor(day / SEASON_CIRCLE) % 4;
        var seasonMap = {
            0: 'spring',
            1: 'summer',
            2: 'autumn',
            3: 'winter',
        };
        for (var i in seasonMap) {
            if (seasonMap[i] == startSeason) {
                var offset = i;
            }
        };
        var index = (parseInt(offset) + seasonNumber) % 4;
        return seasonMap[index];
    },
    // 跨日结算：资源/怪物刷新、沼气池、水井、陷阱、商队、地牢衰减、盗贼来袭、季节更新
    handleDayOver: function (day) {
        var skill = this.state.skill
        //经营手腕等级
        var manageLevel = (skill.manage || 0) * SKILL_DATA.manage.buff;

        var placeSaveData = this.state.placeSaveData;
        var boxSaveData = this.state.boxSaveData;
        var buildingSaveData = this.state.buildingSaveData;
        var season = this.state.season;
        function setInc(tar, speed) {
            tar.count += speed;
            var incAmount = Math.floor(tar.count);
            tar.amount += incAmount;
            tar.count -= incAmount;
        }

        for (var place in placeSaveData) {
            //set new creature
            for (var mstAttr in placeSaveData[place].mst) {
                var mst = placeSaveData[place].mst[mstAttr];
                var speed = this.getMstCircle(mst.amount, PLACE_DATA[place].mst[mstAttr].balancedAmount);
                setInc(mst, speed);
            }
            //set resources
            for (var resourceAttr in placeSaveData[place].resource) {
                var resource = placeSaveData[place].resource[resourceAttr];
                var spd = PLACE_DATA[place].resource[resourceAttr].circle;
                var speed = this.getMstCircle(resource.amount, PLACE_DATA[place].resource[resourceAttr].initAmount, spd);
                if (season == 'spring') speed *= 5;
                if (season == 'autumn') speed *= 0.5;
                if (season == 'winter') speed *= WINTER_REGEN_MUL;

                setInc(resource, speed);
            }
        }
        this.setState({ placeSaveData: placeSaveData });

        //set marshGasTank
        for (var attr in boxSaveData.marshGasTank.things) {
            boxSaveData.marshGasTank.things[attr] -= 1;
            if (!boxSaveData.marshGasTank.things[attr]) delete boxSaveData.marshGasTank.things[attr];
            boxSaveData.marshGasTank.things.fertilizer = (boxSaveData.marshGasTank.things.fertilizer || 0) + 1 + manageLevel;
        }

        //set well
        var haveWell = this.state.buildingSaveData.well.own;
        if (haveWell) {
            var level = this.getBuildingLevel('wellUpdate');
            var o = { water: level + 3 };
            o = cloneMul(o, manageLevel + 1);
            this.changeItem(o, 'well');
        }
        //set trap
        var haveTrap = this.state.buildingSaveData.trap.own;
        if (haveTrap) {
            var list = this.state.buildingSaveData.trap.list;
            for (var i = 0; i < list.length; i++) {

                var tmp = list[i];
                if (tmp.succeed) continue;
                var data = TRAP_DATA[tmp.type];
                var chance = data.chance;
                var level = this.getScienceLevel('陷阱属性');
                chance *= 1 + 0.5 * level;
                if (Math.random() < chance) {
                    tmp.itemGet = getRandom(data.itemGet).attr;
                    tmp.itemAmount = data.itemGet[tmp.itemGet];
                    tmp.succeed = true;

                    //提示
                    buildingSaveData['trap'].hint = true;
                }
            }
        }

        //set trade
        var step = boxSaveData.scienceTable.things['beacon'] ? 1 : 2;
        var timeMul = boxSaveData.scienceTable.things['beacon_2'] ? 2 : 1;
        if (day % step == 0) {
            var tradeSaveData = this.state.tradeSaveData;
            for (var i = 0; i < timeMul; i++) {
                do {
                    var trade = getRandom(TRADE_DATA, { noAttr: 'type' }).attr;
                } while ((TRADE_DATA[trade].season && TRADE_DATA[trade].season != season) || (TRADE_DATA[trade].day && day < TRADE_DATA[trade].day));
                var time = TRADE_DATA[trade].time;
                tradeSaveData.push({ trade: trade, time: time })
            }
            this.setState({ tradeSaveData: tradeSaveData });
        }
        //set season
        this.setState({ season: this.getSeason(day) });
        this.setState({ buildingSaveData: buildingSaveData });

        //set dungeon
        var dungeonSaveData = this.state.dungeonSaveData;
        var stairCount = 1;
        for (var attr in dungeonSaveData.stairData) {
            if (parseInt(stairCount) < parseInt(attr)) stairCount = attr;
        }
        while (stairCount > 0) {
            dungeonSaveData.stairData[stairCount] = (dungeonSaveData.stairData[stairCount] || 0) - DUNGEON_DEC;
            if (dungeonSaveData.stairData[stairCount] < 0) dungeonSaveData.stairData[stairCount] = 0;
            stairCount--;
        }
        this.setState({ dungeonSaveData: dungeonSaveData });

        //set robber
        var robberSaveData = this.state.robberSaveData;
        var level = this.getScienceLevel('防盗能力');
        var 安全属性 = this.getScienceLevel('安全属性');
        var stoledPersont = STOLE * Math.pow(0.9, 安全属性);

        var deadLine = ROBBER_DAY + (MODE == 'DEBUG' ? 0 : level) + Math.random() * 3 - Math.random() * 3;
        if (day - robberSaveData.lastDate > deadLine) {
            robberSaveData.lastDate = day;
            // 盗贼夜袭：只有玩家在家时才会被围攻，HomeComponent 据此进入战斗（胜利后置 null）。
            // 若不在家，不置 robber 标记，只执行下面原有的偷窃结算。
            if (this.state.currentScene == 'home') {
                robberSaveData.robber = '_robber';
            }
            //防盗
            var buildingSaveData = this.state.buildingSaveData;
            var trapList = buildingSaveData.trap.list;
            var flag = false;
            if (this.state.currentScene != 'home') {
                for (var i = 0; i < trapList.length; i++) {
                    if (trapList[i].succeed) continue;
                    if (trapList[i].type == 'antiRogue') {
                        trapList[i].succeed = true;
                        var get = getRandom(TRAP_DATA.antiRogue.itemGet).attr;
                        trapList[i].itemGet = get;
                        trapList[i].itemAmount = TRAP_DATA.antiRogue.itemGet[get];
                        buildingSaveData['trap'].hint = true;
                        flag = true;
                        break;
                    }
                }
                if (flag == false) {
                    var get = {};
                    addTo(get, stole.bind(this, 'bigBox')());
                    addTo(get, stole.bind(this, 'cooker')());
                    addTo(get, stole.bind(this, 'well')());
                    addTo(get, stole.bind(this, 'marshGasTank')());
                    addTo(robberSaveData.stoled, get);
                    if (robberSaveData.stoledAll == undefined) {
                        robberSaveData.stoledAll = {};
                    }
                    addTo(robberSaveData.stoledAll, get);
                    if (getLength(get) > 0) {
                        this.showMsg(<p key='robbedAway'>你不在家时遭遇盗贼，损失了 {fmtReqText(get)}；回家后可查看损失，记得留人在家或升级防盗科技。</p>);
                    }
                }
            }
        }
        // 用 setStateFromChildren 落盘，保证 HomeComponent 能及时看到 robber 标记
        this.setStateFromChildren({ robberSaveData: robberSaveData });

        function stole(box) {
            var get = {};
            var things = boxSaveData[box].things;
            for (var attr in things) {
                var itemData = ITEM_DATA[attr];
                // 跳过已从数据表删除的旧物品，避免读取 .type 时崩溃
                if (!itemData) continue;
                if (itemData.type != 'food' && itemData.type != 'cooked' && itemData.type != 'met') continue;
                var amount = things[attr];
                var stoleAmount = Math.round(stoledPersont * Math.sqrt(amount) * (0.5 + Math.random()));
                if (stoleAmount) get[attr] = stoleAmount;
            }
            if (getLength(get) > 0) this.changeItem(get, box, true);
            return get;
        }
    },
    //TimeManager
    // 判断某时刻是否属于夜晚（22:00~次日2:00）
    isInNight: function (time) {
        return (time < NIGHT_END || time > NIGHT_BEGIN);
    },
    // 统计一段时间内处于夜晚的小时数（有界循环：最多 1000 个 0.1 小时步进，
    // 并容忍旧存档里 time.hour 为空/非数字的情况，避免 while(1) 挂起）
    getTimeInNight: function (from, to) {
        var timeInNight = 0;
        if (typeof from !== 'number' || typeof to !== 'number' || !isFinite(from) || !isFinite(to) || to <= from) {
            return 0;
        }
        var duration = to - from;
        var steps = Math.ceil(duration / 0.1);
        if (steps > 1000) steps = 1000;
        for (var i = 0; i < steps; i++) {
            if (this.isInNight((from + i * 0.1) % 24)) timeInNight += 0.1;
        }
        return timeInNight;
    },
    // 死亡处理：显示死因，并提供读档 / 重新开始
    handleDeath: function (type) {
        var reason = '';
        switch (type) {
            case 'frozen':
                reason = '体温过低';
                break;
            case 'hunger':
                reason = '满腹耗尽';
                break;
            case 'thirsty':
                reason = '水分耗尽';
                break;
            case 'health':
                reason = '生命耗尽';
                break;
        }
        var desc = (
            <div style={{ margin: 100 }}>
                <p>你已死亡。</p>
                <p>死因：{reason}。</p>
                <p>读档会载入最近一次自动存档（出门时自动保存），并损失 {fmtNum(10)}% 金币；战斗中或地牢中无法读档。也可以选择「重新开始」。</p>
                <BtnComponent handleClick={this.reviveFromAutoSave.bind(this)}>读档（自动存档）</BtnComponent>
                <BtnComponent handleClick={this.init}>重新开始</BtnComponent>
            </div>
        )
        this.setState({
            menuDesc: desc,
            showMenu: 'custom',
        });
    },
    // 读档限制：战斗中/地牢中禁止读档（返回空字符串表示允许）
    canLoadSave: function () {
        if (getLength(this.state.mstState) != 0) return '无法读档：战斗中不能读档，请先结束战斗。';
        if (this.state.currentScene == 'dungeon') return '无法读档：地牢中不能读档，请先返回地面（使用回城卷轴或离开地牢）。';
        return '';
    },
    // 死亡惩罚：从背包+大箱子扣除 10% 金币，返回实际损失数量
    applyDeathPenalty: function () {
        var boxSaveData = this.state.boxSaveData;
        var bagGold = boxSaveData.bag.things.gold || 0;
        var bigBoxGold = boxSaveData.bigBox.things.gold || 0;
        var loss = Math.ceil((bagGold + bigBoxGold) * 0.1);
        if (loss <= 0) return 0;
        var fromBag = Math.min(loss, bagGold);
        if (fromBag > 0) this.useItem(o('gold', fromBag), 'bag');
        var fromBigBox = loss - fromBag;
        if (fromBigBox > 0) this.useItem(o('gold', fromBigBox), 'bigBox');
        return loss;
    },
    // 死亡后读档：载入最近一次自动存档（local slot 0），并施以金币惩罚
    reviveFromAutoSave: function () {
        var reason = this.canLoadSave();
        if (reason) {
            alert(reason);
            return;
        }
        var saves = this.getLocalSaves();
        var save = saves[LOCAL_SAVE_AUTO_SLOT];
        if (!save || !save.data) {
            alert('无法读档：没有可用的自动存档。自动存档只在出门时生成；可先选择「重新开始」，之后出门会自动保存。');
            return;
        }
        this.setState({ saveData: save.data });
        var self = this;
        this.loadData(save.data, function () {
            var lost = self.applyDeathPenalty();
            self.setState({ showMenu: '', menuDesc: {} });
            self.showMsg(<p key='revived'>已从自动存档恢复：损失了 {fmtMoney(lost)}（金币保留 {fmtNum(90)}%）。</p>);
        });
    },
    // 检查六维状态是否归零并触发相应死亡（RELEASE 模式才生效；一次只报一种死因）
    checkDeath: function () {
        if (MODE == 'DEBUG') return false;
        var playerState = (this.state.playerState);
        if (playerState.hp.amount <= 0) {
            if (playerState.ps.amount == 0 && (this.getTempDesc() == 'cold' || this.getTempDesc() == 'veryCold')) {
                this.handleDeath('frozen');
            } else {
                this.handleDeath('health');
            }
            return true;
        }
        if (playerState.full.amount <= 0) {
            this.handleDeath('hunger');
            return true;
        }
        if (playerState.moist.amount <= 0) {
            this.handleDeath('thirsty');
            return true;
        }
        return false;
    },
    // 推进游戏时间：处理昼夜、体温变化、满腹/水分、精神、冷却、生产、死亡判定等
    addTime: function (timeNeed, props) {

        var skill = this.state.skill;
        var manageLevel = (skill.manage || 0) * SKILL_DATA.manage.buff;

        var season = this.state.season;
        var currentEquip = this.state.currentEquip;

        var now = this.state.time.hour;
        var to = now + timeNeed;
        var timeInNight = this.getTimeInNight(now, to);
        now += timeNeed;
        var day = this.state.time.day;
        while (now >= 24) {
            now = now - 24;
            day += 1;
            // 用"新的一天"做跨日结算：季节/商队/盗贼都按新 day 计算
            this.handleDayOver(day);
        }
        // 跨日后季节可能已变化，后续生产逻辑使用最新季节
        season = this.state.season;
        var playerState = clone(this.state.playerState);

        //装备
        var tempDownBuff = [];
        var tempUpBuff = [];
        var tempBuff = 0;
        for (var attr in currentEquip) {
            if (currentEquip[attr]) {
                //体温变化修正
                tempBuff += ITEM_DATA[currentEquip[attr]].tempBuff || 0;
                if (ITEM_DATA[currentEquip[attr]].tempDownMul) tempDownBuff.push(ITEM_DATA[currentEquip[attr]].tempDownMul);
                if (ITEM_DATA[currentEquip[attr]].tempUpMul) tempUpBuff.push(ITEM_DATA[currentEquip[attr]].tempUpMul);

                //恢复累物品
                var rec = currentEquip[attr] && ITEM_DATA[currentEquip[attr]].rec;
                if (rec) {
                    for (var attr in rec) {
                        playerState[attr].amount += timeNeed * rec[attr];
                        var max = this.getMaxState(attr);
                        if (playerState[attr].amount > max) playerState[attr].amount = max;
                    }
                }

            }
        }

        //set temperature
        var tempMul = 2;
        var temp = (props && props.temp) || this.getEnveronmentTemperature(day);

        temp += tempBuff;
        if (PLACE_DATA[this.state.currentScene] && PLACE_DATA[this.state.currentScene].temp) temp += PLACE_DATA[this.state.currentScene].temp;
        // P7：在家里时室内温度向 0（舒适）方向收敛，冬季不再完全没有可做的室内活动
        if (this.state.currentScene == 'home') temp = temp * INDOOR_TEMP_FACTOR;
        var playerTemp = this.state.playerState['temp'].amount;
        var tempChange = (temp > playerTemp) ? timeNeed : -timeNeed;
        tempChange = tempChange * tempMul;


        var oldPlayerTemp = playerTemp;

        //建筑影响
        // if(this.state.currentScene == 'home' && this.state.buildingSaveData.)

        if (tempChange < 0) {
            for (var i = tempDownBuff.length - 1; i >= 0; i--) {
                tempChange *= tempDownBuff[i];
            };
        }
        if (tempChange > 0) {
            for (var i = tempUpBuff.length - 1; i >= 0; i--) {
                tempChange *= tempUpBuff[i];
            };
        }


        // 体温向环境靠拢（原代码把同一段修正复制了两遍，现合并为一次完整变化）
        playerState.temp.amount += tempChange;

        //防止矫枉过正
        if ((tempChange > 0) == (playerState.temp.amount > temp)) playerState.temp.amount = temp;

        //set temp influences
        if (playerState.temp.amount < -20) {
            playerState.ps.amount -= Math.ceil(timeNeed * (-20 - playerState.temp.amount) / 10);
        }
        if (playerState.ps.amount < 0) {
            playerState.hp.amount += playerState.ps.amount;
            playerState.ps.amount = 0;
        }
        if (playerState.temp.amount > 20) {
            playerState.moist.amount -= Math.ceil(timeNeed * (playerState.temp.amount - 20) / 10);
        }

        //set full and moist
        playerState.full.amount -= FULL_DESC_PER_HOUR * timeNeed;
        playerState.moist.amount -= MOIST_DESC_PER_HOUR * timeNeed;
        //set san dec
        if (this.state.currentScene != 'home') {
            playerState.san.amount -= SAN_DESC_PER_HOUR * timeInNight;
        }
        var stateCurrentSum = 0;
        var stateSum = 0;
        for (var attr in playerState) {
            var max = this.getMaxState(attr);
            if (attr == 'temp') {
                stateCurrentSum += max - 2 * Math.abs(playerState.temp.amount)
            } else {
                stateCurrentSum += playerState[attr].amount;
            }
            stateSum += max;
        }

        var totalState = stateCurrentSum / stateSum;
        var sanMax = this.getMaxState('san');
        // 精神恢复/下降按实际经过的时间缩放（原实现每次 addTime 都按固定量变化）
        var sanDelta = (totalState - 0.7) * sanMax / MAX_STATE * timeNeed;
        if (sanDelta > sanMax) sanDelta = sanMax;
        if (sanDelta < -sanMax) sanDelta = -sanMax;
        playerState.san.amount += sanDelta;
        playerState.san.amount = playerState.san.amount > sanMax ? sanMax : playerState.san.amount;
        playerState.san.amount = playerState.san.amount < 0 ? 0 : playerState.san.amount;
        //set cool down
        var coolDown = this.state.coolDownSaveData;
        for (var attr in coolDown) {
            coolDown[attr] -= timeNeed;
            coolDown[attr] = coolDown[attr] > 0 ? coolDown[attr] : 0;
        }
        //set date hour
        this.setState({
            time: { day: day, hour: now },
            coolDownSaveData: coolDown,
        });
        //set duel people
        var trade = this.state.tradeSaveData;
        for (var i = 0; i < trade.length; i++) {
            trade[i].time -= timeNeed;
            if (trade[i].time < 0) {
                trade.splice(i, 1);
            }
        }
        this.setState({ tradeSaveData: trade });
        //set wait make buildings
        var buildingSaveData = this.state.buildingSaveData;
        function addToAll(building) {
            var list = buildingSaveData[building].list;
            var map = {
                'farm': CROP_DATA,
                'alco': ALCO_DATA,
            }
            var attachData = map[building];
            if (season == 'winter' && (building == 'alco' || building == 'farm')) return false;

            for (var i = list.length - 1; i >= 0; i--) {
                //生产
                list[i].timeNow += timeNeed;

                //春季产出翻倍
                if (season == 'spring' && (building == 'farm')) list[i].timeNow += timeNeed;

                //成熟提醒
                var timeMax = attachData[list[i].type].timeMax / (1 + manageLevel);
                if (list[i].timeNow > timeMax) {
                    buildingSaveData[building].hint = true;
                }
            };
        }
        addToAll.bind(this, 'farm')();
        addToAll.bind(this, 'alco')();
        this.setState({ buildingSaveData: buildingSaveData });
        //finally setState
        this.setState({ playerState: playerState });

        //检查死亡
        this.checkDeath();
        return true;
    },
    // 增减玩家状态（生命/体力/精神/满腹/水分/温度），按上限夹取并检查死亡
    playerStateChange: function (list, isNegative) {
        var o = this.state.playerState;
        for (var attr in list) {
            var stateName = attr, amount = list[attr];
            if (o[stateName] == undefined) continue;
            o[stateName].amount += isNegative ? -amount : amount;
            var max = this.getMaxState(stateName);
            (o[stateName].amount > max) ? o[stateName].amount = max : null;
        }
        if (o.san.amount < 0) o.san.amount = 0;
        this.setState({ playerState: o });
        //检查死亡
        this.checkDeath();
    },
    // 消耗玩家状态并同步扣减装备耐久
    playerStateUse: function (list, isNegative) {
        this.playerStateChange(list, !(isNegative || false));
        this.durableChange(list);
    },
    // 计算物品最大耐久（受锻造类科技提升）
    getMaxDurable: function (item) {
        var durable = ITEM_DATA[item].durable;
        var weaponType = ITEM_DATA[item].weaponType;
        var level = weaponType == 'melee' ? this.getScienceLevel('锻造技术') : this.getScienceLevel('魔法锻造技术');
        return Math.round(durable * (1 + level * 0.25));
    },
    // 消耗耐久时解析实际要磨损的键：优先"已装备的同 base 实例"，其次任意同 base 实例，
    // 最后退回基础记录（旧非实例化 / stackable 物品）。返回 null 表示不是耐久物品。
    resolveDurableItem: function (baseId) {
        var o = this.state.durableSaveData;
        var currentEquip = this.state.currentEquip;
        var itemInstances = this.state.itemInstances;
        for (var slot in currentEquip) {
            var equipped = currentEquip[slot];
            if (equipped && itemInstances[equipped] == baseId && o[equipped] !== undefined) return equipped;
        }
        for (var instanceKey in itemInstances) {
            if (itemInstances[instanceKey] == baseId && o[instanceKey] !== undefined) return instanceKey;
        }
        if (o[baseId] !== undefined) return baseId;
        return null;
    },
    // 结算耐久损耗（普通实例扣对应份；stackable 物品按耐久数组逐份处理）
    durableChange: function (list, isNegative) {
        var o = this.state.durableSaveData;
        var currentEquip = this.state.currentEquip;
        var boxSaveData = this.state.boxSaveData;
        var itemInstances = this.state.itemInstances;
        for (var attr in list) {
            var itemName = this.resolveDurableItem(attr), amount = list[attr];
            // 没有实例也没有基础记录：该 requirement 不是耐久物品，跳过
            if (itemName == null || o[itemName] == undefined) continue;
            // stackable 耐久物品：耐久为数组（每份一份），只占一个格子
            if (Array.isArray(o[itemName])) {
                var arr = o[itemName];
                if (arr.length === 0) { delete o[itemName]; continue; }
                // 取损耗最小的一份来承受本次损耗
                var idx = 0;
                for (var i = 1; i < arr.length; i++) { if (arr[i] < arr[idx]) idx = i; }
                arr[idx] += isNegative ? -amount : amount;
                if (arr[idx] >= this.getMaxDurable(itemName)) {
                    var brokenStackName = fmtItemName(itemName);
                    arr.splice(idx, 1);
                    for (var b0 in boxSaveData) {
                        if (boxSaveData[b0].things && boxSaveData[b0].things[itemName]) {
                            boxSaveData[b0].things[itemName] -= 1;
                            if (boxSaveData[b0].things[itemName] <= 0) delete boxSaveData[b0].things[itemName];
                            break;
                        }
                    }
                    this.showMsg(<p key='durableBrokenStack'>耐久耗尽：{brokenStackName} 已损坏；可在制造台重新制作。</p>);
                }
                if (arr.length === 0) delete o[itemName];
                continue;
            }
            o[itemName] += isNegative ? -amount : amount;
            if (o[itemName] >= this.getMaxDurable(itemName)) {
                if (itemName.indexOf('#') >= 0) {
                    var brokenInstanceName = fmtItemName(itemName);
                    // 实例化武器/工具损坏：从装备槽/任意容器中移除该实例并清理
                    for (var slot in currentEquip) {
                        if (currentEquip[slot] == itemName) currentEquip[slot] = null;
                    }
                    for (var b in boxSaveData) {
                        if (boxSaveData[b].things && boxSaveData[b].things[itemName]) {
                            delete boxSaveData[b].things[itemName];
                            break;
                        }
                    }
                    delete o[itemName];
                    delete ITEM_DATA[itemName];
                    delete itemInstances[itemName];
                    this.showMsg(<p key='durableBrokenInstance'>耐久耗尽：{brokenInstanceName} 已损坏；可在制造台重新制作。</p>);
                } else {
                    // 兼容旧的非实例化武器
                    o[itemName] = 0;
                    var use = {}; use[itemName] = 1;
                    this.useItem(use, 'bag');
                    this.showMsg(<p key='durableBrokenBase'>耐久耗尽：{fmtItemName(itemName)} 已损坏；可在制造台重新制作。</p>);
                }
            }
        }
        this.setState({ durableSaveData: o, currentEquip: currentEquip, boxSaveData: boxSaveData, itemInstances: itemInstances });
    },
    // 把体温数值映射为冷热档位（veryCold~veryHot）
    getTempDesc: function () {
        var playerState = this.state.playerState;
        var state = playerState.temp;
        if (state.amount > 30) return 'veryHot';
        if (state.amount > 20) return 'hot';
        if (state.amount > 10) return 'warm';
        if (state.amount > 0) return 'nice';
        if (state.amount > -10) return 'nice';
        if (state.amount > -20) return 'cool';
        if (state.amount > -30) return 'cold';
        return 'veryCold';
    },
    // 执行一个耗时动作：播放进度动画，结束后回调并推进游戏时间
    useTime: function (callBack, timeNeed, props) {
        if (timeNeed == 0) {
            callBack();
            return;
        }
        var delay = timeNeed * DELAY_MUL;
        if (delay > 5000) {
            // 超长动作的进度动画用 log2 压缩，并限制上限，避免玩家长时间空等
            delay = 5000 + Math.log(delay - 5000) / Math.LN2;
            if (delay > 10000) delay = 10000;
        }
        var min = MIX_DELAY;
        delay = delay > min ? delay : min;
        var miskChangeTime = ((delay * 0.25) < (min * 0.4)) ? (delay * 0.25) : (min * 0.4);
        this.setMisk(miskChangeTime);

        var doCallBack = function () {
            callBack();
            this.clearMisk(miskChangeTime);
            this.addTime(timeNeed, props);
        }.bind(this);
        if (delay >= 500) {
            this.setProgress(delay, doCallBack);
        } else {
            setTimeout(doCallBack, delay);
        }
    },
    // 播放顶部进度条动画，结束后回调
    setProgress: function (delay, callBack) {
        var progress = 0;
        var foo = bindAnimation(
            function (step) {
                progress += step / delay;
                this.setState({ progress: progress });
                if (progress >= 1) {
                    callBack();
                    this.setState({ progress: 0 });
                } else {
                    requestAnimationFrame(foo);
                }
            }.bind(this)
        )()
        requestAnimationFrame(foo);
    },
    // 渐显遮罩（misk）
    setMisk: function (delay) {
        var step = 100;
        var misk = 0;
        var foo = bindAnimation(
            function (step) {
                misk += step / delay;
                this.setState({ misk: misk });
                if (misk >= 1) {
                    this.setState({ misk: 1 })
                } else {
                    requestAnimationFrame(foo);
                }
            }.bind(this)
        )()
        requestAnimationFrame(foo);
    },
    // 渐隐遮罩（misk）
    clearMisk: function (delay) {
        var step = 100;
        var misk = 1;
        var foo = bindAnimation(
            function (step) {
                misk -= step / delay;
                this.setState({ misk: misk });
                if (misk <= 0) {
                    this.setState({ misk: 0 })
                } else {
                    requestAnimationFrame(foo);
                }
            }.bind(this)
        )()
        requestAnimationFrame(foo);
    },
    // 检查某种资源是否足够（兼容 baseId 实例，并计入装备栏与玩家状态值）
    checkHaveResource: function (resName, resAmount, bag) {
        // check form bagData to stateData
        // 多用型的检查（按 baseId 统计，兼容实例化武器/工具，并计入装备栏）
        var state = this.state.playerState;
        var total = countBagItem(bag, resName);
        for (var slot in this.state.currentEquip) {
            var eq = this.state.currentEquip[slot];
            if (eq && itemBaseId(eq) == resName) total++;
        }
        if (total >= resAmount) return true;
        if (state[resName] && state[resName].amount >= resAmount) return true;
        return false;
    },
    // 检查是否满足一组资源需求；haveBox 为真时把大箱子一并计入
    checkHaveResourceAll: function (resList, haveBox) {
        var flag = true;

        //获得背包与大箱子的所有资源
        if (haveBox) {
            var bag = together(this.state.boxSaveData.bag.things, this.state.boxSaveData.bigBox.things);
        } else {
            var bag = clone(this.state.boxSaveData.bag.things);
        }

        for (var attr in resList) {
            flag = flag && this.checkHaveResource(attr, resList[attr], bag);
        };
        return flag;
    },
    // 设置右侧详情面板要显示的内容（物品/状态/描述）
    changeMsg: function (name, type) {
        if (type == 'desc') {
            this.setState({ detailedList: name, detailedType: type });
        } else {
            this.setState({ detailedItem: name, detailedType: type });
        }
    },
    preventDefault: function (event) {
        event.preventDefault();
    },
    render: function () {
        return <div className="main clearFix" onContextMenu={this.preventDefault} onSelect={this.preventDefault}>
            <MenuComponent type={this.state.showMenu} />
            <AdvanComponent misk={this.state.misk} progress={this.state.progress}>{this.state.wind}</AdvanComponent>
            <BagComponent items={this.state.boxSaveData.bag.things} size={this.state.boxSaveData.bag.size} />

        </div>;
    },
    componentWillMount: function () {
        if (this.state.saveData == null) {
            this.init();
        }
    },
    // 用初始状态重置全局状态
    init: function () {
        var initState = this.getInitialState();
        this.setState(initState);
    },
    setVolume: function (argument) {
        this.AudioEngine.on = !this.AudioEngine.on;
        render();
    },
    // 把存档对象规整成当前版本可用的结构：缺失字段用初始值兜底，
    // 非法数值回退到安全值，避免旧档/损坏档把游戏卡死。
    normalizeSaveData: function (data) {
        if (!data || typeof data !== 'object' || getLength(data) === 0) {
            throw new Error('empty save data');
        }
        var d = clone(data);
        var defaults = this.getInitialState();
        // 时间：旧档/坏档里 hour 可能是 null 或字符串，getTimeInNight 等逻辑依赖数字
        if (!d.time || typeof d.time !== 'object') d.time = clone(defaults.time);
        var day = Number(d.time.day);
        var hour = Number(d.time.hour);
        if (d.time.day === null || d.time.day === undefined || d.time.day === '') day = 1;
        if (d.time.hour === null || d.time.hour === undefined || d.time.hour === '') hour = 6;
        if (!isFinite(day) || day < 1) day = 1;
        if (!isFinite(hour) || hour < 0 || hour >= 24) hour = 6;
        d.time = { day: Math.floor(day), hour: hour };
        // 地牢
        if (!d.dungeonSaveData || typeof d.dungeonSaveData !== 'object') d.dungeonSaveData = clone(defaults.dungeonSaveData);
        if (!d.dungeonSaveData.stairData || typeof d.dungeonSaveData.stairData !== 'object') d.dungeonSaveData.stairData = {};
        d.dungeonSaveData.stairCount = Math.max(1, parseInt(d.dungeonSaveData.stairCount, 10) || 1);
        d.dungeonSaveData.roomCount = Math.max(1, parseInt(d.dungeonSaveData.roomCount, 10) || 1);
        d.dungeonSaveData.deepest = Math.max(1, parseInt(d.dungeonSaveData.deepest, 10) || 1);
        // 对象型字段：缺失或类型不对时用初始值
        var objectFields = ['boxSaveData', 'buildingSaveData', 'campSaveData', 'coolDownSaveData', 'currentEquip', 'durableSaveData', 'eventSaveData', 'itemInstances', 'placeSaveData', 'playerState', 'robberSaveData', 'skill'];
        for (var i = 0; i < objectFields.length; i++) {
            var objKey = objectFields[i];
            if (!d[objKey] || typeof d[objKey] !== 'object' || d[objKey] instanceof Array) d[objKey] = clone(defaults[objKey]);
        }
        if (!d.tradeSaveData || !(d.tradeSaveData instanceof Array)) d.tradeSaveData = [];
        // 玩家六维逐项兜底
        for (var stateName in defaults.playerState) {
            if (!d.playerState[stateName] || typeof d.playerState[stateName] !== 'object') d.playerState[stateName] = clone(defaults.playerState[stateName]);
            var amount = Number(d.playerState[stateName].amount);
            if (!isFinite(amount)) amount = defaults.playerState[stateName].amount;
            d.playerState[stateName].amount = amount;
        }
        // 容器：补齐缺失容器 / things / size
        for (var boxName in BOX_INIT) {
            if (!d.boxSaveData[boxName] || typeof d.boxSaveData[boxName] !== 'object') {
                d.boxSaveData[boxName] = clone(BOX_INIT[boxName]);
                continue;
            }
            if (!d.boxSaveData[boxName].things || typeof d.boxSaveData[boxName].things !== 'object') d.boxSaveData[boxName].things = {};
            if (typeof d.boxSaveData[boxName].size !== 'number') d.boxSaveData[boxName].size = BOX_INIT[boxName].size || 1;
        }
        for (var buildingName in BUILDING_INIT) {
            if (!d.buildingSaveData[buildingName] || typeof d.buildingSaveData[buildingName] !== 'object') {
                d.buildingSaveData[buildingName] = clone(BUILDING_INIT[buildingName]);
            }
        }
        if (typeof d.generation !== 'number' || !isFinite(d.generation)) d.generation = 0;
        if (typeof d.maouLevel !== 'number' || !isFinite(d.maouLevel)) d.maouLevel = 0;
        if (d.season !== 'spring' && d.season !== 'summer' && d.season !== 'autumn' && d.season !== 'winter') d.season = defaults.season;
        if (d.startSeason !== 'spring' && d.startSeason !== 'autumn') d.startSeason = defaults.startSeason;
        if (!d.settings || typeof d.settings !== 'object') d.settings = {};
        d.schemaVersion = (typeof d.schemaVersion === 'number' && isFinite(d.schemaVersion)) ? d.schemaVersion : 1;
        return d;
    },
    // 读档：重置临时界面状态并对缺失字段做兼容处理
    loadState: function (data) {
        try {
            data = this.normalizeSaveData(data);
        } catch (e) {
            console.error('[game] 读档失败：', e);
            this.setState({ currentScene: 'home', showMenu: '' });
            this.showMsg(<p key='loadFail'>读档失败：存档格式不兼容（可能来自更旧或损坏的版本）；已保留当前进度，可尝试其他存档槽或重新开始。</p>);
            return false;
        }
        var currentSettings = this.state.settings || {};
        try {
        this.setState({ currentScene: 'home' });
        //对存档的预处理（UI-only 字段不落盘，旧档里若有也在这里丢弃）
        data.misk = 0;
        data.progress = 0;
        data.wind = null;
        data.detailedItem = '';
        data.detailedType = '';
        data.detailedList = [];
        data.currentBox = '';
        data.msgList = [];
        data.menuDesc = {};

        // 旧档技能迁移：训练师可提升的普通技能 clamp 到 data.js 的 TRAINER_MAX_LEVEL，
        // 天赋（isTalent）保持原等级不作上限处理。
        var skillMaxLevel = (typeof TRAINER_MAX_LEVEL === 'number') ? TRAINER_MAX_LEVEL : 30;
        for (var skillKey in data.skill) {
            var skillInfo = SKILL_DATA[skillKey];
            if (!skillInfo || skillInfo.isTalent) continue;
            var skillLevel = Number(data.skill[skillKey]);
            if (!isFinite(skillLevel) || skillLevel < 0) skillLevel = 0;
            if (skillLevel > skillMaxLevel) skillLevel = skillMaxLevel;
            data.skill[skillKey] = Math.floor(skillLevel);
        }

        if (!data.generation) {
            data.generation = 0;
        }
        if (!data.maouLevel) {
            data.maouLevel = 0;
        }
        if (!data.robberSaveData) {
            data.robberSaveData = ROBBER_INIT;
        }
        if (data.dungeonSaveData.stairData == undefined) {
            data.dungeonSaveData.stairData = {};
        }
        //补丁
        for (var attr in BOX_INIT) {
            if (!data.boxSaveData[attr]) {
                data.boxSaveData[attr] = clone(BOX_INIT[attr]);
            }
        }
        // 兼容旧存档：旧版本装备后物品仍留在背包中；这里把已装备物品从背包扣除一次，
        // 使装备不再占用背包格子（仅对旧结构存档执行），并补齐新增的装备槽位。
        if (data.currentEquip) {
            var isOldEquipSchema = (data.currentEquip.weapon1 === undefined && data.currentEquip.weapon2 === undefined && data.currentEquip.neck === undefined);
            if (isOldEquipSchema) {
                for (var eqSlot in data.currentEquip) {
                    var eqItem = data.currentEquip[eqSlot];
                    if (eqItem && data.boxSaveData.bag.things[eqItem]) {
                        data.boxSaveData.bag.things[eqItem] -= 1;
                        if (data.boxSaveData.bag.things[eqItem] <= 0) delete data.boxSaveData.bag.things[eqItem];
                    }
                }
            }
            var equipSlotList = ['head', 'body', 'foot', 'neck', 'hand', 'weapon1', 'weapon2'];
            for (var es = 0; es < equipSlotList.length; es++) {
                if (data.currentEquip[equipSlotList[es]] === undefined) data.currentEquip[equipSlotList[es]] = null;
            }
        }
        // 耐久类武器/工具实例化：同名武器各自独立耐久、不堆叠。
        // - 旧存档里以 baseId 堆叠的耐久物品，拆分为实例；
        // - 已有实例键在读档时重新注册动态 ITEM_DATA 条目；
        // - 首次迁移时把所有已拥有武器/工具耐久刷新为满（durableRefreshed 标记，只执行一次）。
        if (!data.durableSaveData) data.durableSaveData = {};
        if (!data.itemInstances) data.itemInstances = {};
        var refreshDurability = !data.durableRefreshed;
        for (var boxName in data.boxSaveData) {
            var thingsBox = data.boxSaveData[boxName].things;
            if (!thingsBox) continue;
            var boxKeys = [];
            for (var tk0 in thingsBox) boxKeys.push(tk0);
            for (var ki = 0; ki < boxKeys.length; ki++) {
                var tk = boxKeys[ki];
                if (thingsBox[tk] === undefined) continue;
                var tkCount = thingsBox[tk];
                if (tk.indexOf('#') >= 0) {
                    var base = data.itemInstances[tk] || tk.split('#')[0];
                    if (ITEM_DATA[base] && ITEM_DATA[base].stackable) {
                        // stackable：实例并入同一格堆叠（耐久存入数组）
                        thingsBox[base] = (thingsBox[base] || 0) + tkCount;
                        var arrSt = Array.isArray(data.durableSaveData[base]) ? data.durableSaveData[base] : [];
                        for (var z = 0; z < tkCount; z++)arrSt.push(data.durableSaveData[tk] || 0);
                        data.durableSaveData[base] = arrSt;
                        delete thingsBox[tk];
                        delete data.durableSaveData[tk];
                        delete data.itemInstances[tk];
                        delete ITEM_DATA[tk];
                        continue;
                    }
                    // 已有实例：注册动态 ITEM_DATA
                    if (ITEM_DATA[base] && !ITEM_DATA[tk]) {
                        var inst = clone(ITEM_DATA[base]);
                        inst.baseId = base; inst.isInstance = true; inst.instanceId = tk;
                        ITEM_DATA[tk] = inst;
                    }
                    data.itemInstances[tk] = base;
                    if (data.durableSaveData[tk] === undefined) data.durableSaveData[tk] = 0;
                } else if (ITEM_DATA[tk] && ITEM_DATA[tk].durable) {
                    if (ITEM_DATA[tk].stackable) {
                        // stackable：保持堆叠，耐久为数组（长度=数量）
                        var arr1 = Array.isArray(data.durableSaveData[tk]) ? data.durableSaveData[tk] : [];
                        while (arr1.length < tkCount) arr1.push(0);
                        arr1.length = tkCount;
                        data.durableSaveData[tk] = arr1;
                    } else {
                        // 旧堆叠 -> 拆分为实例
                        delete thingsBox[tk];
                        for (var ci = 0; ci < tkCount; ci++) {
                            var ikey;
                            do { ikey = tk + '#' + (this.instanceSeq++); } while (ITEM_DATA[ikey] || data.itemInstances[ikey]);
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
        if (refreshDurability) {
            for (var instKey in data.itemInstances) {
                data.durableSaveData[instKey] = 0;
            }
            for (var cb in data.durableSaveData) {
                if (Array.isArray(data.durableSaveData[cb])) {
                    for (var ai = 0; ai < data.durableSaveData[cb].length; ai++)data.durableSaveData[cb][ai] = 0;
                }
            }
            data.durableRefreshed = true;
        }
        //新地图资源
        for (var place in PLACE_DATA) {
            if (data.placeSaveData[place] == undefined) {
                data.placeSaveData[place] = clone(PLACE_INIT[place]);
            } else {
                //资源补丁
                for (var attr in PLACE_INIT[place].resource) {
                    if (!data.placeSaveData[place].resource[attr]) {
                        data.placeSaveData[place].resource[attr] = clone(PLACE_INIT[place].resource[attr]);
                    }
                }
                for (var attr in data.placeSaveData[place].resource) {
                    //清除资料片中不存在的资源
                    for (var res in data.placeSaveData[place].resource) {
                        if (PLACE_DATA[place].resource[res] == undefined) {
                            delete data.placeSaveData[place].resource[res];
                        }
                    }
                }
                //怪物补丁
                for (var attr in PLACE_INIT[place].mst) {
                    if (!data.placeSaveData[place].mst[attr]) {
                        data.placeSaveData[place].mst[attr] = clone(PLACE_INIT[place].mst[attr]);
                    }
                }
                for (var attr in data.placeSaveData[place].mst) {
                    //清除资料片中不存在的怪兽
                    for (var mst in data.placeSaveData[place].mst) {
                        if (PLACE_DATA[place].mst[mst] == undefined) {
                            delete data.placeSaveData[place].mst[mst];
                        }
                    }
                }

            }
        }
        for (var attr in ITEM_DATA) {
            if (ITEM_DATA[attr].durable && data.durableSaveData[attr] == undefined) {
                data.durableSaveData[attr] = 0;
            }
        }
        //新事件
        for (var attr in EVENT_INIT) {
            if (EVENT_INIT[attr] != undefined && (data.eventSaveData[attr] == undefined)) {
                data.eventSaveData[attr] = EVENT_INIT[attr];
            }
        }
        // 设置合并：读档不覆盖当前账号/密码，只取回非敏感设置
        var mergedSettings = { sort: false, autoSave: true };
        for (var loadedSetting in (data.settings || {})) {
            if (loadedSetting != 'save_account' && loadedSetting != 'save_pass') mergedSettings[loadedSetting] = data.settings[loadedSetting];
        }
        if (currentSettings.save_account !== undefined) mergedSettings.save_account = currentSettings.save_account;
        if (currentSettings.save_pass !== undefined) mergedSettings.save_pass = currentSettings.save_pass;
        data.settings = mergedSettings;
        // 清理历史存档里已从数据表删除的物品 id：只清普通物品容器，
        // 升级/科技容器里的标记键（bed_1、showerPlace 等）保持不动。
        for (var boxName3 in data.boxSaveData) {
            if (ITEM_ONLY_BOXES.indexOf(boxName3) < 0) continue;
            var things3 = data.boxSaveData[boxName3].things;
            for (var itemKey in things3) {
                if (!ITEM_DATA[itemKey]) delete things3[itemKey];
            }
        }
        for (var eqSlot2 in data.currentEquip) {
            if (data.currentEquip[eqSlot2] && !ITEM_DATA[data.currentEquip[eqSlot2]]) data.currentEquip[eqSlot2] = null;
        }
        for (var dKey in data.durableSaveData) {
            if (!ITEM_DATA[dKey]) delete data.durableSaveData[dKey];
        }
        for (var iKey in data.itemInstances) {
            if (!ITEM_DATA[iKey]) delete data.itemInstances[iKey];
        }
        this.setState(data);
        this.setState({ showMenu: '' });
        this.setState({ currentScene: 'home' });
        var level = this.getScienceLevel('背包属性');
        var boxSaveData = this.state.boxSaveData;
        boxSaveData['bag'].size = BAG_BASE_SIZE + level;
        this.setState({ boxSaveData: boxSaveData });
        return true;
        } catch (e) {
            console.error('[game] 读档失败：', e);
            this.setState({ currentScene: 'home', showMenu: '' });
            this.showMsg(<p key='loadFail2'>读档失败：存档数据异常；已保留当前进度，可尝试其他存档槽或重新开始。</p>);
            return false;
        }
    },
    // 载入存档（先切场景过渡，再解析并 loadState）。input 可以是 JSON 字符串或对象；
    // callback 在 loadState 成功后执行（用于死亡读档后的惩罚/收尾）。
    loadData: function (input, callback) {
        var data;
        try {
            data = (typeof input === 'string') ? JSON.parse(input) : clone(input);
        } catch (e) {
            console.error('[game] 存档解析失败：', e);
            this.setState({ currentScene: 'home', showMenu: '' });
            this.showMsg(<p key='loadParseFail'>读档失败：存档内容无法解析（文件可能已损坏）；已保留当前进度，可尝试其他存档槽。</p>);
            return false;
        }
        this.setState({ currentScene: 'branch' });
        setTimeout(function () {
            this.setState({ currentScene: 'home' });
            var ok = this.loadState(data);
            if (ok && callback) callback();
        }.bind(this), 100);
        return true;
    },
    // 读取账号存档：向后端查询并载入数据
    download: function () {
        var reason = this.canLoadSave();
        if (reason) {
            alert(reason);
            return;
        }
        var settings = this.state.settings || {};
        var save_account = settings.save_account;
        var save_pass = settings.save_pass;
        if (save_account == null || save_account == '' || save_pass == null || save_pass == '') {
            alert('无法读取账号存档：还没有填写账号或密码。请先打开「菜单 → 设置」填写，再点「读取」。');
            return;
        }
        var jsonStr = 'action=load&account=' + encodeURIComponent(save_account) + '&pass=' + encodeURIComponent(save_pass) + '&data=nope';
        var self = this;
        var htmlobj = $.ajax({
            contentType: "application/x-www-form-urlencoded",
            type: 'POST',
            url: SAVE_URL,
            async: true,
            data: jsonStr,
            success: function () {
                var resp = htmlobj.responseText;
                if (resp == 'no account') {
                    alert('没有这个账号的存档：请确认账号拼写，或先点「保存」创建账号存档（账号存档需要 dev_server 运行）。');
                    return;
                }
                if (resp == 'incorrect pass') {
                    alert('密码错误：请检查密码后重试；忘记密码暂时无法找回，可使用本地存档。');
                    return;
                }
                if (resp == 'invalid') {
                    alert('账号或密码格式不符：账号需 ' + fmtNum(3) + '-' + fmtNum(12) + ' 位、密码至少 ' + fmtNum(3) + ' 位，仅限数字和字母。');
                    return;
                }
                if (resp == 'save corrupted') {
                    alert('存档文件已损坏，无法读取：本次不会覆盖原文件，请联系作者或从备份恢复。');
                    return;
                }
                var data;
                try {
                    data = JSON.parse(resp);
                } catch (e) {
                    console.error('[game] 读档失败，服务器返回内容不是 JSON：', resp);
                    alert('读取失败：服务器返回的数据不是合法存档（可能已损坏）；请重试，或改用本地存档。');
                    return;
                }
                alert('账号存档已读取（已覆盖当前进度）。本地存档与自动存档可在「设置」页读取。');
                self.setState({ saveData: resp });
                self.loadData(data);
            },
            error: function (xhr, status) {
                var msg = (status == 'timeout') ? '请求超时' : '无法连接存档服务器';
                alert('读取失败：' + msg + '；请确认 python3 dev_server.py 正在运行，并检查端口/地址后重试。');
            }
        });
    },
    // 构造落盘存档对象：只包含白名单内的游戏字段 + 非敏感设置
    getSaveData: function () {
        var state = this.state;
        var data = { schemaVersion: SAVE_SCHEMA_VERSION };
        for (var i = 0; i < SAVE_FIELDS.length; i++) {
            var fieldKey = SAVE_FIELDS[i];
            if (state[fieldKey] !== undefined) data[fieldKey] = clone(state[fieldKey]);
        }
        var settings = {};
        for (var j = 0; j < SAVE_SETTING_FIELDS.length; j++) {
            var settingKey = SAVE_SETTING_FIELDS[j];
            if (state.settings && state.settings[settingKey] !== undefined) settings[settingKey] = state.settings[settingKey];
        }
        data.settings = settings;
        return data;
    },
    // 保存账号存档到后端（需填写账号/密码）；callback(ok, reason) 用于回显结果
    upload: function (doNotShow, callback) {
        var settings = this.state.settings || {};
        var save_account = settings.save_account;
        var save_pass = settings.save_pass;
        if (save_account == null || save_account == '') {
            callback && callback(false, '未填写账号：请先在设置页填写账号（账号存档需要 dev_server 运行）。');
            return;
        }
        if (save_pass == null || save_pass == '') {
            callback && callback(false, '未填写密码：请先在设置页填写密码。');
            return;
        }
        var saveData;
        try {
            saveData = this.getSaveData();
        } catch (e) {
            console.error('[game] 构造存档失败：', e);
            callback && callback(false, '存档数据异常：请重试；若仍失败，可先用本地存档保存。');
            return;
        }
        var day = saveData.time.day;
        var g = saveData.generation;
        var jsonStr = 'action=save&account=' + encodeURIComponent(save_account) +
            '&pass=' + encodeURIComponent(save_pass) +
            '&data=' + encodeURIComponent(JSON.stringify(saveData)) +
            '&day=' + encodeURIComponent(String(day)) +
            '&g=' + encodeURIComponent(String(g));
        var htmlobj = $.ajax({
            contentType: "application/x-www-form-urlencoded",
            type: 'POST',
            url: SAVE_URL,
            async: true,
            data: jsonStr,
            success: function () {
                var resp = htmlobj.responseText;
                if (resp == 'success') {
                    if (!doNotShow) alert('账号存档已保存：第 ' + fmtNum(day) + ' 日。本地存档/自动存档仍可另存。');
                    callback && callback(true);
                    return;
                }
                if (resp == 'incorrect pass') {
                    if (!doNotShow) alert('密码错误：请检查密码后重试；忘记密码暂时无法找回，可使用本地存档。');
                    callback && callback(false, '密码错误：请检查密码后重试；忘记密码可使用本地存档。');
                    return;
                }
                if (resp == 'invalid') {
                    var invalidMsg = '账号或密码格式不符：账号需 ' + fmtNum(3) + '-' + fmtNum(12) + ' 位、密码至少 ' + fmtNum(3) + ' 位，仅限数字和字母。';
                    if (!doNotShow) alert(invalidMsg);
                    callback && callback(false, '账号或密码格式不符：账号需 ' + fmtNum(3) + '-' + fmtNum(12) + ' 位、密码至少 ' + fmtNum(3) + ' 位，仅限数字和字母。');
                    return;
                }
                var reason = (resp && resp.indexOf('save failed') == 0) ?
                    (resp + '；请检查 saves/ 目录权限或磁盘空间，或改用本地存档。') :
                    ('服务器返回异常（' + resp + '）；请稍后重试，或改用本地存档。');
                if (!doNotShow) alert('保存失败：' + reason);
                callback && callback(false, reason);
            },
            error: function (xhr, status) {
                var netMsg = (status == 'timeout') ? '请求超时' : '无法连接存档服务器';
                if (!doNotShow) alert('保存失败：' + netMsg + '；请确认 python3 dev_server.py 正在运行，并检查端口/地址后重试。');
                callback && callback(false, netMsg + '；请确认 dev_server 正在运行后重试。');
            }
        });
    },
    // 本地存档在 localStorage 中的键名
    getLocalSaveKey: function (slot) {
        return LOCAL_SAVE_PREFIX + slot;
    },
    // 读取所有本地存档槽的元信息（自动存档槽 0 + 手动槽）
    getLocalSaves: function () {
        //读取所有本地存档槽的元信息（含自动存档槽 0）
        var result = {};
        for (var i = LOCAL_SAVE_AUTO_SLOT; i <= LOCAL_SAVE_SLOTS; i++) {
            var raw = null;
            try {
                raw = localStorage.getItem(this.getLocalSaveKey(i));
            } catch (e) {
                raw = null;
            }
            var save = null;
            if (raw) {
                try {
                    save = JSON.parse(raw);
                } catch (e) {
                    save = null;
                }
            }
            result[i] = save;
        }
        return result;
    },
    // 保存到指定本地槽（只写白名单字段 + 非敏感设置）
    saveLocal: function (slot) {
        var saveData;
        try {
            saveData = this.getSaveData();
        } catch (e) {
            console.error('[game] 构造存档失败：', e);
            alert('本地保存失败：存档数据异常；请重试，或改用账号存档。');
            return false;
        }
        var save = {
            version: SAVE_SCHEMA_VERSION,
            schemaVersion: SAVE_SCHEMA_VERSION,
            savedAt: Date.now(),
            day: saveData.time.day,
            hour: saveData.time.hour,
            season: saveData.season,
            generation: saveData.generation,
            data: JSON.stringify(saveData),
        };
        try {
            localStorage.setItem(this.getLocalSaveKey(slot), JSON.stringify(save));
        } catch (e) {
            alert('本地保存失败：浏览器存储不可用或已满（隐私模式/配额不足）；请清理不需要的存档槽，或改用账号存档。');
            return false;
        }
        if (slot == LOCAL_SAVE_AUTO_SLOT) {
            this.showMsg(<p key='autoSaved'>已自动保存到「自动存档」槽（第 {fmtNum(saveData.time.day)} 日 {fmtNum(Math.floor(saveData.time.hour))}:00）。</p>);
        }
        return true;
    },
    // 从本地槽读取并载入（战斗中/地牢中禁止读档）
    loadLocal: function (slot) {
        var reason = this.canLoadSave();
        if (reason) {
            alert(reason);
            return false;
        }
        var saves = this.getLocalSaves();
        var save = saves[slot];
        if (!save || !save.data) {
            alert('该存档位是空的：请先点「保存」创建存档，或选择其他存档槽。');
            return false;
        }
        this.setState({ saveData: save.data });
        this.loadData(save.data);
        return true;
    },
    // 删除指定本地槽
    deleteLocal: function (slot) {
        try {
            localStorage.removeItem(this.getLocalSaveKey(slot));
        } catch (e) { }
    },
});
