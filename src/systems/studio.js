/**
 * src/systems/studio.js —— 制作/科研/建筑/行动 系统
 * 科研台、制造台/炼金台/秘术台（StudioComponent）、建筑入口、通用耗时行动(ActionComponent)。
 */

// ===== UI 内容优化：需求/缺口/耗时文本工具（只做展示，不改数值） =====
// 物品或状态的显示名：物品 -> ITEM_DATA.name；六维 -> STATE_DATA.name；否则 id。
function uiNameOf(attr) {
    if (typeof ITEM_DATA !== 'undefined' && ITEM_DATA[attr] && ITEM_DATA[attr].name) return ITEM_DATA[attr].name;
    if (typeof STATE_DATA !== 'undefined' && STATE_DATA[attr] && STATE_DATA[attr].name) return STATE_DATA[attr].name;
    return String(attr);
}
// 需求文本：{wood:4} -> "木头 ×4、铁块 ×4"；工具 -> "斧头（耗耐久 1）"
function uiReqText(require) {
    if (!require) return '';
    var parts = [];
    for (var attr in require) {
        var n = require[attr];
        var name = uiNameOf(attr);
        if (typeof ITEM_DATA !== 'undefined' && ITEM_DATA[attr] && ITEM_DATA[attr].durable) {
            parts.push(name + '（耗耐久 ' + fmtNum(n || 1) + '）');
        } else {
            parts.push(name + (n == null ? '' : ' ' + fmtQty(n)));
        }
    }
    return parts.join('、');
}
// 缺口文本：getAmount(attr) 返回当前持有量（状态值也行）；齐备时返回"材料齐备"
function uiMissingText(require, getAmount) {
    if (!require) return '';
    var missing = [];
    for (var attr in require) {
        var have = getAmount ? (Number(getAmount(attr)) || 0) : 0;
        var need = Number(require[attr]) || 0;
        if (have < need) missing.push(uiNameOf(attr) + ' ×' + fmtNum(need - have));
    }
    return missing.length ? ('缺少：' + missing.join('、')) : '材料齐备';
}
// 数量档位（与 ResourceDisplayComponent 的"很少/较少/一般/较多/大量"一致）
function uiAmountDesc(amount) {
    var arr = ['很少', '较少', '一般', '较多', '大量'];
    for (var i = 0; i < arr.length - 1; i++) {
        if (amount < i * 10 + 10) return arr[i];
    }
    return arr[arr.length - 1];
}
// 地面物品按类别汇总的丰富度 title（含解释）
function uiRichHintForThings(things) {
    if (!things || getLength(things) === 0) return '地面可拾荒：无（已采尽）';
    var groups = {};
    for (var id in things) {
        var t = (typeof ITEM_DATA !== 'undefined' && ITEM_DATA[id] && ITEM_DATA[id].type) || '?';
        groups[t] = (groups[t] || 0) + things[id];
    }
    var parts = [];
    for (var t2 in groups) {
        var label = uiAmountDesc(groups[t2]);
        var typeName = (typeof TYPE_DATA !== 'undefined' && TYPE_DATA[t2] && TYPE_DATA[t2].name) || t2;
        parts.push(typeName + '：' + label + '（' + richnessHint(label) + '）');
    }
    return '地面可拾荒：' + parts.join('；');
}
// 背包+大箱子某物品持有量
function uiBagAmount(boxSaveData, attr) {
    var n = countBagItem(together(boxSaveData.bag.things, boxSaveData.bigBox.things), attr);
    return n;
}

