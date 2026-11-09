/**
 * src/ui/menu/bag/ownedList.js —— 所有物品（跨容器汇总）
 * 只统计“当前真实可访问”的容器（未建造的井/大箱子等不再虚增数量），
 * 每行显示来源容器并可点击跳转；默认收起，避免常驻信息过载。
 * props: boxSaveData
 */
// 容器 → 所属建筑（用于过滤未建造的容器）；bag 始终计入；register 为临时拾取不统计
var OWNED_BOX_BUILDING = {
    makeTable: 'makeTable',
    alchemyTable: 'alchemyTable',
    magicTable: 'magicTable',
    scienceTable: 'scienceTable',
    cooker: 'cooker',
    cooked: 'cooker',
    well: 'well',
    bigBox: 'bigBox',
    shit: 'toilet',
    marshGasTank: 'toilet'
};
var OWNED_BOX_NAME = {
    bag: '背包',
    makeTable: '制造台',
    alchemyTable: '炼金台',
    magicTable: '秘术台',
    scienceTable: '科研台',
    cooker: '炊具',
    cooked: '炊具成品',
    well: '井',
    bigBox: '大箱子',
    shit: '卫生间',
    marshGasTank: '沼气池'
};
var OwnedListComponent = React.createClass({
    getDefaultProps: function () {
        return {
            boxSaveData: {},
        }
    },
    contextTypes: {
        buildingSaveData: React.PropTypes.object.isRequired,
        currentScene: React.PropTypes.string.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    getInitialState: function () {
        // 默认收起：后期“所有物品”可达上百行，常驻会挤占背包/详情空间
        return { open: false };
    },
    toggle: function () {
        this.setState({ open: !this.state.open });
    },
    boxAllowed: function (box) {
        if (box === 'bag') return true;
        if (box === 'register') return false; // 交易/拾取暂存，不是玩家资产
        var building = OWNED_BOX_BUILDING[box];
        if (!building) return false; // 升级记录、技能等非物品容器不统计
        var buildingSaveData = this.context.buildingSaveData || {};
        var data = buildingSaveData[building];
        return !!(data && data.own);
    },
    boxName: function (box) {
        return OWNED_BOX_NAME[box] || box;
    },
    // 点击来源：在家时打开对应容器窗口；否则给出可读提示（避免在野外远程开箱）
    jumpToBox: function (box) {
        if (box === 'bag') {
            var equip = document.getElementById('equip');
            if (equip && equip.scrollIntoView) {
                try { equip.scrollIntoView({ block: 'nearest' }); } catch (e) { }
            }
            return;
        }
        if (this.context.currentScene !== 'home') {
            this.context.showMsg(<p key={Math.random()}>{'回家后才能查看' + this.boxName(box)}</p>);
            return;
        }
        var element = null;
        try {
            if (box === 'bigBox') element = <BigBoxComponent />;
            else if (box === 'well') element = <WellComponent />;
            else if (box === 'cooker' || box === 'cooked') element = <CookerComponent />;
            else if (box === 'makeTable') element = <StudioComponent type='makeTable' attachData={MAKE_DATA} />;
            else if (box === 'alchemyTable') element = <StudioComponent type='alchemyTable' attachData={ALCHEMY_DATA} />;
            else if (box === 'magicTable') element = <StudioComponent type='magicTable' attachData={MAGIC_DATA} />;
            else if (box === 'scienceTable') element = <ScienceComponent />;
            else if (box === 'shit' || box === 'marshGasTank') element = <ToiletComponent />;
        } catch (e) {
            element = null;
        }
        if (element) this.context.callWindow(element);
        else this.context.showMsg(<p key={Math.random()}>{'暂不支持从汇总跳转到' + this.boxName(box)}</p>);
    },
    getOwnedList: function () {
        var boxSaveData = this.props.boxSaveData || {};
        var owned = {};
        var boxOrder = [];
        for (var box in boxSaveData) {
            var boxData = boxSaveData[box];
            var things = boxData && boxData.things;
            if (!things) continue;
            if (!this.boxAllowed(box)) continue;
            boxOrder.push(box);
            for (var id in things) {
                var base = itemBaseId(id);
                if (!owned[base]) owned[base] = { amount: 0, src: {} };
                owned[base].amount += things[id];
                owned[base].src[box] = (owned[base].src[box] || 0) + things[id];
            }
        }
        // 按物品类型分组
        var order = ['weapon', 'equip', 'tool', 'bullet', 'met', 'food', 'cooked', 'poizon', 'art', 'special', 'quest', '?'];
        var groups = {};
        var catOrder = [];
        for (var id2 in owned) {
            var t = (ITEM_DATA[id2] && ITEM_DATA[id2].type) || '?';
            if (!groups[t]) { groups[t] = []; catOrder.push(t); }
            groups[t].push({ id: id2, amount: owned[id2].amount, src: owned[id2].src });
        }
        catOrder.sort(function (a, b) {
            var ia = order.indexOf(a); if (ia < 0) ia = 99;
            var ib = order.indexOf(b); if (ib < 0) ib = 99;
            return ia - ib;
        });
        var self = this;
        return catOrder.map(function (cat) {
            var items = groups[cat];
            items.sort(function (a, b) { return b.amount - a.amount; });
            return <div className='ownedGroup' key={cat}>
                <div className='ownedGroupTitle'>{TYPE_DATA[cat] ? TYPE_DATA[cat].name : cat}</div>
                {items.map(function (entry) {
                    var name = ITEM_DATA[entry.id] ? ITEM_DATA[entry.id].name : entry.id;
                    var srcList = [];
                    for (var b in entry.src) {
                        srcList.push({ box: b, amount: entry.src[b] });
                    }
                    srcList.sort(function (a, b) { return b.amount - a.amount; });
                    return <div className='ownedItem' key={entry.id}>
                        <span className='ownedName'>{name}</span>
                        <span className='ownedAmount'>×{entry.amount}</span>
                        <span className='ownedSources'>
                            {srcList.map(function (s) {
                                return <button type='button' key={s.box} className='ownedSrcBtn'
                                    title={'在' + self.boxName(s.box) + '中有 ' + s.amount + ' 个，点击查看'}
                                    onClick={self.jumpToBox.bind(self, s.box)}>
                                    {self.boxName(s.box)} {s.amount}
                                </button>;
                            })}
                        </span>
                    </div>;
                })}
            </div>;
        });
    },
    render: function () {
        var open = this.state.open;
        var content = open ? this.getOwnedList() : null;
        var empty = open && (!content || !content.length);
        return <div className={"ownedList" + (open ? '' : ' isCollapsed')}>
            <button type="button" className="sectionToggle ownedToggle" aria-expanded={open ? 'true' : 'false'} onClick={this.toggle}>
                <span className="sectionToggleTitle">所有物品</span>
                <span className="sectionToggleMark" aria-hidden="true">{open ? '▾' : '▸'}</span>
                <span className="sectionToggleHint">{open ? '按来源分组，点击来源可查看' : '默认收起，点此展开'}</span>
            </button>
            {content}
            {empty ? <div className='ownedEmpty'>暂无物品</div> : null}
        </div>;
    }
});
