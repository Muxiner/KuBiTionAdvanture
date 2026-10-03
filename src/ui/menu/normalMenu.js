/**
 * src/ui/menu/normalMenu.js —— 常规主菜单外壳
 * 承载「技能 / 设置」两个标签页与返回按钮；具体面板见 skillPanel/settingsPanel。
 */
var NormalMenuComponent = React.createClass({
    contextTypes: {
        setStateFromChildren: React.PropTypes.func.isRequired,
        menuHint: React.PropTypes.number.isRequired,
    },
    getInitialState: function () {
        var menuType = 'settings';
        if (this.context.menuHint) {
            menuType = 'skill';
        }
        return {
            menuType: menuType,
        }
    },
    componentWillMount: function () {
        this.context.setStateFromChildren({ menuHint: 0 });
    },
    quitMenu: function () {
        this.context.setStateFromChildren({ showMenu: '' });
    },
    handleTab: function (menuType) {
        this.setState({ menuType: menuType });
    },
    render: function () {
        var menuType = this.state.menuType;
        return <div className='menuOuter'>
            <div className='menuInner'>
                <div className='menu'>
                    <div className='menuMain'>
                        {menuType == 'skill' ? <SkillPanelComponent /> : <SettingsPanelComponent />}
                    </div>
                    <ul className="nav">
                        <div className='btn' onClick={this.handleTab.bind(this, 'skill')}>技能</div>
                        <div className='btn' onClick={this.handleTab.bind(this, 'settings')}>设置</div>
                    </ul>
                    <BtnComponent desc='返回' handleClick={this.quitMenu} />
                </div>
            </div>
        </div>
    }
});