// 科研台：以「只做一次」的方式消耗材料研究科技，成品存入 scienceTable
var ScienceComponent = React.createClass({
    contextTypes: {
        getScienceLevel: React.PropTypes.func.isRequired,
        buildingSaveData: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
    },
    // 研究完成后刷新背包容量（背包属性科技会扩大背包）
    onUpdate: function (name) {
        var level = this.context.getScienceLevel('背包属性');
        var boxSaveData = this.context.boxSaveData;
        boxSaveData['bag'].size = BAG_BASE_SIZE + level;
    },
    render: function () {
        return <StudioComponent onUpdate={this.onUpdate} type='scienceTable' alwayMakeOne={true} attachData={SCIENCE_DATA} />
    }
})
// 制作/科研/建筑升级通用组件：按 attachData(type) 列配方、计算耗时并执行
var StudioComponent = React.createClass({
    contextTypes: {
        buildingSaveData: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        useTime: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        useItem: React.PropTypes.func.isRequired,
        getMaxTimeOfRequire: React.PropTypes.func.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        getTheMaxTimeToUse: React.PropTypes.func.isRequired,
        getScienceLevel: React.PropTypes.func.isRequired,
        getBuildingLevel: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        checkFull: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        eventSaveData: React.PropTypes.object.isRequired,
        changeMsg: React.PropTypes.func.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            attachData: null,
            type: null,
            isBuildingUpdate: false,
            onUpdate: null
        }
    },
    getInitialState: function () {
        return {
            itemToMake: null,
            displayWindow: false,
            makeAmount: 1,
            cookAmount: 1,
            makeAmountMax: 1,
            require: null,
            alwayMakeOne: false,
            // U4：配方列表搜索 / 只看可制作（受控输入，ES5）
            recipeSearch: '',
            onlyCraftable: false,
        }
    },
    // U4：配方搜索框变化
    handleRecipeSearch: function (sender) {
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        this.setState({ recipeSearch: obj.value || '' });
    },
    // U4：切换「只看可制作」
    toggleOnlyCraftable: function () {
        this.setState({ onlyCraftable: !this.state.onlyCraftable });
    },
    // 键盘可达：Enter / Space 触发制作面板
    handleMakeKeyDown: function (attr, event) {
        if (event.keyCode === 13 || event.keyCode === 32) {
            event.preventDefault();
            this.makeWindow(attr);
        }
    },
    // 计算实际耗时：制作台属性科技会缩短制造台的制作时间
    getTimeNeed: function (timeNeed) {
        if (this.props.attachData != MAKE_DATA) return timeNeed;
        var level = this.context.getScienceLevel('制作台属性');
        return Math.pow(MAKE_SPEED_MUL, level) * timeNeed;
    },
    // 执行制作：按数量扣除材料，耗时结束后把产物放入对应成品箱
    make: function (name) {
        var data = this.props.attachData[name];
        var amount = this.state.makeAmount;
        this.context.useItemThatPlayerHave(cloneMul(data.require, amount));
        function callBack() {
            this.context.changeItem(o(name, amount * (data.amount || 1)), this.props.type);
            this.context.showMsg(<p key={Math.random()}>已制作：{(ITEM_DATA[name] && ITEM_DATA[name].name) || name} {fmtQty(amount * (data.amount || 1))}（耗时 {fmtHours(this.getTimeNeed(data.timeNeed * amount))}）</p>);
            // setTimeout((function(){
            if (this.props.alwayMakeOne) {
                this.setState({ displayWindow: null });
                if (this.props.onUpdate) {
                    this.props.onUpdate(name);
                }
            } else {
                this.updateSchedule();
            }
            if (!this.props.alwayMakeOne) this.makeWindow(name);

            // }).bind(this),0);
        }
        this.context.useTime(callBack.bind(this), this.getTimeNeed(data.timeNeed * amount));
        if (data.timeNeed * amount > 2) this.context.AudioEngine.playEffect('build');
    },
    // 执行建筑升级：扣除材料并把该升级项记入对应容器
    updateBuilding: function (name) {
        var data = BUILDING_UPDATE_DATA[this.props.type][name];
        var o = {};
        o[name] = 1;
        this.context.useItemThatPlayerHave(data.require);
        function callBack() {
            this.context.changeItem(o, this.props.type);
            this.context.showMsg(<p key={Math.random()}>已升级：{(ITEM_DATA[name] && ITEM_DATA[name].name) || name}（耗时 {fmtHours(data.timeNeed)}）</p>);
            if (this.props.onUpdate) {
                this.props.onUpdate(name);
            }
        }
        this.context.useTime(callBack.bind(this), data.timeNeed);
        if (data.timeNeed > 2) this.context.AudioEngine.playEffect('build');
    },
    // 打开某配方的「数量安排」面板
    makeWindow: function (name) {
        var require = this.props.attachData[name].require;
        this.context.AudioEngine.playEffect('open');
        this.setState({
            itemToMake: name,
            makeAmount: 1,
            displayWindow: true,
            require: require,
            makeAmountMax: this.context.getMaxTimeOfRequire(require)
        });
    },
    // 根据输入与剩余时间夹取可制作数量
    updateSchedule: function (sender) {
        // var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        var value = parseInt($('.scheduleInput')[0].value);
        // var value =  parseInt(obj.value);
        if (isNaN(value)) value = 1;
        if (value > this.state.makeAmountMax) value = this.state.makeAmountMax;
        if (value < 1) value = 1;
        var maxTime = this.context.getTheMaxTimeToUse();
        var maxAmount = Math.floor(maxTime / this.getTimeNeed(this.props.attachData[this.state.itemToMake].timeNeed) || 1);
        if (value > maxAmount) value = maxAmount;
        this.setState({ makeAmount: value });
    },
    // 依据烹饪锅内的材料匹配菜谱，返回可做的成品（无匹配返回 false）
    getCookResult: function () {
        var metList = this.context.boxSaveData.cooker.things;
        if (getLength(metList) < 2) return false;
        for (var i = COOK_DATA.length - 1; i >= 0; i--) {
            var require = COOK_DATA[i].require;
            if (require.length == 1) {
                var flag = false;
                for (var attr in metList) {
                    if (attr == require[0]) {
                        flag = true;
                        break;
                    }
                }
            } else {
                flag = true;
                for (var attr in metList) {
                    if (!(require[0] == attr || require[1] == attr)) {
                        flag = false;
                        break;
                    }
                }
            }
            if (flag) return COOK_DATA[i].name;
        };
        return false;
    },
    // 计算当前材料与剩余时间下最多可烹调的数量
    checkMaxCookAmount: function () {
        var max = Math.floor(this.context.getTheMaxTimeToUse() * this.state.cookAmount / this.getCookTime());
        var met = this.context.boxSaveData.cooker.things;
        for (var attr in met) {
            if (max > met[attr]) max = met[attr];
        }
        return max;
    },
    // 夹取输入的烹调数量（1 ~ 上限）
    changeCookAmount: function (sender) {
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        // var value =  parseInt($('.scheduleInput')[0].value) ;
        var value = parseInt(obj.value);
        if (isNaN(value)) value = 1;
        if (value < 1) value = 1;

        var max = this.checkMaxCookAmount();
        if (value > max) {
            value = max;
        }
        this.setState({ cookAmount: value });
    },
    // 计算一次烹调耗时（受烹饪技能等级影响）
    getCookTime: function () {
        var amount = this.state.cookAmount;
        var level = this.context.getBuildingLevel('烹饪技能');
        var result = amount * COOK_TIME_NEED * (Math.pow(COOK_SPEED_MUL, level));
        return result;
    },
    // 执行烹调：扣除锅内材料并把成品放入 cooked 箱
    handleCook: function () {
        var met = this.context.boxSaveData.cooker.things;
        var cookResult = this.getCookResult();
        var amount = this.state.cookAmount;
        function callBack() {
            var o = {};
            for (var attr in met) {
                o[attr] = amount;
            };
            this.context.useItem(o, 'cooker');
            o = {};
            o[cookResult] = amount;
            this.context.changeItem(o, 'cooked');
            this.setState({ cookAmount: 1 });
        }
        this.context.useTime(callBack.bind(this), this.getCookTime());
    },
    render: function () {
        // return <p></p>;
        var type = this.props.type;//选择类型，名称为对于的成品箱子名称
        if (this.props.isBuildingUpdate) {
            //建筑升级的情况
            var result = getUpdateDesc.bind(this)();
            if (!result) return null;
            return <div>
                <div className='updateOuter'>
                    <div className="studioTableOuter">
                        <table className="table table-condensed table-hover ">
                            <thead><tr><td>升级项</td><td>需求</td><td>耗时</td><td>操作</td></tr></thead>
                            <tbody>
                                {result}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        } else {
            //生产的情况
            var attachData = this.props.attachData;
            var boxList = this.context.boxSaveData;//选择箱子
            var box = boxList[type];

            //烹调的情况
            if (type == 'cooked') {
                var cookResult = this.getCookResult();
                var maxCook = this.checkMaxCookAmount();
                var cookReason = '';
                if (this.state.cookAmount == 0 || this.state.cookAmount > maxCook) cookReason = '烹调数量无效（缺少食材或数量超出）';
                else if (this.context.getTheMaxTimeToUse() < 1) cookReason = '满腹或水分不足，撑不过烹调耗时';
                var disabled = cookReason != '';
                if (!cookResult) {
                    return <div></div>;
                }
                return <div style={{ width: '100%', height: '100%' }}>
                    <div className=''>
                        <div className="tableOuter">
                            <table className="table table-condensed table-hover ">
                                <tbody>
                                    <tr>
                                        <td>{ITEM_DATA[cookResult].name}</td>
                                        <td>{ITEM_DATA[cookResult].desc}</td>
                                        <td><input className='scheduleInput form-control' value={String(this.state.cookAmount)} type='number' onChange={this.changeCookAmount} /></td>
                                        <td>耗时:{Math.round(this.getCookTime())}</td>
                                        <td><BtnComponent disabled={disabled} disabledReason={cookReason} desc='烹调' handleClick={this.handleCook} /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            }
            var result = getMakeDesc.bind(this)();

            return <div style={{ width: '100%', height: '100%' }}>
                <div className='viewOuter'>
                    <div className='makeFilter' style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '6px 8px', borderBottom: '1px solid #ddd', background: '#f6f7f2', flex: '0 0 auto' }}>
                        <input className='form-control' type='text' value={this.state.recipeSearch} placeholder='搜索配方名称…' onChange={this.handleRecipeSearch} style={{ width: '180px', minWidth: '120px', height: '28px', display: 'inline-block' }} />
                        <label style={{ margin: 0, fontWeight: 'normal', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type='checkbox' checked={this.state.onlyCraftable} onChange={this.toggleOnlyCraftable} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            只看可制作
                        </label>
                        <span style={{ color: '#888', fontSize: '12px' }}>已按可制作次数排序 · 可用上方搜索与筛选</span>
                    </div>
                    <div className="tableOuter studioTableOuter">
                        <div className="makeGroups">
                            {result}
                        </div>
                    </div>
                    <div className='studioBottom' >
                        {this.state.displayWindow ? schedule.bind(this)() : ''}
                        {this.props.alwayMakeOne ? null : <BoxComponent box={this.props.type} />}
                        <BtnBack />
                    </div>
                </div>
            </div>
        }
        // 剩余时间是否足够完成该配方
        function haveTimeToMake(item) {
            var item = item || this.state.itemToMake;
            return this.context.getTheMaxTimeToUse() >= (this.props.attachData || BUILDING_UPDATE_DATA[type])[item].timeNeed
        }
        // 建筑升级列表：过滤已完成项与未满足的科技前置，校验材料/时间
        function getUpdateDesc() {
            var self = this;
            var list = BUILDING_UPDATE_DATA[type];
            var result = [];
            var count = 0;
            for (var attr in list) {
                var tmp = list[attr];
                if (this.context.boxSaveData[type].things[attr]) continue;
                //科技类的物品的检查
                if (BUILDING_UPDATE_DATA[type][attr].science && !this.context.boxSaveData[type].things[BUILDING_UPDATE_DATA[type][attr].science]) continue;
                var noMaterial = !this.context.checkHaveResourceAll(tmp.require, true);
                var noTime = !haveTimeToMake.bind(this, attr)();
                var missText = uiMissingText(tmp.require, function (id) { return uiBagAmount(self.context.boxSaveData, id); });
                var updateReason = noMaterial ? missText : (noTime ? ('时间不足：需 ' + fmtHours(tmp.timeNeed) + '，当前最多 ' + fmtHours(this.context.getTheMaxTimeToUse()) + '（先进食/饮水或睡觉）') : '');
                var disabled = noMaterial || noTime;
                result.push(<tr key={'update' + count} title={getItemInfoText(attr)} onMouseEnter={this.context.changeMsg.bind(null, attr, 'item')}>
                    <td>{ITEM_DATA[attr] ? ITEM_DATA[attr].name : attr}</td>
                    <td title={missText}>{uiReqText(tmp.require)}<div style={{ color: noMaterial ? COLOR.RED : COLOR.GREEN, fontSize: '12px' }}>{missText}</div></td>
                    <td>{fmtHours(tmp.timeNeed)}</td>
                    <td>
                        <BtnComponent disabled={disabled} disabledReason={updateReason} handleClick={this.updateBuilding.bind(this, attr)} desc="升级" />
                    </td>
                </tr>);
                count++;
            };
            if (count == 0) return false;
            return result;
        }
        // 配方列表：过滤科技/事件/建筑前置，先按可制作次数排序再按类型分组
        function getMakeDesc() {
            var list = attachData;
            var bag = together(this.context.boxSaveData.bag.things, this.context.boxSaveData.bigBox.things);
            var entries = [];
            for (var attr in list) {
                var tmp = list[attr];
                //只需一次的，科技类的物品的检查
                if (this.props.alwayMakeOne && this.context.boxSaveData[type].things[attr]) continue;
                //需要科技的情况的检查
                if (attachData[attr].science && !this.context.boxSaveData['scienceTable'].things[attachData[attr].science]) continue;
                //需要事件的情况的检查
                if (attachData[attr].event && !this.context.eventSaveData[attachData[attr].event].experienced) continue;
                //需要建筑的情况的检查
                if (tmp.building && !this.context.buildingSaveData[tmp.building].own) continue;
                //U4：关键字过滤（配方 id 或显示名）
                var kw = String(this.state.recipeSearch || '').replace(/^\s+|\s+$/g, '').toLowerCase();
                if (kw) {
                    var shownName = ((ITEM_DATA[attr] && ITEM_DATA[attr].name) || attr).toLowerCase();
                    if (shownName.indexOf(kw) < 0 && String(attr).toLowerCase().indexOf(kw) < 0) continue;
                }
                //U4：只看当前材料能制作的配方
                if (this.state.onlyCraftable && getCraftableCount(tmp.require, bag) <= 0) continue;
                entries.push({ attr: attr, tmp: tmp });
            };
            // 先按「现有材料可制作的次数」从多到少排序，再按物品类型分组
            entries.sort(function (a, b) {
                return getCraftableCount(b.tmp.require, bag) - getCraftableCount(a.tmp.require, bag);
            });
            var MAKE_CATEGORY_ORDER = ['weapon', 'equip', 'tool', 'met', 'bullet', 'poizon', 'food', 'cooked', 'art', 'special', 'quest'];
            var groups = {};
            var catOrder = [];
            entries.forEach(function (entry) {
                var t = (ITEM_DATA[entry.attr] && ITEM_DATA[entry.attr].type) || '?';
                if (!groups[t]) {
                    groups[t] = [];
                    catOrder.push(t);
                }
                groups[t].push(entry);
            });
            catOrder.sort(function (a, b) {
                var ia = MAKE_CATEGORY_ORDER.indexOf(a); if (ia < 0) ia = 99;
                var ib = MAKE_CATEGORY_ORDER.indexOf(b); if (ib < 0) ib = 99;
                return ia - ib;
            });
            if (entries.length == 0) {
                return <p className='makeEmpty' style={{ padding: '8px', color: '#666' }}>没有匹配的配方（可清空搜索或关闭「只看可制作」）。</p>;
            }
            return catOrder.map(function (cat) {
                return <div className='makeGroup' key={cat}>
                    <div className='makeGroupTitle'>{TYPE_DATA[cat] ? TYPE_DATA[cat].name : cat}</div>
                    <div className='makeGrid'>
                        {groups[cat].map(function (entry, count) {
                            var attr = entry.attr, tmp = entry.tmp;
                            var craftCount = getCraftableCount(tmp.require, bag);
                            var prodAmount = tmp.amount || 1;
                            var prodName = (ITEM_DATA[attr] && ITEM_DATA[attr].name) || attr;
                            var missText = uiMissingText(tmp.require, function (id) { return countBagItem(bag, id); });
                            var countText = this.props.alwayMakeOne ? '只可研究 1 次' : ('可做 ' + fmtNum(craftCount) + ' 次');
                            var metaText = countText + ' · 耗时 ' + fmtHours(this.getTimeNeed(tmp.timeNeed)) + ' · 产出 ' + prodName + ' ' + fmtQty(prodAmount);
                            return <div className='makeItem' tabIndex={0} role='button' onClick={this.makeWindow.bind(this, attr)} onKeyDown={this.handleMakeKeyDown.bind(this, attr)} key={'make_' + cat + '_' + count} title={getItemInfoText(attr) + '\n' + metaText + '\n' + missText} onMouseEnter={this.context.changeMsg.bind(null, attr, 'item')}>
                                <span className='makeName'>{prodName}{prodAmount > 1 ? ' ' + fmtQty(prodAmount) : null}</span>
                                <span className='makeRequire' style={{ color: craftCount > 0 ? COLOR.GREEN : COLOR.RED }}>{uiReqText(tmp.require)}</span>
                                <span className='makeMeta' style={{ display: 'block', fontSize: '11px', color: '#666' }}>{metaText}</span>
                            </div>;
                        }.bind(this))}
                    </div>
                </div>;
            }.bind(this));
        }
        // 数量安排面板：列出清单/消耗/耗时并执行制作
        function schedule() {
            var self = this;
            var name = this.state.itemToMake;
            var amount = this.state.makeAmount;
            var require = this.props.attachData[name].require;
            var totalRequire = cloneMul(require, amount);
            var totalTime = this.getTimeNeed(this.props.attachData[name].timeNeed * amount);
            //检查产物寄存是否被占用
            var makeNoMaterial = !this.context.checkHaveResourceAll(totalRequire, true);
            var makeNoTime = !haveTimeToMake.bind(this, name)();
            var makeBoxFull = (!this.props.alwayMakeOne && this.context.checkFull(this.props.type, name));
            var missText = uiMissingText(totalRequire, function (id) { return uiBagAmount(self.context.boxSaveData, id); });
            var makeReason = makeNoMaterial ? missText
                : (makeNoTime ? ('时间不足：需 ' + fmtHours(totalTime) + '，当前最多 ' + fmtHours(this.context.getTheMaxTimeToUse()) + '（先进食/饮水或睡觉）')
                    : (makeBoxFull ? '成品容器已满：先转移或使用容器内成品' : ''));
            var disabled = makeNoMaterial || makeNoTime || makeBoxFull;

            return <div className='schedule'>
                <table className="table table-hover ">
                    <thead><tr><td>清单</td>{this.props.alwayMakeOne ? null : <td>个数</td>}<td>消耗</td><td>耗时</td><td></td></tr></thead>
                    <tbody><tr>
                        <td>{ITEM_DATA[name].name} {fmtQty(amount)}</td>
                        {this.props.alwayMakeOne ? null : <td><input className='scheduleInput form-control' value={String(amount)} type='number' onChange={this.updateSchedule} /></td>}
                        <td>{uiReqText(totalRequire)}<div style={{ color: makeNoMaterial ? COLOR.RED : COLOR.GREEN, fontSize: '12px' }}>{missText}</div></td>
                        <td>{fmtHours(totalTime)}</td>
                        <td><BtnComponent disabled={disabled} disabledReason={makeReason} handleClick={this.make.bind(this, name)} desc="执行" /></td>
                    </tr></tbody>
                </table>
            </div>
        }
    }
});
// 家中建筑入口按钮：按建筑类型打开对应的功能窗口
var BuildingComponent = React.createClass({
    getDefaultProps: function () {
        return {
            building: null,
        }
    },
    contextTypes: {
        callWindow: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        buildingSaveData: React.PropTypes.object.isRequired,
    },
    callWindow: function (wind) {
        this.context.callWindow(wind);
    },
    handleKeyDown: function (event) {
        if (event.keyCode === 13 || event.keyCode === 32) {
            event.preventDefault();
            this.handleClick();
        }
    },
    handleClick: function () {
        this.context.AudioEngine.playEffect('pick');
        var buildingMap = {
            trap: <TrapComponent />,
            makeTable: <StudioComponent type='makeTable' attachData={MAKE_DATA} />,
            alchemyTable: <StudioComponent type='alchemyTable' attachData={ALCHEMY_DATA} />,
            magicTable: <StudioComponent type='magicTable' attachData={MAGIC_DATA} />,
            scienceTable: <ScienceComponent />,
            build: <BuildComponent />,
            cooker: <CookerComponent />,
            well: <WellComponent />,
            bigBox: <BigBoxComponent />,
            farm: <WaitMakeComponent building='farm' attachData={CROP_DATA} />,
            alco: <WaitMakeComponent building='alco' attachData={ALCO_DATA} />,
            toilet: <ToiletComponent />,
            sleepPlace: <SleepPlaceComponent />,
        }
        var wind = buildingMap[this.props.building];
        this.callWindow(wind);
    },
    render: function () {
        var buildingSaveData = this.context.buildingSaveData;
        var building = this.props.building;
        var size = (BUILDING_LAYOUT[building] && BUILDING_LAYOUT[building].size) || 'medium';
        return (
            <div tabIndex={0} role='button' onClick={this.handleClick} onKeyDown={this.handleKeyDown} className={'building btn btn-default building-' + size}>
                {BUILDING_DATA[building].name}
                {buildingSaveData[building].hint ? <span className='badge'>!</span> : null}
            </div>
        );
    }
});
// 通用耗时行动：按 canGet/require 与次数执行一次动作（拾荒/取水等），支持冷却
var ActionComponent = React.createClass({
    contextTypes: {
        getTheMaxTimeToUse: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        useItemThatPlayerHave: React.PropTypes.func.isRequired,
        playerStateChange: React.PropTypes.func.isRequired,
        playerState: React.PropTypes.object.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        setcoolDownSaveData: React.PropTypes.func.isRequired,
        getcoolDownSaveData: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            canGet: null,
            desc: '',
            timeNeed: 1,
            changable: false,
            require: null,
            action: null,
            coolDown: null,
            disabled: false,
            props: {},
        }
    },
    getInitialState: function () {
        return {
            timeNeed: 1
        }
    },
    // 夹取行动次数（1 ~ 剩余可支配时间）
    updateSchedule: function (sender) {
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        // var value =  parseInt($('.scheduleInput_'+this.props.type)[0].value);
        var value = parseInt(obj.value);
        if (this.state.timeNeed == value) return;
        if (isNaN(value)) value = 1;
        var max = this.context.getTheMaxTimeToUse();
        value = max < value ? max : value;
        value = value < 1 ? 1 : value;
        this.setState({ timeNeed: value }, function () {
        });
    },
    // 执行行动：按次数结算产出与消耗，必要时写入冷却
    act: function () {
        var timeNeed = this.state.timeNeed;
        var canGet = this.props.canGet;
        canGet = cloneMul(canGet, timeNeed);
        var require = cloneMul(this.props.require, this.state.timeNeed);
        var stateCanGet = {};
        for (var attr in canGet) {
            if (this.context.playerState[attr] != undefined) {
                stateCanGet[attr] = canGet[attr];
                delete canGet[attr];
            }
        };
        for (var attr in canGet) {
            canGet[attr] = Math.floor(canGet[attr]);
        }
        function callBack() {
            this.context.playerStateChange(stateCanGet);
            this.context.changeItem(canGet, 'shit');
            this.context.useItemThatPlayerHave(require, 'bag');
            if (this.props.coolDown) {
                this.context.setcoolDownSaveData(this.props.action, this.props.coolDown);
            }
        }
        this.context.useTime(callBack.bind(this), timeNeed, this.props.props);
    },
    render: function () {
        var name = this.state.itemToMake;
        var amount = this.state.makeAmount;
        var canGet = this.props.canGet;
        canGet = cloneMul(canGet, this.state.timeNeed);
        for (var attr in canGet) {
            canGet[attr] = Math.floor(canGet[attr]);
        }
        function getTimeDesc() {
            if (this.props.changable) {
                return <span><input value={this.state.timeNeed} className={'scheduleInput form-control scheduleInput_' + this.props.type} type='number' onChange={this.updateSchedule} /> 小时</span>
            } else {
                return <span>{fmtHours(this.props.timeNeed)}</span>
            }
        }
        var require = this.props.require;
        var requireNow = require ? cloneMul(require, this.state.timeNeed) : null;
        var getHave = function (id) {
            if (selfState && selfState.playerState && selfState.playerState[id] != undefined) return selfState.playerState[id].amount;
            return uiBagAmount(selfState.boxSaveData, id);
        };
        var selfState = this;
        var noMaterial = require ? !this.context.checkHaveResourceAll(requireNow, true) : false;
        var noTime = this.context.getTheMaxTimeToUse() < this.state.timeNeed;
        var missText = require ? uiMissingText(requireNow, getHave) : '';
        var actionReason = this.props.disabled ? (this.props.disabledReason || '当前不可用')
            : (noMaterial ? missText
                : (noTime ? ('时间不足：需 ' + fmtHours(this.state.timeNeed) + '，当前最多 ' + fmtHours(this.context.getTheMaxTimeToUse()) + '（先进食/饮水或睡觉）') : ''));
        var disabled = this.props.disabled || noTime || noMaterial;

        var coolDown = this.context.getcoolDownSaveData(this.props.action);
        var hasCooledDown = (coolDown == 0 || coolDown == undefined);
        return <div className='schedule'>
            <table className="table table-hover ">
                <thead><tr>{require ? <td>需求</td> : null}<td>获得</td><td>耗时</td><td></td></tr></thead>
                <tbody><tr>
                    {require ? <td>{uiReqText(requireNow)}<div style={{ color: noMaterial ? COLOR.RED : COLOR.GREEN, fontSize: '12px' }}>{missText}</div></td> : null}
                    <td>{uiReqText(canGet)}</td>
                    <td>{getTimeDesc.bind(this)()}</td>
                    {hasCooledDown ? <td><BtnComponent disabled={disabled} disabledReason={actionReason} handleClick={this.act.bind(this, name)} desc={this.props.desc} /></td> : <td><BtnComponent disabled={true} disabledReason={'冷却中：还需 ' + fmtHours(coolDown) + '（可先做别的事）'} desc={this.props.desc + '（恢复中）'} /></td>}
                </tr></tbody>
            </table>
        </div>
    }
});
