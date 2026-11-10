/**
 * src/ui/common.js —— 通用 UI 小组件
 * 由原 main.js 拆分而来。含：物品格、向量格、需求显示、进度条、各类按钮、
 * 容器、返回/回家按钮、调试组件、消息框、大箱子转移等基础部件。
 */

//游戏逻辑层/////////////////////////////////////////////////////////////////////////////
//tiny components
//小组件
// ===== 0) UX 基础工具（对比度/键盘/移动端面板切换） =====
// sRGB 相对亮度（WCAG），用于自动选择可读的前景/背景组合
function uxRelLum(r, g, b) {
    function f(c) {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
// 给定底色，返回黑或白中对比度更高的前景（分界 0.18 时两者均 ≥ 4.5:1）
function uxReadableText(r, g, b) {
    return uxRelLum(r, g, b) > 0.18 ? '#000000' : '#ffffff';
}
// 把任意颜色压暗到“白底上对比度 ≥ 4.5:1”，用于物品类型色（保留色相，不改数据表）
function uxContrastOnWhite(color) {
    var hex = String(color || '').replace('#', '');
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return COLOR.BLACK;
    var r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    if (1.05 / (uxRelLum(r, g, b) + 0.05) >= 4.5) return '#' + hex;
    for (var i = 1; i <= 20; i++) {
        var k = 1 - i * 0.04;
        var rr = Math.round(r * k), gg = Math.round(g * k), bb = Math.round(b * k);
        if (1.05 / (uxRelLum(rr, gg, bb) + 0.05) >= 4.5) return 'rgb(' + rr + ',' + gg + ',' + bb + ')';
    }
    return COLOR.BLACK;
}
// 简化 class 切换（body 级开关：移动端背包 / 桌面端收起背包）
function uxSetBodyClass(cls, on) {
    if (typeof document === 'undefined' || !document.body) return;
    var list = String(document.body.className || '').split(/\s+/);
    var out = [];
    for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i] !== cls) out.push(list[i]);
    }
    if (on) out.push(cls);
    document.body.className = out.join(' ');
}
function uxIsNarrow() {
    return (typeof window !== 'undefined') && window.innerWidth <= 900;
}
// 移动端：场景/背包互斥切换；桌面端：收起/展开右侧背包栏
function uxToggleBagPanel() {
    if (uxIsNarrow()) {
        var open = String(document.body.className || '').indexOf('mobile-bag-open') >= 0;
        uxSetBodyClass('bag-collapsed', false);
        uxSetBodyClass('mobile-bag-open', !open);
        // 打开背包时从顶部展示（装备栏 → 详情 → 属性 → 物品格），不要自动滚到物品格
        if (!open) {
            var pb = document.querySelector('.equipMain > .panel-body');
            if (pb) pb.scrollTop = 0;
        }
    } else {
        var collapsed = String(document.body.className || '').indexOf('bag-collapsed') >= 0;
        uxSetBodyClass('mobile-bag-open', false);
        uxSetBodyClass('bag-collapsed', !collapsed);
    }
}
function uxCloseBagPanel() {
    uxSetBodyClass('mobile-bag-open', false);
    uxSetBodyClass('bag-collapsed', false);
}
// 让可点 div 支持 Enter/Space（配合 tabIndex/role 使用）
function uxKeyActivate(handler) {
    return function (event) {
        if (event.keyCode === 13 || event.keyCode === 32) {
            event.preventDefault();
            this._uxKeyHandled = true;
            handler.call(this, event);
        }
    };
}
// 注：src/main.js 已移除全局空格/回车拦截（由 code-auditor 修复），
// 因此这里不再需要捕获阶段的按键守卫。

// 深色绿：白底对比度 5.5:1（原 #74AB6A 仅 2.7:1），供需求/加成等文字使用
var UX_GREEN = '#3f6b32';

