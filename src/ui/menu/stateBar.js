/**
 * src/ui/menu/stateBar.js —— 顶部状态栏
 * 展示玩家各状态（StateVectorComponent）、菜单按钮，调试模式下附加 DebugComponent。
 */
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
            <MenuBtnComponent />
            {MODE == 'DEBUG' ? <DebugComponent /> : null}
        </div>
    }
})
