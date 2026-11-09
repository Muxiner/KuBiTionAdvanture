/**
 * src/ui/menu/bag/equipBar.js —— 装备栏
 * 显示 头/身/足/颈/手/武器1/武器2；点击已装备槽在右侧查看详情（卸下由详情面板确认）。
 * props: currentEquip, onUnequip(slot)
 */
var EquipBarComponent = React.createClass({
    getDefaultProps: function () {
        return {
            currentEquip: {},
            onUnequip: null,
        }
    },
    contextTypes: {
        changeMsg: React.PropTypes.func.isRequired,
    },
    // 点击/回车：查看该槽物品详情（不再“一点就卸下”，避免误操作）
    openDetail: function (slot, item) {
        if (item) this.context.changeMsg(item, 'item');
    },
    keyDetail: function (slot, item, event) {
        if (event.keyCode === 13 || event.keyCode === 32) {
            event.preventDefault();
            this.openDetail(slot, item);
        }
    },
    render: function () {
        var currentEquip = this.props.currentEquip;
        var self = this;
        return <div className="equipBar">
            {EQUIP_SLOTS.map(function (slot) {
                var item = currentEquip[slot];
                var label = EQUIP_TYPE_DATA[slot] || slot;
                var itemName = item ? ITEM_DATA[item].name : '空';
                return <div className='equipSlot' key={slot}
                    tabIndex="0" role="button"
                    aria-label={label + '：' + itemName + (item ? '（点击查看详情）' : '（未装备）')}
                    onClick={item ? self.openDetail.bind(self, slot, item) : null}
                    onKeyDown={item ? self.keyDetail.bind(self, slot, item) : null}
                    title={item ? itemName : '（空）'}>
                    <span className='equipSlotLabel'>{label}</span>
                    <span className={item ? 'equipSlotItem' : 'equipSlotItem empty'}>{itemName}</span>
                </div>;
            })}
        </div>;
    }
});
