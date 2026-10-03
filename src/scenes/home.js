/**
 * src/scenes/home.js —— 家与地点场景
 * 大箱子、建造、农田/酿酒(WaitMake)、陷阱、炊具(含食谱)、水井、卫生间、床铺、
 * 地点(PlaceComponent)、家(HomeComponent)、分支(BranchComponent)。
 */

// 大箱子：家庭总仓库的管理界面
var BigBoxComponent = React.createClass({
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        getBuildingLevel: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        handleExchange: React.PropTypes.func.isRequired,
        cancelEquip: React.PropTypes.func.isRequired,
        sort: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
        };
    },
    onUpdate: function () {
        var level = this.context.getBuildingLevel('bigBoxUpdate');
        var boxSaveData = this.context.boxSaveData;
        boxSaveData['bigBox'].size = BIG_BOX_BASE_SIZE + level * 4;
        this.context.setStateFromChildren({ boxSaveData: boxSaveData });
    },
    allIn: function () {
        var cancelEquip = this.context.cancelEquip;
        function exchange(name) {
            cancelEquip(name);
            if (bigBox.things[name]) {
                bigBox.things[name] += bag.things[name];
            } else {
                bigBox.things[name] = bag.things[name];
            }
            delete bag.things[name];
        }
        var boxSaveData = clone(this.context.boxSaveData);
        var bigBox = boxSaveData.bigBox;
        var bag = boxSaveData.bag;
        var handleExchange = this.context.handleExchange;

        while (1) {
            if (bigBox.size < getLength(bigBox.things)) break;
            if (bigBox.size == getLength(bigBox.things)) {
                for (var bagAttr in bag.things) {
                    for (var bigBoxAttr in bigBox.things) {
                        if (bagAttr == bigBoxAttr) {
                            exchange(bagAttr);
                        }
                    }
                }
                break;
            } else {
                if (getLength(bag.things) == 0) break;
                for (var attr in bag.things) {
                    exchange(attr);
                    break;
                }
            }
        }
        this.context.setStateFromChildren({ boxSaveData: boxSaveData })
    },
    checkDisabled: function () {
        var boxSaveData = (this.context.boxSaveData);
        if (boxSaveData.bigBox.size <= getLength(boxSaveData.bigBox.things)) {
            var flag = true;
            //有相同物品，则允许合并，全部放入、
            for (var attr in boxSaveData.bigBox.things) {
                for (var attr_2 in boxSaveData.bag.things) {
                    if (attr == attr_2) {
                        flag = false;
                    }
                }
            }
            return flag;
        }
        if (getLength(boxSaveData.bag.things) <= 0) return true;
        return false;
    },
    render: function () {
        var disabled = this.checkDisabled();
        return <div className='bigBoxOuter'>
            <div className='bigBox'>
                <BoxComponent box='bigBox' />
            </div>
            <StudioComponent onUpdate={this.onUpdate} isBuildingUpdate={true} type='bigBoxUpdate' />
            <BtnComponent disabled={disabled} sound='all_in' handleClick={this.allIn} desc='全部放入' />
            <BtnComponent sound='all_in' handleClick={this.context.sort.bind(null, 'bigBox')} desc='整理' />
            <BtnBack />
        </div>
    }
});
// 建造菜单：选择并建造新建筑
var BuildComponent = React.createClass({
    contextTypes: {
        buildingSaveData: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        useTime: React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        getTheMaxTimeToUse: React.PropTypes.func.isRequired,
    },
    build: function (buildingName) {
        var timeNeed = BUILDING_DATA[buildingName].timeNeed;
        var require = BUILDING_DATA[buildingName].require;
        this.context.useItemThatPlayerHave(require);
        function callBack() {
            this.context.buildingSaveData[buildingName].own = true;
            this.context.callWindow(null);
        }
        this.context.useTime(callBack.bind(this), timeNeed);
        if (timeNeed > 2) this.context.AudioEngine.playEffect('build');
    },
    getOwnAndUnOwnNumber: function (list) {
        var countOwn = 0;
        var countUnOwn = 0;
        for (var attr in list) {
            if (list[attr].own) {
                countOwn++;
            } else {
                countUnOwn++;
            }
        };
        return { countOwn: countOwn, countUnOwn: countUnOwn };
    },
    render: function () {
        var buildingList = this.context.buildingSaveData;
        if (this.getOwnAndUnOwnNumber(buildingList).countUnOwn == 0) {
            return <div>
                <p>你已经拥有了所有的建筑。</p>
                <BtnBack />
            </div>
                ;
        }
        var getRow = function () {
            var boxSaveData = this.context.boxSaveData;
            var bag = together(boxSaveData.bag.things, boxSaveData.bigBox.things);
            var entries = [];
            for (var attr in buildingList) {
                var building = buildingList[attr];
                var data = BUILDING_DATA[attr];
                if (data.science && !boxSaveData.scienceTable.things[data.science]) continue;
                if (data.building && !buildingList[data.building].own) continue;
                if (building.own) continue;
                entries.push({ attr: attr, data: data });
            };
            // 按「现有材料可制作的次数」从多到少排序
            entries.sort(function (a, b) {
                return getCraftableCount(b.data.require, bag) - getCraftableCount(a.data.require, bag);
            });
            var maxTimeToUse = this.context.getTheMaxTimeToUse();
            return entries.map(function (entry, count) {
                var attr = entry.attr, data = entry.data;
                return <tr key={count}>
                    <td>{data.name}</td>
                    <td><RequireComponent haveBox={true} requireList={data.require} /></td>
                    <td>{data.desc}</td>
                    <td>{data.timeNeed}</td>
                    <td><BtnComponent desc={'建造'} disabled={maxTimeToUse <= data.timeNeed} disabledReason={'饱食或水分不足，撑不过 ' + data.timeNeed + ' 小时（约剩 ' + Math.round(maxTimeToUse) + ' 小时）'} requireList={data.require} handleClick={this.build.bind(this, attr)} /></td>
                </tr>;
            }.bind(this));
        }
        return <div className='buildWindow'>
            <div className="tableOuter buildTable">
                <table className="table table-condensed table-hover">
                    <thead><tr><td>建筑</td><td>需求</td><td>描述</td><td>耗时</td><td></td></tr></thead>
                    <tbody>
                        {getRow.bind(this)()}
                    </tbody>
                </table>
            </div>
            <BtnBack />
        </div>
    }
})
// 农田/酿酒桶：按扩建等级提供槽位，种植/酿制并可收获或取消
var WaitMakeComponent = React.createClass({
    contextTypes: {
        buildingSaveData: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        checkFull: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        getScienceLevel: React.PropTypes.func.isRequired,
        season: React.PropTypes.string.isRequired,
        skill: React.PropTypes.object.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
    },
    componentWillMount: function () {
        // 农田/酒桶的扩建科技类型使用中文属性名（与「陷阱空间属性」一致）
        var sizeBonusType = this.props.building === 'alco' ? '酒桶属性' : '农田属性';
        var level = this.context.getScienceLevel(sizeBonusType);
        var buildingSaveData = this.context.buildingSaveData;
        buildingSaveData[this.props.building].size = 2 + level;
    },
    getInitialState: function () {
        return {
        }
    },
    getDefaultProps: function () {
        return {
            building: 'farm',
            attachData: CROP_DATA,
        }
    },
    farm: function (cropType) {
        var attachData = this.props.attachData;
        var building = this.props.building;
        var timeNeed = attachData[cropType].timeNeed;
        var require = attachData[cropType].require;
        function callBack() {
            this.context.useItemThatPlayerHave(require);
            this.context.buildingSaveData[building].list.push({ type: cropType, timeMax: attachData[cropType].timeMax, timeNow: 0 });
        }
        this.context.useTime(callBack.bind(this), timeNeed);
    },
    harvest: function (index) {
        var attachData = this.props.attachData;
        var buildingSaveData = this.context.buildingSaveData;
        var building = this.props.building;
        var tar = attachData[this.context.buildingSaveData[building].list[index].type];
        var itemGet = tar.itemGet;
        var itemAmount = tar.itemAmount;
        var o = {};
        o[itemGet] = this.getAmount(itemAmount);
        if (!this.context.checkFull('bag', itemGet)) {
            this.context.changeItem(o, 'bag');
            var savedata = this.context.buildingSaveData;
            savedata[building].list.splice(index, 1);
            //取消提示
            buildingSaveData[building].hint = false;
            this.context.setStateFromChildren({ buildingSaveData: savedata });
        }
    },
    // 取消生产：按已完成进度返还剩余材料（进度越高返还越少）
    cancel: function (index) {
        var building = this.props.building;
        var attachData = this.props.attachData;
        var buildingSaveData = this.context.buildingSaveData;
        var item = buildingSaveData[building].list[index];
        if (!item) return;
        var data = attachData[item.type];
        var skill = this.context.skill;
        var manageLevel = (skill.manage || 0) * SKILL_DATA.manage.buff;
        var max = item.timeMax / (1 + manageLevel);
        var progress = max > 0 ? item.timeNow / max : 0;
        if (progress > 1) progress = 1;
        var refund = {};
        for (var attr in data.require) {
            var back = Math.round(data.require[attr] * (1 - progress));
            if (back > 0) refund[attr] = (refund[attr] || 0) + back;
        }
        if (getLength(refund) > 0) this.context.changeItem(refund, 'bag');
        buildingSaveData[building].list.splice(index, 1);
        buildingSaveData[building].hint = false;
        this.context.setStateFromChildren({ buildingSaveData: buildingSaveData });
        this.context.AudioEngine.playEffect('pick');
    },
    getAmount: function (amount) {
        var skill = this.context.skill;
        var result = amount;
        if (skill.farm && this.props.building == 'farm') {
            result *= 1 + skill.farm * SKILL_DATA.farm.buff;
            result = Math.round(result);
        }
        if (skill.alco && this.props.building == 'alco') {
            result *= 1 + skill.alco * SKILL_DATA.alco.buff;
            result = Math.round(result);
        }
        return result;
    },
    render: function () {
        var attachData = this.props.attachData;
        var building = this.props.building;
        var season = this.context.season;
        var crop = this.context.buildingSaveData[building];

        var skill = this.context.skill;
        var manageLevel = (skill.manage || 0) * SKILL_DATA.manage.buff;
        function getListDisplay() {
            var result = [];
            var cropList = crop.list;
            var size = crop.size;
            for (var i = 0; i < cropList.length; i++) {
                var tmp = cropList[i];
                var max = tmp.timeMax / (1 + manageLevel);//经营手腕
                var current = tmp.timeNow;
                if (max <= current) {
                    var btn = <BtnComponent desc='收获' handleClick={this.harvest.bind(null, i)} />;
                    result.push(<VectorComponent key={i} msg_top={attachData[tmp.type].desc} msg_top_color={COLOR.BLUE} btn_bottom={btn} />)
                } else {
                    var bar = <ProgressComponent max={max} current={current} />
                    var cancelBtn = <BtnComponent desc='取消' handleClick={this.cancel.bind(null, i)} />;
                    result.push(<VectorComponent key={i} msg_top={attachData[tmp.type].desc} msg_bottom={bar} btn_bottom={cancelBtn} msg_top_color={COLOR.BLUE} />)
                }
            };
            for (var i = cropList.length; i < size; i++) {
                result.push(<VectorComponent key={i} />);
            };
            return result;
        }
        function getCropTypeDesc() {
            var list = attachData;
            var bag = together(this.context.boxSaveData.bag.things, this.context.boxSaveData.bigBox.things);
            var entries = [];
            for (var attr in list) {
                entries.push({ attr: attr, tmp: list[attr] });
            };
            // 按「现有材料可制作的次数」从多到少排序
            entries.sort(function (a, b) {
                return getCraftableCount(b.tmp.require, bag) - getCraftableCount(a.tmp.require, bag);
            });
            var result = entries.map(function (entry, count) {
                var attr = entry.attr, tmp = entry.tmp;
                var crop = this.context.buildingSaveData[building];
                var isFull = crop.size <= crop.list.length;
                return <tr key={count}>
                    <td style={{ color: COLOR.BLUE }}>{grtDesc.bind(this)() + tmp.desc}</td>
                    <td><RequireComponent haveBox={true} requireList={tmp.require} /></td>
                    <td>{tmp.timeMax / (1 + manageLevel)}</td>
                    <td><RequireComponent isGreen={true} requireList={o(tmp.itemGet, this.getAmount(tmp.itemAmount))} /></td>
                    <td><BtnComponent style={{ margin: '0px' }} requireList={tmp.require} disabled={isFull} handleClick={this.farm.bind(this, attr)} desc="设置" /></td>
                </tr>;
            }.bind(this));
            return result;
        }
        function grtDesc() {
            var map = {
                farm: '农作物',
                alco: '酿制',
            }
            return map[this.props.building]
        }
        function grtDesc_2() {
            var map = {
                farm: <p>种植农作物需要大量肥料。</p>,
                alco: <p>酿造酒需要大量水。</p>,
            }
            return map[this.props.building]
        }
        function getTheadDesc() {
            var map = {
                farm: <tr><td>类型</td><td>需求</td><td>培育周期</td><td>收益</td><td></td></tr>,
                alco: <tr><td>类型</td><td>需求</td><td>酿造周期</td><td>获得</td><td></td></tr>
            }
            return map[this.props.building]
        }
        function seasonDesc() {
            var map = {
                farm: {
                    'spring': <p>在春天，农作物的生长速度是平时的两倍。</p>,
                    'winter': <p>在冬天，所有农作物将停止生长。</p>,
                },
                alco: {
                    'winter': <p>啤酒桶结冰了，无法发酵</p>,
                },
            }
            return map[building][season] || null;
        }
        return <div>
            {seasonDesc.bind(this)()}
            {grtDesc_2.bind(this)()}
            <div className="crop">
                {getListDisplay.bind(this)()}
                <BtnBack />
            </div>
            <div className="tableOuter cropTableOuter">
                <table className="table table-condensed table-hover">
                    <thead>{getTheadDesc.bind(this)()}</thead>
                    <tbody>
                        {getCropTypeDesc.bind(this)()}
                    </tbody>
                </table>
            </div>
        </div>

    }
})
// 陷阱：放入诱饵，按天自动捕获猎物
var TrapComponent = React.createClass({
    desc: '诱饵',
    timeNeed: 1,
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        buildingSaveData: React.PropTypes.object.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        getScienceLevel: React.PropTypes.func.isRequired,
        checkFull: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
    },
    componentWillMount: function () {
        var level = this.context.getScienceLevel('陷阱空间属性');
        var buildingSaveData = this.context.buildingSaveData;
        buildingSaveData['trap'].size = 2 + level;
    },
    getInitialState: function () {
        return {
            size: null
        }
    },
    makeTrap: function (trapType) {
        var require = TRAP_DATA[trapType].require;
        this.context.useTime(
            (function () {
                this.context.buildingSaveData.trap.list.push({ type: trapType, succeed: false });
                this.context.useItemThatPlayerHave(require);
            }).bind(this),
            this.timeNeed
        )
    },
    harvest: function (index) {
        var tmp = this.context.buildingSaveData.trap.list[index];
        var itemGet = tmp.itemGet;
        var itemAmount = this.getAmount(tmp.itemAmount);
        if (!this.context.checkFull('bag', itemGet)) {
            this.context.changeItem(o(itemGet, itemAmount), 'bag');
            var buildingSaveData = this.context.buildingSaveData;
            buildingSaveData.trap.list.splice(index, 1);
            buildingSaveData['trap'].hint = false;
            this.context.setStateFromChildren({ buildingSaveData: buildingSaveData });
        }
    },
    getAmount: function (itemAmount) {
        var level = this.context.getScienceLevel('陷阱收益属性');
        return Math.round(itemAmount * (1 + 0.5 * level));
    },
    // 取消陷阱：未捕获时返还诱饵（陷阱无进度，按 0 进度即全额返还）
    cancel: function (index) {
        var buildingSaveData = this.context.buildingSaveData;
        var tmp = buildingSaveData.trap.list[index];
        if (!tmp) return;
        var require = TRAP_DATA[tmp.type].require;
        if (require && getLength(require) > 0) this.context.changeItem(clone(require), 'bag');
        buildingSaveData.trap.list.splice(index, 1);
        buildingSaveData['trap'].hint = false;
        this.context.setStateFromChildren({ buildingSaveData: buildingSaveData });
        this.context.AudioEngine.playEffect('pick');
    },
    render: function () {
        var trap = this.context.buildingSaveData.trap;
        function getListDisplay() {
            var result = [];
            var list = trap.list;
            var size = trap.size;
            for (var i = 0; i < list.length; i++) {
                var tmp = list[i];
                if (tmp.succeed) {
                    var btn = <BtnComponent desc='收获' handleClick={this.harvest.bind(null, i)} />;
                    result.push(<VectorComponent key={i} msg_top={ITEM_DATA[this.context.buildingSaveData.trap.list[i].itemGet].name} msg_top_color={COLOR.BLUE} btn_bottom={btn} />)
                } else {
                    var cancelBtn = <BtnComponent desc='取消' handleClick={this.cancel.bind(null, i)} />;
                    result.push(<VectorComponent onContextMenu={this.cancel.bind(null, i)} key={i} msg_top={this.desc} msg_bottom={TRAP_DATA[tmp.type].desc} btn_bottom={cancelBtn} msg_top_color={COLOR.BLUE} />)
                }
            };
            for (var i = list.length; i < size; i++) {
                result.push(<VectorComponent key={i} />);
            };
            return result;
        }
        function getTrapTypeDesc() {
            var list = TRAP_DATA;
            var chanceLevel = this.context.getScienceLevel('陷阱属性');
            var getLevel = this.context.getScienceLevel('陷阱收益属性');
            var trap = this.context.buildingSaveData.trap;
            var bag = together(this.context.boxSaveData.bag.things, this.context.boxSaveData.bigBox.things);
            var entries = [];
            for (var attr in list) {
                var tmp = list[attr];
                if (tmp.science && (!this.context.boxSaveData.scienceTable.things[tmp.science])) continue;
                entries.push({ attr: attr, tmp: tmp });
            };
            // 按「现有材料可制作的次数」从多到少排序
            entries.sort(function (a, b) {
                return getCraftableCount(b.tmp.require, bag) - getCraftableCount(a.tmp.require, bag);
            });
            var result = entries.map(function (entry, count) {
                var attr = entry.attr, tmp = entry.tmp;
                var isFull = trap.size <= trap.list.length;
                return <tr key={count}>
                    <td style={{ color: COLOR.BLUE }}>{this.desc + tmp.desc}</td>
                    <td><RequireComponent haveBox={true} requireList={tmp.require} /></td>
                    <td><ProgressComponent current={tmp.chance * (1 + chanceLevel * 0.5)} max={1} /></td>
                    <td><RequireComponent isGreen={true} requireList={cloneMul(tmp.itemGet, 1 + 0.5 * getLevel)} separator=' 或 ' /></td>
                    <td><BtnComponent style={{ margin: '0px' }} requireList={tmp.require} disabled={isFull} handleClick={this.makeTrap.bind(this, attr)} desc="设置" /></td>
                </tr>;
            }.bind(this));
            return result;
        }
        return <div>
            <p>放入诱饵，可以捕获小动物。</p><br />
            <div className="trap">
                {getListDisplay.bind(this)()}
                <BtnBack />
            </div>
            <div className="tableOuter trapTableOuter">
                <table className="table table-condensed table-hover">
                    <thead><tr><td>陷阱</td><td>需求</td><td>捕获几率/日</td><td>收益</td><td></td></tr></thead>
                    <tbody>
                        {getTrapTypeDesc.bind(this)()}
                    </tbody>
                </table>
            </div>
        </div>

    }
})
// 炊具食谱：列出 COOK_DATA，一键烹调。食材自动从「背包+大箱子」扣除，成品放入 cooked 箱
var CookRecipeComponent = React.createClass({
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        checkFull: React.PropTypes.func.isRequired,
        getTheMaxTimeToUse: React.PropTypes.func.isRequired,
        getBuildingLevel: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        changeMsg: React.PropTypes.func.isRequired,
    },
    getInitialState: function () {
        return {
            cookAmounts: {},   // 以配方键记录每行选择的数量
        }
    },
    // 配方唯一键（用于稳定保存每行数量，列表排序变化时不错位）
    recipeKey: function (recipe) {
        return recipe.name + '|' + recipe.require.slice().sort().join(',');
    },
    // 该配方可制作的最大数量：同时受现有材料与可用时间限制
    getAmountMax: function (recipe) {
        var require = this.getRequire(recipe);
        var bag = together(this.context.boxSaveData.bag.things, this.context.boxSaveData.bigBox.things);
        var byMat = getCraftableCount(require, bag);
        var byTime = Math.floor(this.context.getTheMaxTimeToUse() / this.getCookTime());
        var max = Math.min(byMat, byTime);
        return max > 0 ? max : 0;
    },
    getAmount: function (recipe) {
        var max = this.getAmountMax(recipe);
        var v = this.state.cookAmounts[this.recipeKey(recipe)] || 1;
        if (v > max) v = max;
        if (v < 1) v = 1;
        return v;
    },
    changeCookAmount: function (recipe, sender) {
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        var value = parseInt(obj.value);
        if (isNaN(value)) value = 1;
        var max = this.getAmountMax(recipe);
        if (max < 1) max = 1;
        if (value > max) value = max;
        if (value < 1) value = 1;
        var amounts = clone(this.state.cookAmounts);
        amounts[this.recipeKey(recipe)] = value;
        this.setState({ cookAmounts: amounts });
    },
    // 生成食谱成品的作用文本（用于悬浮提示）
    getEffectText: function (id) {
        return getItemInfoText(id);
    },
    // 悬浮时在右侧显示该食谱成品的详情
    showRecipeDetail: function (id) {
        this.context.changeMsg(id, 'item');
    },
    // 单份烹调耗时（受炊具升级科技影响）
    getCookTime: function () {
        var level = this.context.getBuildingLevel('烹饪技能');
        return COOK_TIME_NEED * Math.pow(COOK_SPEED_MUL, level);
    },
    // 把配方数组 [食材,食材] 转成需求对象 {食材:数量}
    getRequire: function (recipe) {
        var require = {};
        for (var i = 0; i < recipe.require.length; i++) {
            var id = recipe.require[i];
            require[id] = (require[id] || 0) + 1;
        }
        return require;
    },
    cook: function (recipe, amount) {
        amount = amount || 1;
        var require = cloneMul(this.getRequire(recipe), amount);
        function callBack() {
            this.context.useItemThatPlayerHave(require);
            var o = {};
            o[recipe.name] = amount;
            this.context.changeItem(o, 'cooked');
            this.context.AudioEngine.playEffect('build');
        }
        this.context.useTime(callBack.bind(this), this.getCookTime() * amount);
    },
    render: function () {
        var timeNeed = this.getCookTime();
        var maxTime = this.context.getTheMaxTimeToUse();
        // 过滤掉引用了未定义物品的配方（如尚未实现的 flour 系列），避免显示异常
        var recipes = COOK_DATA.filter(function (recipe) {
            if (!ITEM_DATA[recipe.name]) return false;
            for (var i = 0; i < recipe.require.length; i++) {
                if (!ITEM_DATA[recipe.require[i]]) return false;
            }
            return true;
        });
        // 按「现有材料可制作的次数」从多到少排序
        var bag = together(this.context.boxSaveData.bag.things, this.context.boxSaveData.bigBox.things);
        recipes.sort(function (a, b) {
            return getCraftableCount(this.getRequire(b), bag) - getCraftableCount(this.getRequire(a), bag);
        }.bind(this));
        var rows = recipes.map(function (recipe, index) {
            var amount = this.getAmount(recipe);
            var max = this.getAmountMax(recipe);
            var require = cloneMul(this.getRequire(recipe), amount);
            var totalTime = this.getCookTime() * amount;
            var name = ITEM_DATA[recipe.name] ? ITEM_DATA[recipe.name].name : recipe.name;
            var disabled = amount < 1 || amount > max || maxTime < totalTime || !this.context.checkHaveResourceAll(require, true) || this.context.checkFull('cooked', recipe.name);
            return <tr key={index} title={this.getEffectText(recipe.name)} onMouseEnter={this.showRecipeDetail.bind(this, recipe.name)}>
                <td style={{ color: COLOR.BLUE }}>{name}</td>
                <td><RequireComponent haveBox={true} requireList={require} showTotal={true} /></td>
                <td>{Math.round(totalTime * 10) / 10}</td>
                <td><input className='scheduleInput form-control' value={String(amount)} type='number' min='1' max={String(max > 0 ? max : 1)} onChange={this.changeCookAmount.bind(this, recipe)} /></td>
                <td><BtnComponent style={{ margin: '0px' }} requireList={require} disabled={disabled} disabledReason={'材料不足、数量超出、饱食/水分不足或成品箱已满'} handleClick={this.cook.bind(this, recipe, amount)} desc="烹调" /></td>
            </tr>;
        }.bind(this));
        return <div className="tableOuter cookTableOuter">
            <table className="table table-condensed table-hover">
                <thead><tr><td>成品</td><td>需求</td><td>耗时</td><td>个数</td><td></td></tr></thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
        </div>;
    }
});
// 炊具：烹调界面与烹饪技能升级入口
var CookerComponent = React.createClass({
    render: function () {
        return <div>
            <p>你可以使用炊具更大程度地利用食物。填写「个数」后点「烹调」即可按数量制作（悬浮食谱可查看作用）。</p>
            <div>
                <BoxComponent box='cooked' />
            </div>
            <BoxTransferComponent box='cooked' />
            <CookRecipeComponent />
            <div>
                <StudioComponent isBuildingUpdate={true} type='烹饪技能' />
            </div>
            <BtnBack />
        </div>
    }
})
// 水井：打水（受季节与建筑等级影响）
var WellComponent = React.createClass({
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        getBuildingLevel: React.PropTypes.func.isRequired,
        season: React.PropTypes.string.isRequired,
        skill: React.PropTypes.object.isRequired,
    },
    render: function () {
        var level = this.context.getBuildingLevel('wellUpdate');
        var yieldAmount = (3 + level) * ((this.context.skill.manage || 0) * SKILL_DATA.manage.buff + 1);
        if (this.context.season == 'winter') {
            return <div>
                <p>井水结冰了。</p>
                <BtnBack />
            </div>
        }
        return <div>
            <p>当前水井深度等级：<span style={{ color: COLOR.BLUE }}>{level}</span></p>
            <p>每日产水量：<span style={{ color: COLOR.BLUE }}>{yieldAmount}</span></p>
            <BoxComponent box='well' />
            <StudioComponent isBuildingUpdate={true} type='wellUpdate' />
            <BtnBack />
        </div>
    }
})
// 卫生间：如厕并产出沼气（受季节与环境温度影响）
var ToiletComponent = React.createClass({
    contextTypes: {
        placeSaveData: React.PropTypes.object.isRequired,
        getBuildingLevel: React.PropTypes.func.isRequired,
        season: React.PropTypes.string.isRequired,
        getEnveronmentTemperature: React.PropTypes.func.isRequired,
    },
    render: function () {
        var shitCanGet = { san: 2, shit: 4 };
        var showerCanGet = { san: 30 };
        showerCanGet.temp = (this.context.season == 'winter') ? 20 : -10;
        var level = this.context.getBuildingLevel('toiletUpdate');
        var season = this.context.season;
        return <div>
            <div>
                <ActionComponent coolDown={48} action='shit' type='shit' canGet={shitCanGet} timeNeed={1} desc='排便' />
            </div>
            <div>
                {level > 0 && season == 'winter' ? <p>在冬天洗澡，你需要额外的燃料。</p> : null}
                {level > 0 ? <ActionComponent coolDown={24} action='shower' canGet={showerCanGet} require={season == 'winter' ? { water: 4, wood: 2 } : { water: 4 }} timeNeed={1} desc='洗澡' /> : null}
            </div>
            <div>
                <BoxComponent box='shit' />
                {level > 1 ? (
                    <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <table className='table table-hover table-condensed'>
                            <thead><tr><td>沼气池</td></tr></thead>
                            <tbody><tr><td><BoxComponent box='marshGasTank' /></td></tr></tbody>
                        </table>
                    </div>
                ) : null}
                <BtnBack />
            </div>
            <StudioComponent isBuildingUpdate={true} type='toiletUpdate' />
        </div>
    }
})
// 床铺：睡觉恢复体力/精神（受季节与建筑等级影响）
var SleepPlaceComponent = React.createClass({
    contextTypes: {
        getBuildingLevel: React.PropTypes.func.isRequired,
        season: React.PropTypes.string.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
    },
    render: function () {
        function getLevelDesc(level) {
            var map = {
                0: '地板',
                1: '木床',
                2: '凉席',
                3: '高级床',
                4: '特级床',
            }
            return map[level];
        }
        var level = this.context.getBuildingLevel('sleepPlaceUpdate');
        var map = {
            0: 1,
            1: 1.5,
            2: 2,
            3: 2.5,
            4: 3,
        }
        var sleepCanGet = { ps: 10, hp: 0.5, san: 0.5 };
        var waitCanGet = { ps: 1 };
        var mul = map[level];
        sleepCanGet = cloneMul(sleepCanGet, mul);
        var season = this.context.season;
        var boxSaveData = this.context.boxSaveData;
        var disabled = season == 'winter' && !boxSaveData.scienceTable.things['heatedBed'];

        function getSeasonDesc() {
            if (disabled) {
                return <p>在寒冷的冬天，如果我不烧点柴火睡觉的话，我会冻死的（需要科技<span style={{ color: COLOR.BLUE }}>[火炕]</span>）。</p>;
            } else {
                if (season == 'winter') {
                    return <p>在冬天睡觉需要燃料。</p>
                }
            }
        }
        var props = season == 'winter' ? { temp: 10 } : {};
        return <div>
            <div>
                当前床铺等级：<span style={{ color: COLOR.BLUE }}>[{getLevelDesc(this.context.getBuildingLevel('sleepPlaceUpdate'))}]</span>
            </div>
            <div>
                {getSeasonDesc()}
                {!disabled ? <ActionComponent disabled={disabled} type='sleep' require={season == 'winter' ? { wood: 1 } : {}} canGet={sleepCanGet} props={props} changable={true} desc='睡觉' /> : <div className='schedule'><table className='table'><thead><tr><td>无法使用</td></tr></thead></table></div>}
                {null/*season=='winter'?<ActionComponent type = 'wait' canGet = {waitCanGet} desc = '躺着'/>:null*/}
            </div>
            <StudioComponent isBuildingUpdate={true} type='sleepPlaceUpdate' />
            <BtnBack />
        </div>
    }
})
// 外部地点面板：采集/狩猎/事件、进入地牢等
var PlaceComponent = React.createClass({
    getDefaultProps: function () {
        return {
            reActionDisabled: false,
            place: ''
        }
    },
    getInitialState: function () {
        return {
            isActing: false,
            resourceName: null,
        };
    },
    contextTypes: {
        setTitle: React.PropTypes.func.isRequired,
        placeSaveData: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        useTime: React.PropTypes.func.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        playerStateUse: React.PropTypes.func.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        getMstCircle: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        eventSaveData: React.PropTypes.object.isRequired,
        season: React.PropTypes.string.isRequired,
        dungeonSaveData: React.PropTypes.object.isRequired,
        campSaveData: React.PropTypes.object.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        skill: React.PropTypes.object.isRequired,
        getScienceLevel: React.PropTypes.func.isRequired,
    },
    resourceDec: function (resourceName) {
        var resource = this.context.placeSaveData[this.props.place].resource[resourceName];
        resource.amount -= 1;
        this.context.setStateFromChildren({ placeSaveData: this.context.placeSaveData });
    },
    checkDisabled: function (resourceName) {
        var tar = this.getRequire(PLACE_DATA[this.props.place].resource[resourceName].require);
        tar = cloneMul(tar, 1);
        var result = !this.context.checkHaveResourceAll(tar);
        result = result || (this.context.placeSaveData[this.props.place].resource[resourceName].amount <= 0);
        return result;
    },
    componentWillMount: function () {
        this.context.setTitle((PLACE_DATA[this.props.place] && PLACE_DATA[this.props.place].name) || '');
    },
    componentDidMount: function () {
    },
    handleStartAction: function (resourceName) {
        var boxSaveData = this.context.boxSaveData;
        boxSaveData.register.things = {};
        this.context.setStateFromChildren({ boxSaveData: boxSaveData });
        this.handleAction(resourceName);
    },
    getTimeNeed: function (resourceName) {
        var resource = PLACE_DATA[this.props.place].resource[resourceName];
        var timeNeed = resource.timeNeed;
        var currentEquip = this.context.currentEquip;
        for (var attr in currentEquip) {
            if (!currentEquip[attr]) continue;
            timeNeed *= 1 - (ITEM_DATA[currentEquip[attr]].collectSpeed || 0);
        }
        return timeNeed;
    },
    getRequire: function (require) {
        var level = this.context.getScienceLevel('采集消耗减免属性');
        function mul(obj, mul) {
            var o = {};
            var mul = mul || 1;
            for (var attr in obj) {
                if (ITEM_DATA[attr]) {
                    o[attr] = obj[attr];
                    continue;
                }
                var num = mul * obj[attr];
                o[attr] = Math.round(num);
            };
            return o;
        }
        return mul(require, Math.pow(0.8, level));
    },
    handleAction: function (resourceName) {
        var resource = PLACE_DATA[this.props.place].resource[resourceName];
        var timeNeed = this.getTimeNeed(resourceName);
        var currentEquip = this.context.currentEquip;

        var box = this.context.boxSaveData.register;
        var name = this.props.place;
        var callBack = function () {
            var greedyLevel = (this.context.skill.greedy || 0) * SKILL_DATA.greedy.buff;//贪婪加成
            var things = cloneMul(resource.things, 1 + greedyLevel);

            this.context.playerStateUse(this.getRequire(resource.require));
            this.context.changeItem(things, 'register');
            this.setState({ isActing: true, resourceName: resourceName });
        }
        this.context.useTime(callBack.bind(this), timeNeed);
        this.resourceDec(resourceName);
    },
    getRandomMst: function () {
        var list = this.context.placeSaveData[this.props.place].mst;
        return getRandomThing(list);
    },
    handleBattle: function () {
        this.context.useTime(function () {
            var mst = this.getRandomMst().attr;
            var wind = <BattleComponent reHunt={this.handleBattle} mst={mst} placeName={this.props.place} />
            this.context.callWindow(wind);
        }.bind(this), 0.5);
    },
    setDecThings: function (totalGet) {
        //after pick things ,need to set things dec
        var name = this.props.place;
        var placeData = this.context.placeSaveData[name];
        var things = placeData.things;
        for (var attr in things) {
            for (var attr_2 in totalGet) {
                if (attr == attr_2) {
                    things[attr] -= totalGet[attr];
                    if (things[attr] <= 0) {
                        delete things[attr];
                    }
                }
            }
        }
    },
    handlePick: function () {
        var name = this.props.place;
        var placeData = this.context.placeSaveData[name];
        var things = placeData.things;
        var getAmount = Math.floor(getRandomThing(things).total / 10) + 2;
        var totalGet = {};
        for (var i = getAmount; i >= 0; i--) {
            var get = getRandomThing(things).attr;
            if (!get) break;
            if (totalGet[get]) {
                totalGet[get] += 1;
            } else {
                totalGet[get] = 1;
            }
        };

        var greedyLevel = (this.context.skill.greedy || 0) * SKILL_DATA.greedy.buff;//贪婪加成
        totalGet = cloneMul(totalGet, 1 + greedyLevel);

        function callBack() {
            var require = PLACE_DATA[name].pickRequire || { ps: 3 };
            this.context.playerStateUse(require);
            this.context.callWindow(<RegisterComponent willUnmount={this.setDecThings.bind(this, totalGet)} itemList={totalGet} />);
        }
        this.context.useTime(callBack.bind(this), PICK_TIME);
    },
    handleEvent: function (event) {
        var wind = <EventComponent type={event} />;
        this.context.callWindow(wind);
    },
    getPermittion: function () {
        var name = this.props.place;
        var campSaveData = this.context.campSaveData;
        var placeSaveData = this.context.placeSaveData;
        if (name == 'ice' || name == 'fire') {
            var flag = true;
            for (var attr in placeSaveData[name].mst) {
                if (placeSaveData[name].mst[attr].amount != 0) {
                    flag = false;
                    break;
                };
            }
            if (flag) return true;
        }

        if ((name == 'ice' || name == 'fire') && (name != campSaveData.choice)) return false;
        return true;
    },
    getEnermy: function () {
        var name = this.props.place;
        var campSaveData = this.context.campSaveData;
        if ((name == 'ice' || name == 'fire') && (name == campSaveData.choice || !campSaveData.choice)) return false;

        //本区域没有怪兽
        if (getLength(this.context.placeSaveData[name].mst) == 0) {
            return false;
        }

        return true;
    },
    render: function () {
        var name = this.props.place;
        if (name == 'upgradePlace') {
            return <UpgradePlaceComponent />
        }
        var placeData = this.context.placeSaveData[name];
        if (this.state.isActing) {
            var resourceName = this.state.resourceName;
            var disabled = this.checkDisabled(resourceName);
            return (
                <div>
                    <BtnComponent disabled={disabled} handleClick={this.handleAction.bind(this, resourceName)} desc={PLACE_DATA[name].resource[resourceName].action} />
                    <RegisterComponent canBack={false} />
                    <BtnBack callBack={function () {
                        this.setState({ isActing: false });
                    }.bind(this)} />
                </div>
            )
        }
        function getCircleDesc(speed) {
            function getColor() {
                var r, g, b;
                var speed_1 = 0.2;
                var speed_2 = 0.5;
                var color_0 = { r: 76, g: 168, b: 153 }
                var color_1 = { r: 77, g: 180, b: 154 }
                var color_2 = { r: 194, g: 154, b: 77 }
                if (speed < speed_1) {
                    r = speed * (color_1.r - color_0.r) + color_0.r;
                    g = speed * (color_1.g - color_0.g) + color_0.g;
                    b = speed * (color_1.b - color_0.b) + color_0.b;
                } else {
                    if (speed < speed_2) {
                        r = (speed - speed_1) * (color_2.r - color_1.r) + color_1.r;
                        g = (speed - speed_1) * (color_2.g - color_1.g) + color_1.g;
                        b = (speed - speed_1) * (color_2.b - color_1.b) + color_1.b;
                    } else {
                        r = color_2.r;
                        g = color_2.g;
                        b = color_2.b;
                    }
                }
                r = Math.ceil(r);
                g = Math.ceil(g);
                b = Math.ceil(b);
                return 'rgb(' + r + ',' + g + ',' + b + ')';
            }
            function getDesc() {
                if (speed == 0) return '停止';
                if (speed <= 0.1) return '非常慢';
                if (speed <= 0.2) return '很慢';
                if (speed <= 0.3) return '较慢';
                if (speed <= 0.4) return '一般';
                if (speed <= 0.5) return '很快';
                if (speed <= 1) return '较快';
                return '非常快';
            }
            return <span style={{ color: getColor() }}>{getDesc()}</span>
        };


        var greedyLevel = (this.context.skill.greedy || 0) * SKILL_DATA.greedy.buff;//贪婪加成

        var eventSaveData = this.context.eventSaveData;
        function getRecources() {
            if (!this.getPermittion()) return null;
            var result = [];
            for (var attr in PLACE_DATA[name].resource) {
                var tmp = placeData.resource[attr];
                if (!tmp) continue;

                var ev = PLACE_DATA[name].resource[attr].event;
                lll(PLACE_DATA[name].resource[attr])
                lll(ev)
                lll(eventSaveData)
                lll(eventSaveData[ev])
                if (ev && (!eventSaveData[ev] || !eventSaveData[ev].experienced)) {
                    continue;
                }


                var disabled = this.checkDisabled(attr);
                var season = this.context.season;

                //服从生物曲线
                var speed = this.context.getMstCircle(tmp.amount, PLACE_DATA[name].resource[attr].initAmount, PLACE_DATA[name].resource[attr].circle);
                var speed = season == 'winter' ? 0 : speed;

                result.push(<tr key={attr}>
                    <td>{PLACE_DATA[name].resource[attr].name}</td>
                    <td>{tmp.amount}</td>
                    <td>{getCircleDesc(speed)}</td>
                    <td><RequireComponent isGreen={true} requireList={cloneMul(PLACE_DATA[name].resource[attr].things, 1 + greedyLevel)} /></td>
                    <td><RequireComponent requireList={this.getRequire(PLACE_DATA[name].resource[attr].require)} /></td>
                    <td><BtnComponent canEvent={true} disabled={disabled} handleClick={this.handleStartAction.bind(this, attr)} desc={PLACE_DATA[name].resource[attr].action} /></td>
                </tr>)
            };
            return result;
        };
        function getMsts() {
            if (!this.getEnermy()) return null;
            var result = [];
            var mstList = placeData.mst;
            //按钮信息
            var huntDesc = PLACE_DATA[name].huntDesc || '狩猎';
            result.push(<tr key={'resource_mst'}>
                <td>{huntDesc}</td>
                <td colSpan={3}><ResourceDisplayComponent type='mst' resource={mstList} /></td>
                <td></td>
                <td><BtnComponent disabled={this.getRandomMst().attr == false} canEvent={true} handleClick={this.handleBattle} desc={huntDesc} /></td>
            </tr>)
            return result;
        };
        function getEvents() {
            if (this.getEnermy() && (name == 'fire' || name == 'ice')) return null;
            //设置事件
            if (!PLACE_DATA[name].event) return null;
            var result = [];
            for (var attr in PLACE_DATA[name].event) {
                var eventSaveData = this.context.eventSaveData;
                if (eventSaveData[attr].experienced) continue;
                var data = EVENT_DATA[attr];
                if (data.event && !eventSaveData[data.event].experienced) continue;
                result.push(<tr key={'event_' + attr}><td>{data.name}</td><td colSpan='4'>{data.desc}</td><td><BtnComponent handleClick={this.handleEvent.bind(this, attr)} desc={data.btn || '对话'} /></td></tr>);
            }
            return result;
        }
        function getPick() {
            if (!this.getPermittion()) return null;
            //设置拾荒
            if (!getLength(placeData.things)) return null;
            var pickDesc = PLACE_DATA[name].pickDesc || '拾荒';
            var pickRequire = PLACE_DATA[name].pickRequire || {};
            if (!pickRequire.ps) pickRequire.ps = 3;
            var disabled = !this.context.checkHaveResourceAll(pickRequire);
            return <tr><td>{PLACE_DATA[name].thingsDesc || pickDesc}</td><td colSpan={3}><ResourceDisplayComponent resource={placeData.things} /></td><td><RequireComponent requireList={pickRequire} /></td><td><BtnComponent disabled={disabled} desc={pickDesc} handleClick={this.handlePick} /></td></tr>
        }
        function getEntry() {
            function goToDunguen() {
                var dungeonSaveData = this.context.dungeonSaveData;
                dungeonSaveData.stairCount = 1;
                dungeonSaveData.roomCount = 1;
                dungeonSaveData.room = {
                    desc: <p>阴森的地牢传出恐怖的声音。</p>
                };
                this.context.setStateFromChildren({
                    currentScene: 'dungeon',
                    dungeonSaveData: dungeonSaveData,
                });
            }
            if (PLACE_DATA[name].entry == 'dungeon') {
                return <tr><td colSpan={6}>
                    <BtnComponent desc='前往地牢' handleClick={goToDunguen.bind(this)} />
                </td></tr>
            }
        }
        var haveResources = getLength(placeData.resource) > 0;
        return <div className="tableOuter">
            <table className="table table-condensed table-hover">
                {this.getPermittion() && haveResources ? <thead><tr><td>资源</td><td>总量</td><td>生长</td><td>获得物品</td><td>需要</td><td></td></tr></thead> : null}
                <tbody>
                    {getEntry.bind(this)()}
                    {getRecources.bind(this)()}
                    {getPick.bind(this)()}
                    {getMsts.bind(this)()}
                    {getEvents.bind(this)()}
                </tbody>
            </table>
        </div>
    }
});
// 家中场景：各建筑入口与出门
var HomeComponent = React.createClass({
    getDefaultProps: function () {
        return {
        }
    },
    getInitialState: function () {
        return {
            war: false,
        }
    },
    contextTypes: {
        setTitle: React.PropTypes.func.isRequired,
        buildingSaveData: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        setCurrentScene: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired,
        upload: React.PropTypes.func.isRequired,
        saveLocal: React.PropTypes.func.isRequired,
        time: React.PropTypes.object.isRequired,
        robberSaveData: React.PropTypes.object.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
    },
    componentWillMount: function () {
        this.context.setTitle('家');
    },
    handleGoOut: function () {
        this.context.setCurrentScene('branch');
        var settings = this.context.settings;
        if (settings.autoSave) {
            //自动保存：写入专用本地自动存档槽
            this.context.saveLocal(LOCAL_SAVE_AUTO_SLOT);
            //若已配置账号密码，同时保存到后端
            if (settings.save_account && settings.save_pass) {
                this.context.upload(true);
            }
        }
    },
    getOwnAndUnOwnNumber: function (list) {
        var countOwn = 0;
        var countUnOwn = 0;
        for (var attr in list) {
            if (list[attr].own) {
                countOwn++;
            } else {
                countUnOwn++;
            }
        };
        return { countOwn: countOwn, countUnOwn: countUnOwn };
    },
    isAllScienceLearned: function () {
        var scienceTable = this.context.boxSaveData.scienceTable.things;
        for (var attr in SCIENCE_DATA) {
            if (!scienceTable[attr]) return false;
        }
        return true;
    },
    handleWar: function () {
        var robberSaveData = this.context.robberSaveData;
        var time = this.context.time;
        this.setState({ war: true });
    },
    handleKnown: function () {
        var robberSaveData = this.context.robberSaveData;
        robberSaveData.stoled = {};
        this.context.setStateFromChildren({ robberSaveData: robberSaveData });
    },
    render: function () {
        var robberSaveData = this.context.robberSaveData;
        var time = this.context.time;
        if (this.state.war) {
            var mst = robberSaveData.robber;
            var mstState = {
                maxHp: ROBBER_DATA[mst].hpInc * time.day + MST_DATA[mst].maxHp,
                dmg: ROBBER_DATA[mst].dmgInc * time.day + MST_DATA[mst].damage,
            }
            var self = this;
            var winScene = <div>
                你冷静地消灭了敌人。。。
                <BtnComponent desc='回家' handleClick={function () {
                    robberSaveData.robber = null;
                    self.context.callWindow(null);
                }} />
            </div>;
            return <BattleComponent winScene={winScene} mstState={mstState} mst={mst} />;
        }

        if (robberSaveData.robber) {
            return <div>
                <p>一群盗贼撬开了你的门！你被围攻了！</p>
                <BtnComponent handleClick={this.handleWar} desc='战斗！' />
            </div>;
        }

        if (getLength(robberSaveData.stoled) != 0) {
            return <div>
                <p>一群盗贼抢劫了你的家！</p>
                <p>失去的物品：</p>
                <div>
                    <RequireComponent isGreen={true} requireList={robberSaveData.stoled} />
                    <RegisterComponent itemList={{ traces: 1 }} canBeEmpty={true} canBack={false} />
                </div>
                <BtnComponent handleClick={this.handleKnown} desc='接受现实' />
            </div>;
        }
        var buildings = this.context.buildingSaveData;
        var countUnOwn = this.getOwnAndUnOwnNumber(buildings).countUnOwn;
        // 按功能分类归组
        var groups = {};
        for (var attr in buildings) {
            if (!buildings[attr].own) continue;
            if (attr == 'build' && countUnOwn == 0) continue;
            if (attr == 'scienceTable' && this.isAllScienceLearned() == true) continue;
            var cat = (BUILDING_LAYOUT[attr] && BUILDING_LAYOUT[attr].category) || 'craft';
            (groups[cat] = groups[cat] || []).push(attr);
        }
        var cats = [];
        for (var c in groups) cats.push(c);
        cats.sort(function (a, b) {
            var oa = BUILDING_CATEGORY[a] ? BUILDING_CATEGORY[a].order : 99;
            var ob = BUILDING_CATEGORY[b] ? BUILDING_CATEGORY[b].order : 99;
            return oa - ob;
        });
        return <div>
            <div className='home'>
                {cats.map(function (cat) {
                    return <div className='buildingGroup' key={cat}>
                        <div className='buildingGroupTitle'>{BUILDING_CATEGORY[cat] ? BUILDING_CATEGORY[cat].name : cat}</div>
                        <div className='buildingGroupItems'>
                            {groups[cat].map(function (attr) {
                                return <BuildingComponent key={attr} building={attr} />;
                            })}
                        </div>
                    </div>;
                })}
            </div>
            <div>
                <BtnComponent desc='出门' handleClick={this.handleGoOut} />
            </div>
        </div>
    }
});
// 地图/分支：选择前往的地点，并展示集市入口
var BranchComponent = React.createClass({
    contextTypes: {
        placeSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        setCurrentScene: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        eventSaveData: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        getTimeNeed: React.PropTypes.func.isRequired,
        season: React.PropTypes.string.isRequired,
    },
    handleGo: function (placeName) {
        var placeSaveData = clone(this.context.placeSaveData);
        placeSaveData[placeName].visited = true;
        this.context.setStateFromChildren({ placeSaveData: placeSaveData });
        this.context.AudioEngine.playEffect('door');

        var timeNeed = this.context.getTimeNeed(placeName);

        function callBack() {
            this.context.setCurrentScene(placeName);
        }
        this.context.useTime(callBack.bind(this), timeNeed);
    },
    render: function () {
        var placeList = this.context.placeSaveData;
        function getPlaceDisplay() {
            var result = [];
            for (var attr in PLACE_DATA) {
                if (!placeList[attr]) {
                    return;
                }
                if (MODE != 'DEBUG') {
                    //需要事件的情况
                    if (PLACE_DATA[attr].requireEvent && this.context.eventSaveData[PLACE_DATA[attr].requireEvent].experienced == false) continue;
                    //需要科技的情况
                    if (PLACE_DATA[attr].science && this.context.boxSaveData.scienceTable.things[PLACE_DATA[attr].science] == undefined) continue;
                    //需要季节的情况
                    if (PLACE_DATA[attr].season && this.context.season != PLACE_DATA[attr].season) continue;
                }
                result.push(<div className='placeCard' key={attr}>
                    <div className='placeName'>{PLACE_DATA[attr].name}{placeList[attr].visited ? null : <span style={{ color: COLOR.GREEN }}> new</span>}</div>
                    <div className='placeRes'><ResourceDisplayComponent resource={placeList[attr].things} /></div>
                    <div className='placeTime'>耗时 {this.context.getTimeNeed(attr).toFixed(1)}</div>
                    <BtnComponent desc='出发' handleClick={this.handleGo.bind(this, attr)} />
                </div>);
            };
            return result;
        };
        return <div>
            <div className="branchWrap">
                <div className="branch">
                    <div className='placeGrid'>
                        {getPlaceDisplay.bind(this)()}
                    </div>
                </div>
                {this.context.eventSaveData.trade.experienced ? <div className='marketPane'><TradeListComponent /></div> : null}
            </div>
        </div>

    }
});
