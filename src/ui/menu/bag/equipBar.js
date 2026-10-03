/**
 * src/ui/menu/bag/equipBar.js —— 装备栏
 * 显示 头/身/足/颈/武器1/武器2；点击已装备槽可卸下放回背包。
 * props: currentEquip, onUnequip(slot)
 */
var EquipBarComponent = React.createClass({
    getDefaultProps: function () {
        return {
            currentEquip: {},
            onUnequip: null,
        }
    },
    render: function () {
        var currentEquip = this.props.currentEquip;
        var onUnequip = this.props.onUnequip;
        return <div className="equipBar">
            {EQUIP_SLOTS.map(function (slot) {
                var item = currentEquip[slot];
                var label = EQUIP_TYPE_DATA[slot] || slot;
                return <div className='equipSlot' key={slot} onClick={(item && onUnequip) ? onUnequip.bind(null, slot) : null} title={item ? ITEM_DATA[item].name : '（空）'}>
                    <span className='equipSlotLabel'>{label}</span>
                    <span className={item ? 'equipSlotItem' : 'equipSlotItem empty'}>{item ? ITEM_DATA[item].name : '空'}</span>
                </div>;
            })}
        </div>;
    }
});