// 需求项名称：物品名优先，其次状态名（体力/精神/满腹/水分/生命/体温）。
// lib.js 的 fmtItemName 只认识 ITEM_DATA，需求里的 ps/san 等状态会显示成 id，这里补一层。
function uxDisplayName(id) {
    if (typeof ITEM_DATA !== 'undefined' && ITEM_DATA[id] && ITEM_DATA[id].name) return ITEM_DATA[id].name;
    if (typeof STATE_DATA !== 'undefined' && STATE_DATA[id] && STATE_DATA[id].name) return STATE_DATA[id].name;
    return String(id);
}
// 需求列表 → "体力 ×5、斧头 ×1"
function uxReqText(require) {
    if (!require) return '';
    var parts = [];
    if (require instanceof Array) {
        for (var i = 0; i < require.length; i++) parts.push(uxDisplayName(require[i]));
        return parts.join('、');
    }
    for (var attr in require) parts.push(uxDisplayName(attr) + ' ' + fmtQty(require[attr]));
    return parts.join('、');
}
// 缺失材料 → "缺少：体力 ×2、斧头 ×1"（amounts 可为对象或函数：返回当前拥有数量）
function uxMissingText(require, amounts) {
    if (!require) return '';
    var getAmount = (typeof amounts === 'function') ? amounts : function (id) {
        return (amounts && amounts[id]) || 0;
    };
    var missing = [];
    for (var attr in require) {
        var need = require[attr];
        var have = getAmount(attr);
        if (have < need) missing.push(uxDisplayName(attr) + ' ' + fmtQty(need - have));
    }
    return missing.length ? ('缺少：' + missing.join('、')) : '材料齐备';
}

