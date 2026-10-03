/**
 * src/ui/menu/bag/panel.js —— 背包面板（布局容器）
 * 组合：装备栏 + 属性统计 + 背包格子(BoxComponent) + 详情 + 所有物品。
 * 原 menu.js 中庞大的 BagComponent 收敛为布局与事件接线。
 */
var BagComponent = React.createClass({
    contextTypes: {
        getScienceLevel: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        unequipSlot: React.PropTypes.func.isRequired,
        skill: React.PropTypes.object.isRequired,
        getMaxState: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            items: [],
            size: 1,
            msg: '',
            changeMsg: null
        };
    },
    // 按「背包属性」科技重算背包容量
    componentWillMount: function () {
        var level = this.context.getScienceLevel('背包属性');
        var boxSaveData = this.context.boxSaveData;
        boxSaveData['bag'].size = BAG_BASE_SIZE + level;
    },
    render: function () {
        return <div className="panel panel-primary equipMain">
            <div className="panel-heading">
                背包
            </div>
            <div className="panel-body  clearFix">
                <EquipBarComponent currentEquip={this.context.currentEquip} onUnequip={this.context.unequipSlot} />
                <StatPanelComponent skill={this.context.skill} currentEquip={this.context.currentEquip} getMaxState={this.context.getMaxState} />
                <div className="equip" id="equip">
                    <BoxComponent box='bag' />
                </div>
                <div className="detail" id="detail">
                    <ItemDetailComponent />
                </div>
                <OwnedListComponent boxSaveData={this.context.boxSaveData} />
            </div>
        </div>
    }
});
