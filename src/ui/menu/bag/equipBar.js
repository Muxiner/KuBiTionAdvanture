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
    // 渲染签名：7 个装备槽的物品 id（装备对象可能原地修改，不能只比引用）
    getEquipSig: function (props) {
        var equip = props.currentEquip || {};
        var parts = [];
        for (var i = 0; i < EQUIP_SLOTS.length; i++) {
            var slot = EQUIP_SLOTS[i];
            parts.push(slot + ':' + (equip[slot] || ''));
        }
        return parts.join(';');
    },
    shouldComponentUpdate: function (nextProps, nextState, nextContext) {
        if (uxShallowChanged(nextProps, this.props)) return true;
        if (uxCtxChanged(nextContext, this.context, ['changeMsg'])) return true;
        return this.getEquipSig(nextProps) !== this._equipSig;
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
        this._equipSig = this.getEquipSig(this.props);
        var currentEquip = this.props.currentEquip;
        var self = this;
        return <div className="equipBar">
            {EQUIP_SLOTS.map(function (slot) {
                var item = currentEquip[slot];
                var label = EQUIP_TYPE_DATA[slot] || slot;
                var itemName = item ? ITEM_DATA[item].name : '未装备';
                var titleText = item
                    ? (label + '：' + itemName + '（已装备，点击查看详情）')
                    : (label + '：未装备（在背包中点击装备即可穿戴）');
                return <div className='equipSlot' key={slot}
                    tabIndex="0" role="button"
                    aria-label={titleText}
                    onClick={item ? self.openDetail.bind(self, slot, item) : null}
                    onKeyDown={item ? self.keyDetail.bind(self, slot, item) : null}
                    title={titleText}>
                    <span className='equipSlotLabel'>{label}</span>
                    <span className={item ? 'equipSlotItem' : 'equipSlotItem empty'}>{itemName}</span>
                    {item ? <span className='ux-equipEquipped' title='已装备' aria-hidden='true'>✓</span> : null}
                </div>;
            })}
        </div>;
    }
});
