/**
 * src/ui/menu/stateBar.js —— 底部状态栏
 * 展示玩家各状态（StateVectorComponent）、背包开关、菜单按钮，调试模式下附加 DebugComponent。
 */
// 背包开关：桌面端收起/展开右侧背包栏，移动端在“场景/背包”之间切换
var BagToggleComponent = React.createClass({
    render: function () {
        return <BtnComponent className='stateVector bagToggleBtn' handleClick={uxToggleBagPanel} desc='背包' title='打开/收起背包面板：查看物品、装备、属性与所有物品' />;
    }
});
var StateComponent = React.createClass({
    render: function () {
        function getStatesName() {
            var result = [];
            for (var attr in PLAYER_STATE_INIT) {
                result.push(<StateVectorComponent key={attr} state={attr} />);
            }
            return result;
        }
        return <div className="stateMain">
            {getStatesName()}
            <BagToggleComponent />
            <MenuBtnComponent />
            {MODE == 'DEBUG' ? <DebugComponent /> : null}
        </div>
    }
})