// ===== 1) 通用 UI 组件 =====
// 单个物品格：显示名称/数量/耐久；左键选中（详情常驻）并保留转移，右键使用/装备
var ItemComponent = React.createClass({
    //物体组件
    getDefaultProps: function () {
        return {
            item: null,
            amount: 0,
            box: null,
            handleClick: null,
        }
    },
    contextTypes: {
        useItem:              React.PropTypes.func.isRequired,
        useTime:              React.PropTypes.func.isRequired,
        changeMsg:            React.PropTypes.func.isRequired,
        handleExchange:       React.PropTypes.func.isRequired,
        playerStateChange:    React.PropTypes.func.isRequired,
        isDueling:            React.PropTypes.bool.isRequired,
        AudioEngine:          React.PropTypes.object.isRequired,
        durableSaveData:      React.PropTypes.object.isRequired,
        getMaxDurable:        React.PropTypes.func.isRequired,
        currentEquip:         React.PropTypes.object.isRequired,
        detailedItem:         React.PropTypes.string.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        skill:                React.PropTypes.object.isRequired,
        dungeonSaveData:      React.PropTypes.object.isRequired,
        mstState:             React.PropTypes.object.isRequired,
        showMsg:              React.PropTypes.func.isRequired,
        handleItemClick:      React.PropTypes.func.isRequired,
    },
    itemMouseEnter: function () {
        this.context.changeMsg(this.props.item, 'item');
    },
    // 选中物品：详情面板常驻显示（桌面/触屏一致），不再依赖鼠标悬停
    selectItem: function () {
        this.context.changeMsg(this.props.item, 'item');
        // 窄屏（背包为全屏面板）时把详情滚进视野，避免“点了没变化”
        if (uxIsNarrow()) {
            var detail = document.getElementById('detail');
            if (detail && detail.scrollIntoView) {
                try { detail.scrollIntoView({ block: 'nearest' }); } catch (e) { }
            }
        }
    },
    itemMouseClick: function (event) {
        // this.context.AudioEngine.playEffect('pick');

        if (event) {
            CTRL_PRESSED = event.ctrlKey;
            SHIFT_PRESSED = event.shiftKey;
        }

        // 单击先选中，让右侧详情常驻；有容器打开时仍保留原来的“点击转移”行为
        this.selectItem();
        if (this.props.handleClick) {
            this.props.handleClick();
        }
        this.context.handleExchange(this.props.item, this.props.box, this.context.isDueling);
    },
    itemKeyDown: function (event) {
        uxKeyActivate(this.selectItem).call(this, event);
    },
    // 供 shouldComponentUpdate 使用的渲染签名（装备高亮 / 耐久 / 选中态）
    getItemSignature: function (ctx) {
        var item = this.props.item;
        var wear = 0;
        if (ctx.durableSaveData && typeof durableWear === 'function') {
            wear = durableWear(ctx.durableSaveData, item);
        }
        var equipped = '';
        for (var slot in ctx.currentEquip) {
            if (ctx.currentEquip[slot] === item) equipped += slot + ',';
        }
        return wear + '|' + equipped + '|' + (ctx.detailedItem === item ? '1' : '0');
    },
    shouldComponentUpdate: function (nextProps, nextState, nextContext) {
        if (nextProps.item !== this.props.item || nextProps.amount !== this.props.amount ||
            nextProps.box !== this.props.box || nextProps.handleClick !== this.props.handleClick) {
            return true;
        }
        var ctx = nextContext || this.context;
        var sig = this.getItemSignature(ctx);
        if (sig !== this._uxSig) {
            this._uxSig = sig;
            return true;
        }
        return false;
    },
    itemClickRight: function (event) {
        var item = this.props.item;
        var box = this.props.box;
        event.preventDefault();
        //装备切换
        if (box != 'bag' && ITEM_DATA[item].equipType) {
            this.itemMouseClick(event);
        }
        if (this.props.handleClick) {
            this.props.handleClick();
        }

        this.context.handleItemClick(item, box);

    },
    checkIfISCurrentEquip: function () {
        var item = this.props.item;
        if (!ITEM_DATA[item] || !ITEM_DATA[item].equipType) return false;
        var currentEquip = this.context.currentEquip;
        for (var slot in currentEquip) {
            if (currentEquip[slot] == item) return true;
        }
        return false;
    },
    render: function () {
        var item = this.props.item;
        var isCurrentEquip = this.checkIfISCurrentEquip(item);
        var isSelected = this.context.detailedItem === item;
        var maxDurable = this.context.getMaxDurable(item);
        this._uxSig = this.getItemSignature(this.context);
        var typeColor = uxContrastOnWhite((TYPE_DATA[ITEM_DATA[this.props.item].type] || {}).color || COLOR.BLACK);
        var name = ITEM_DATA[item].name;
        return <div className={"item " + (isCurrentEquip ? 'currentEquip ' : '') + (isSelected ? 'itemSelected' : '')}
            tabIndex="0" role="button" aria-label={fmtItemQty(item, this.props.amount) + (isCurrentEquip ? '（已装备）' : '')}
            title={fmtItemQty(item, this.props.amount) + (ITEM_DATA[item].desc ? '：' + ITEM_DATA[item].desc : '')}
            onMouseEnter={this.itemMouseEnter} onClick={this.itemMouseClick}
            onKeyDown={this.itemKeyDown} onContextMenu={this.itemClickRight}>
            <p style={{ color: typeColor }}>{name}</p>
            {ITEM_DATA[item].durable ? <ProgressComponent addStyle={{ position: 'absolute', width: '30px', left: '9px', top: '22px', height: '5px' }} max={maxDurable} current={maxDurable - durableWear(this.context.durableSaveData, item)} /> : null}
            <span className="badge itemAmount">{fmtNum(this.props.amount)}</span>
        </div>
    }
});
// 单个状态格：显示状态名与数值，按数值插值底色，悬停展示说明
// 状态含义与恢复方式（状态栏 title / 说明用，纯文案）
var STATE_HELP = {
    hp: '生命归零会死亡。恢复：进食、使用药剂，或在床铺睡觉。',
    ps: '采集与战斗会消耗体力，体力不足时无法行动。恢复：在床铺睡觉、进食。',
    full: '满腹随时间下降，归零后会开始损失生命。恢复：进食。',
    moist: '水分随时间下降，归零后会开始损失生命。恢复：饮水（水井、溪流、饮用水）。',
    san: '夜间在外或熬夜会下降，精神过低会影响战斗。恢复：睡觉或在安全处休息。',
    temp: '体温受季节与环境影响：过高会流失水分，过低会流失体力。恢复：穿衣保暖或降温。'
};
// 仅“怎么恢复”的简短版本（状态详情行用）
var STATE_RECOVER = {
    hp: '进食、使用药剂，或回家在床铺睡觉。',
    ps: '在床铺睡觉、进食。',
    full: '进食。',
    moist: '饮水（水井、溪流、饮用水）。',
    san: '睡觉，或在安全的地方休息。',
    temp: '穿衣保暖，或靠近热源/降温。'
};
var StateVectorComponent = React.createClass({
    contextTypes: {
        playerState: React.PropTypes.object.isRequired,
        changeMsg: React.PropTypes.func.isRequired,
        getTempDesc: React.PropTypes.func.isRequired,
        getMaxState: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            state: null
        }
    },
    showMsg: function () {
        this.context.changeMsg(this.props.state, 'state');
    },
    stateKeyDown: function (event) {
        uxKeyActivate(this.showMsg).call(this, event);
    },
    render: function () {
        var playerState = this.context.playerState;
        var state = playerState[this.props.state];
        var stateName = STATE_DATA[this.props.state].name;
        var max = this.context.getMaxState(this.props.state);
        var isTemp = this.props.state == 'temp';
        function getColor(num) {
            var color_0, color_1, r, g, b;
            if (isTemp) {
                color_1 = { r: 100, g: 177, b: 255 };
                color_0 = { r: 255, g: 177, b: 100 };
                var offset = num + 50;
                offset = offset < 0 ? 0 : offset;
                offset = offset > 100 ? 100 : offset;
                r = Math.floor((Math.abs(offset)) * (color_0.r - color_1.r) / max + color_1.r);
                g = Math.floor((Math.abs(offset)) * (color_0.g - color_1.g) / max + color_1.g);
                b = Math.floor((Math.abs(offset)) * (color_0.b - color_1.b) / max + color_1.b);
            } else {
                color_0 = { r: 162, g: 184, b: 168 };
                color_1 = { r: 43, g: 14, b: 11 };
                r = Math.floor((Math.abs(num)) * (color_0.r - color_1.r) / max + color_1.r);
                g = Math.floor((Math.abs(num)) * (color_0.g - color_1.g) / max + color_1.g);
                b = Math.floor((Math.abs(num)) * (color_0.b - color_1.b) / max + color_1.b);
            }
            return { r: r, g: g, b: b, css: 'rgb(' + r + ',' + g + ',' + b + ')' };
        }
        var bg = getColor(Math.ceil(state.amount));
        // 前景色按底色亮度自动选择，保证 ≥4.5:1（原先固定白字在浅底上只有 2.1:1）
        var fg = uxReadableText(bg.r, bg.g, bg.b);
        var cur = Math.ceil(state.amount);
        var levelText = isTemp ? TEMP_DATA[this.context.getTempDesc()].name : stateLevelText(cur, max);
        var levelKey = isTemp ? 'nice' : (levelText == '危险' ? 'danger' : (levelText == '偏低' ? 'low' : 'ok'));
        var valueText = isTemp ? levelText : (fmtNum(cur) + '/' + fmtNum(max));
        var stateHelp = STATE_HELP[this.props.state] || '';
        var tempDesc = isTemp ? TEMP_DATA[this.context.getTempDesc()].desc : '';
        var titleText = isTemp
            ? ('体温：' + levelText + '。' + tempDesc + stateHelp + ' 点击查看说明。')
            : (stateName + '：' + fmtNum(cur) + '/' + fmtNum(max) + '（' + levelText + '）。' + stateHelp + ' 点击查看说明。');
        var ariaText = stateName + ' ' + valueText + (isTemp ? '' : '（' + levelText + '）');
        return <div className="stateVector" tabIndex="0" role="button"
            aria-label={ariaText} title={titleText}
            onMouseEnter={this.showMsg} onClick={this.showMsg} onKeyDown={this.stateKeyDown}
            style={{ background: bg.css, color: fg }}>
            {stateName}
            <span className="badge"> {valueText} </span>
            {(levelKey == 'danger' || levelKey == 'low') ? <span className={'ux-stateLevel ux-stateLevel-' + levelKey} title={stateName + '：' + levelText + '，' + stateHelp}>{levelText}</span> : null}
        </div>
    }
});
// 通用向量格：上/下两行文本，可带底部按钮或进度条
var VectorComponent = React.createClass({
    getDefaultProps: function () {
        return {
            msg_top: null,
            msg_top_color: COLOR.BLACK,
            msg_bottom: null,
            msg_bottom_color: COLOR.BLACK,
            btn_bottom: null,
            onContextMenu: null,
        }
    },
    render: function () {
        function getBottom() {
            if (this.props.btn_bottom) {
                // 同时渲染底部说明（如进度条）与按钮（如 收获/取消）
                return <div>{this.props.msg_bottom}{this.props.btn_bottom}</div>
            } else {
                return <div style={{ color: this.props.msg_bottom_color }}>{this.props.msg_bottom}</div>
            }
        }
        return <div className='vector' onContextMenu={this.props.onContextMenu}>
            <div className="item">
                <div style={{ color: this.props.msg_top_color }}>{this.props.msg_top}</div>
                {getBottom.bind(this)()}
            </div>
        </div>
    }
});
// 需求显示：按拥有情况标红/绿显示材料数量，可选显示拥有总量
var RequireComponent = React.createClass({
    getDefaultProps: function () {
        return {
            requireList: null,
            checkHaveResource: null,
            isGreen: false,
            showTotal: false,
            withSpace: false,
            separator: null,
            haveBox: false,
        }
    },
    contextTypes: {
        checkHaveResource: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired
    },
    render: function () {
        var requireList = this.props.requireList;
        var boxSaveData = this.context.boxSaveData;
        if (this.props.haveBox) {
            var bag = together(boxSaveData.bag.things, boxSaveData.bigBox.things);
        } else {
            var bag = clone(this.context.boxSaveData.bag.things);
        };
        function mapRes() {
            var result = [];
            var count = 0;
            var total = getLength(requireList);

            for (var attr in requireList) {
                // if(count > 0 && count%2 == 0)result.push(<br key = {'br_'+count}/>);
                if (count > 0 && this.props.withSpace) result.push(<br key={'br_' + count} />);
                var amount = requireList[attr];
                var name = ITEM_DATA[attr] ? ITEM_DATA[attr].name : (STATE_DATA[attr] ? STATE_DATA[attr].name : attr);
                var have = countBagItem(bag, attr);
                var ok = this.props.isGreen ? true : this.context.checkHaveResource(attr, amount, bag);
                // 不只靠红/绿：同时给出 ✓/✗ 与可读 title（色盲/色弱可用）
                var mark = this.props.isGreen ? null : <span className="reqMark" aria-hidden="true">{ok ? '✓' : '✗'}</span>;
                var titleText = (ok ? '已满足：' : '缺少：') + name + ' ' + fmtQty(amount) + '（当前 ' + fmtNum(have) + '）';
                result.push(<span key={count} className={'resourceName reqItem ' + (ok ? 'reqOk' : 'reqMissing')}
                    title={titleText}
                    style={{ color: this.props.isGreen ? UX_GREEN : (ok ? UX_GREEN : COLOR.RED) }}>
                    {mark}
                    {name}
                    <span className="badge resourceAmount">
                        {this.props.showTotal ? (fmtNum(amount) + '/' + fmtNum(have)) : fmtNum(amount)}
                    </span>
                    {total == count + 1 ? null : this.props.separator}
                </span>);
                count++;
            };
            return result;
        }
        return <span>
            {mapRes.bind(this)()}
        </span>
    }
});
// 进度条：按 current/max 计算填充宽度
var ProgressComponent = React.createClass({
    getDefaultProps: function () {
        return {
            max: null,
            current: null,
            addStyle: {},
            addClass: '',
            addClassIn: 0,
        }
    },
    render: function () {
        return <div style={this.props.addStyle} className={"progress " + this.props.addClass}>
            <div className={"progress-bar progress-bar-striped active " + this.props.addClassIn} role="progressbar" aria-valuenow={this.props.current} aria-valuemin="0" aria-valuemax={this.props.max} style={{ width: (Math.ceil(100 * this.props.current / this.props.max)) + '%' }}>
            </div>
        </div>
    }
});
// 容器格子：按容器 size 渲染物品格与空格，进入时登记 currentBox
var BoxComponent = React.createClass({
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        setCurrentBox: React.PropTypes.func.isRequired,
        // 子物品格依赖这些 context：必须一并声明，否则 sCU 会挡住 context 变更
        detailedItem: React.PropTypes.string.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        durableSaveData: React.PropTypes.object.isRequired,
    },
    getDefaultProps: function () {
        return {
            box: '',
            isRegister: false,
            handleClick: null
        };
    },
    getInitialState: function () {
        return {
            items: null,
            size: null
        }
    },
    componentWillMount: function () {
        var box = this.context.boxSaveData[this.props.box];
        if (this.props.box != 'bag' && !box.isDone) {
            this.context.setCurrentBox(this.props.box);
        }
    },
    componentWillUnmount: function () {
        var box = this.context.boxSaveData[this.props.box];
        if (this.props.box != 'bag' && !box.isDone) this.context.setCurrentBox('');
    },
    // 只在“本容器内容/容量变化”或 props 变化时重渲染，减少后期满背包的整树重绘
    getBoxSignature: function (ctx) {
        var box = ctx.boxSaveData && ctx.boxSaveData[this.props.box];
        if (!box) return 'none';
        return JSON.stringify(box.things || {}) + '|' + box.size;
    },
    shouldComponentUpdate: function (nextProps, nextState, nextContext) {
        if (nextProps.box !== this.props.box || nextProps.isRegister !== this.props.isRegister ||
            nextProps.handleClick !== this.props.handleClick) {
            return true;
        }
        var ctx = nextContext || this.context;
        var sig = this.getBoxSignature(ctx);
        if (sig !== this._uxBoxSig) {
            this._uxBoxSig = sig;
            return true;
        }
        // 即使容器内容不变，选中物品 / 装备变化也要让子物品格更新
        if (ctx.detailedItem !== this.context.detailedItem) return true;
        if (JSON.stringify(ctx.currentEquip) !== JSON.stringify(this.context.currentEquip)) return true;
        if (JSON.stringify(ctx.durableSaveData) !== JSON.stringify(this.context.durableSaveData)) return true;
        return false;
    },
    render: function () {
        var box = this.context.boxSaveData[this.props.box];
        this._uxBoxSig = this.getBoxSignature(this.context);
        function createVector() {
            var result = [];
            var count = 0;
            var itemList = box.things;
            // 拾取/交易暂存不再额外渲染一个无标签空格子（原先会显示成“神秘白盒”）
            var bagSize = this.props.isRegister ? getLength(box.things) : box.size;
            for (var attr in itemList) {
                result.push(
                    <li className="vector" key={count}>
                        <ItemComponent handleClick={this.props.handleClick} item={attr} box={this.props.box} amount={itemList[attr]} key={attr} />
                    </li>
                )
                count++;
            };
            for (var i = count; i < bagSize; i++) {
                result.push(<li className="vector" key={count}></li>);
                count++;
            };
            return result;
        };
        var list = <ul className="boxList">
            {createVector.bind(this)()}
        </ul>;
        if (this.props.box === 'bigBox') {
            var used = getLength(box.things);
            var cap = box.size || 0;
            var ratio = cap > 0 ? used / cap : 0;
            var capHint = ratio >= 0.9 ? '（快满了：可先整理，或升级大箱子扩容）' : '（放入/取出物品不会影响已有物品）';
            return <div className='boxWithCapacity'>
                {list}
                <div className={'boxCapacity' + (ratio >= 0.9 ? ' boxCapacityFull' : '')}
                    title={'大箱子容量：已用 ' + fmtNum(used) + ' 格，共 ' + fmtNum(cap) + ' 格。' + capHint}>
                    大箱子容量：{fmtNum(used)} / {fmtNum(cap)} 格 · 已用 {Math.round(ratio * 100)}%{ratio >= 0.9 ? '（快满了）' : ''}
                </div>
            </div>;
        }
        return list;
    }
});
// 返回按钮：关闭当前窗口，并可选执行回调
var BtnBack = React.createClass({
    contextTypes: {
        callWindow: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            callBack: null,
            disabled: false,
        }
    },
    render: function () {
        function callBack() {
            this.context.callWindow(null);
            if (this.props.callBack) {
                this.props.callBack();
            }
        }
        return <BtnComponent disabled={this.props.disabled} handleClick={callBack.bind(this)} desc='返回' />
    }
});
// 回家按钮：从外部地点耗时返回家中
var BtnHome = React.createClass({
    getDefaultProps: function () {
        return {
            placeName: null,
            callBack: null,
        }
    },
    contextTypes: {
        setCurrentScene: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        getTimeNeed: React.PropTypes.func.isRequired,
    },
    homeCallBack: function () {
        this.context.AudioEngine.stopBg(this.props.place);
        this.context.AudioEngine.playEffect('door_closed');
    },
    gohome: function () {
        if (this.props.placeName) {
            var timeNeed = this.context.getTimeNeed(this.props.placeName);
            function callBack() {
                this.context.setCurrentScene('home');
                if (this.props.callBack != null) {
                    this.props.callBack();
                } else {
                    this.homeCallBack()
                }
            }
            this.context.useTime(callBack.bind(this), timeNeed);
        } else {
            this.context.setCurrentScene('home');
        }
    },
    render: function () {
        return <BtnComponent desc='回家' handleClick={this.gohome} />
    }
});
// 资源富集显示：把资源/怪物数量折算为「很少~大量」文字
var ResourceDisplayComponent = React.createClass({
    getDefaultProps: function () {
        return {
            resource: null,
            type: 'resource'
        }
    },
    getAmountDescAll: function (itemList) {
        var type = this.props.type;
        //清算资源富集程度
        function getAmountDesc(amount) {
            var arr = ['很少', '较少', '一般', '较多', '大量'];
            for (var i = 0; i < arr.length - 1; i++) {
                if (amount < i * 10 + 10)
                    return arr[i];
            };
            return arr[i];
        };
        var result = [];
        var res = {};
        if (type == 'resource') {
            var attachData = ITEM_DATA;
            var isMst = false;
        } else {
            if ((type == 'mst')) {
                var attachData = MST_DATA;
                var isMst = true;
            }
        }
        for (var attr in itemList) {
            var typeName = attachData[attr].type || attr;
            var amount = isMst ? itemList[attr].amount : itemList[attr];
            if (amount == 0) continue;
            if (res[typeName]) {
                res[typeName] += amount;
            } else {
                res[typeName] = amount;
            }
        };
        for (var attr in res) {
            if (isMst ? MST_DATA[attr] : TYPE_DATA[attr]) {
                var amountDesc = getAmountDesc(res[attr]);
                var groupName = isMst ? MST_DATA[attr].name : TYPE_DATA[attr].name;
                result.push(<p key={attr} title={groupName + '：' + richnessHint(amountDesc)}>
                    <span>{groupName}</span>
                    <span className="badge resourceAmount">
                        {amountDesc}
                    </span>
                </p>)
            }
        };
        return result;
    },
    render: function () {
        return <div>
            {this.getAmountDescAll(this.props.resource)}
        </div>
    }
})
// 通用按钮：统一处理禁用判定（disabled 属性 / 材料需求）、音效、左右键与悬停，
// 并在禁用被点击时给出原因提示（title 悬停 + 全局 toast）
var BtnComponent = React.createClass({
    contextTypes: {
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        checkHaveResource: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        playerState: React.PropTypes.object.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            disabled: false,
            handleClick: null,
            handleMouseEnter: null,
            desc: null,
            requireList: null,
            style: {},
            canEvent: false,
            sound: 'pick',
            className: 'btn',
            disabledReason: null,
            title: null,
        }
    },
    getDisabled: function () {
        return this.props.disabled || !this.context.checkHaveResourceAll(this.props.requireList, true)
    },
    // 列出缺少的材料（让“材料不足”可读：缺什么、缺多少；含背包+大箱子+装备+状态值）
    getMissingText: function () {
        var requireList = this.props.requireList;
        if (!requireList) return '';
        var boxSaveData = this.context.boxSaveData;
        var bag = together(boxSaveData.bag.things, boxSaveData.bigBox.things);
        var self = this;
        var currentEquip = this.context.currentEquip || {};
        var playerState = this.context.playerState || {};
        function amounts(id) {
            var n = countBagItem(bag, id);
            for (var slot in currentEquip) {
                if (currentEquip[slot] && itemBaseId(currentEquip[slot]) == id) n++;
            }
            if (playerState[id] && playerState[id].amount) n += playerState[id].amount;
            return n;
        }
        if (!this.context.checkHaveResourceAll(requireList, true)) {
            return uxMissingText(requireList, amounts);
        }
        return '';
    },
    getDisabledReason: function () {
        //先判定材料，再给出调用方指定的其它原因（如饱食/水分不足、冷却中）
        if (this.props.requireList && !this.context.checkHaveResourceAll(this.props.requireList, true)) {
            return this.getMissingText() || '材料不足';
        }
        if (this.props.disabled) return this.props.disabledReason || '条件不满足：材料、状态、空间或时间不足；请检查背包空间与满腹/水分/体力后重试';
        return '';
    },
    handleClick: function (isRight, event) {
        if (this.getDisabled()) {
            var reason = this.getDisabledReason();
            // 兜底文案保证“点了没反应”不会再出现；缺料时补下一步
            var message = reason || '条件不满足：材料、状态、空间或时间不足';
            if (/^缺少/.test(message)) message += '；请先采集或制作缺少的材料';
            this.context.showMsg(<p key={Math.random()}>{message}</p>);
            return;
        }
        this.context.AudioEngine.playEffect(this.props.sound);

        if (this.props.handleRightClick && isRight) {
            this.props.handleRightClick(event)
        } else {
            this.props.handleClick(event);
        }
    },
    handleMouseEnter: function () {
        if (this.getDisabled()) return;
        if (this.props.handleMouseEnter) this.props.handleMouseEnter();
    },
    render: function () {
        var disabled = this.getDisabled();
        var disabledReason = disabled ? this.getDisabledReason() : '';
        var titleText = disabledReason || this.props.title || undefined;
        return <button type="button" title={titleText} aria-disabled={disabled ? 'true' : undefined} style={this.props.style} onContextMenu={this.handleClick.bind(null, 'right')} onClick={this.handleClick.bind(null, false)} onMouseEnter={this.handleMouseEnter} className={this.props.className + (disabled ? " disabled" : '')}>{this.props.desc || this.props.children}</button>
    }
});

