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
        var bag = this.context.boxSaveData.bag;
        var bagUsed = getLength(bag.things);
        var bagCap = bag.size;
        return <div className="panel panel-primary equipMain">
            <div className="panel-heading bagHeading">
                <span className="bagHeadingTitle">背包</span>
                <span className='ux-bagCap' title={'背包容量：已用 ' + fmtNum(bagUsed) + ' / ' + fmtNum(bagCap) + ' 格。升级科研台的「背包属性」可扩容。'}>{fmtNum(bagUsed)} / {fmtNum(bagCap)}</span>
                <span className="bagScrollHint">可上下滑动查看更多</span>
                <button type="button" className="bagCloseBtn" onClick={uxCloseBagPanel} aria-label="收起背包，返回场景" title="收起背包，返回场景">收起</button>
            </div>
            <div className="panel-body  clearFix">
                <EquipBarComponent currentEquip={this.context.currentEquip} onUnequip={this.context.unequipSlot} />
                <div className="detail" id="detail" role="region" aria-label="物品详情" aria-live="polite">
                    <ItemDetailComponent />
                </div>
                <StatPanelComponent skill={this.context.skill} currentEquip={this.context.currentEquip} getMaxState={this.context.getMaxState} />
                <div className="equip" id="equip">
                    <BoxComponent box='bag' />
                </div>
                <OwnedListComponent boxSaveData={this.context.boxSaveData} />
            </div>
        </div>
    }
});
