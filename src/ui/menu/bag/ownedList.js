/**
 * src/ui/menu/bag/ownedList.js —— 所有物品（跨容器汇总）
 * 汇总背包/大箱子/各工作台内的物品，按类别分组、组内按数量降序。
 * props: boxSaveData
 */
var OwnedListComponent = React.createClass({
    getDefaultProps: function () {
        return {
            boxSaveData: {},
        }
    },
    getOwnedList: function () {
        var boxSaveData = this.props.boxSaveData || {};
        var owned = {};
        for (var box in boxSaveData) {
            var things = boxSaveData[box] && boxSaveData[box].things;
            if (!things) continue;
            for (var id in things) {
                var base = itemBaseId(id);
                owned[base] = (owned[base] || 0) + things[id];
            }
        }
        // 按物品类型分组
        var order = ['weapon', 'equip', 'tool', 'bullet', 'met', 'food', 'cooked', 'poizon', 'art', 'special', 'quest', '?'];
        var groups = {};
        var catOrder = [];
        for (var id2 in owned) {
            var t = (ITEM_DATA[id2] && ITEM_DATA[id2].type) || '?';
            if (!groups[t]) { groups[t] = []; catOrder.push(t); }
            groups[t].push({ id: id2, amount: owned[id2] });
        }
        catOrder.sort(function (a, b) {
            var ia = order.indexOf(a); if (ia < 0) ia = 99;
            var ib = order.indexOf(b); if (ib < 0) ib = 99;
            return ia - ib;
        });
        return catOrder.map(function (cat) {
            var items = groups[cat];
            items.sort(function (a, b) { return b.amount - a.amount; });
            return <div className='ownedGroup' key={cat}>
                <div className='ownedGroupTitle'>{TYPE_DATA[cat] ? TYPE_DATA[cat].name : cat}</div>
                {items.map(function (entry) {
                    var name = ITEM_DATA[entry.id] ? ITEM_DATA[entry.id].name : entry.id;
                    return <div className='ownedItem' key={entry.id}>
                        <span className='ownedName'>{name}</span>
                        <span className='ownedAmount'>×{entry.amount}</span>
                    </div>;
                })}
            </div>;
        });
    },
    render: function () {
        return <div className="ownedList">
            <div className="ownedTitle">所有物品</div>
            {this.getOwnedList()}
        </div>;
    }
});