//调试用
var DebugComponent = React.createClass({
    contextTypes: {
        setStateFromChildren: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        playerState: React.PropTypes.object.isRequired,
        handleDeath: React.PropTypes.func.isRequired,
        dungeonSaveData: React.PropTypes.object.isRequired,
        parentState: React.PropTypes.object.isRequired,
    },
    handleAddItem: function () {
        var item = ($('#itemName')[0].value);
        var amount = parseInt($('#itemAmount')[0].value);
        for (var attr in ITEM_DATA) {
            if (ITEM_DATA[attr].name == item) {
                item = attr;
                var boxSaveData = this.context.boxSaveData;
                boxSaveData.bag.things[item] = amount;
                this.context.setStateFromChildren({ boxSaveData: boxSaveData });
                break;
            }
        }

        for (var attr in STATE_DATA) {
            if (STATE_DATA[attr].name == item) {
                item = attr;
                var playerState = this.context.playerState;
                playerState[attr].amount = amount;
                this.context.setStateFromChildren({ playerState: playerState });
                break;
            }
        }
    },
    changeStair: function () {
        var dungeonSaveData = this.context.dungeonSaveData;
        dungeonSaveData.stairCount = parseInt($('#stairNum')[0].value);
        this.context.setStateFromChildren({
            dungeonSaveData: dungeonSaveData
        })
    },
    log: function () {
        // 调试输入改为 JSON 状态覆盖（原先直接 eval 任意 JS，存在风险且无法静态检查）
        var el = document.getElementById('log');
        if (!el) return;
        try {
            var patch = JSON.parse(el.value);
            if (!patch || typeof patch !== 'object' || patch instanceof Array) throw new Error('需要一个 JSON 对象');
            this.context.setStateFromChildren(patch);
        } catch (e) {
            console.warn('[debug] 解析失败：请输入形如 {"menuHint":1} 的 JSON 对象', e && e.message);
        }
    },
    logState: function () {
        var state = this.context.parentState;
        console.log(state)
    },
    render: function () {
        return (
            <div>
                <input id='log' />
                <BtnComponent handleClick={this.log} desc='输出' />
                <BtnComponent handleClick={this.logState} desc='输出所有' />
                <input id='itemName' />
                <input id='itemAmount' type='number' />
                <BtnComponent handleClick={this.handleAddItem} desc='添加' />
                <BtnComponent handleClick={this.context.handleDeath.bind(null, 'hunger')} desc='饿死' />
                <input id='stairNum' type='number' />
                <BtnComponent handleClick={this.changeStair} desc='穿越' />
            </div>
        )
    }
});
