/**
 * src/ui/menu/normalMenu.js —— 常规主菜单外壳
 * 承载「技能 / 设置」两个标签页与返回按钮；具体面板见 skillPanel/settingsPanel。
 */
// 记住上次打开的页签（默认技能页，而不是一打开就是账号/密码的存档设置）
var LAST_MENU_TAB = 'skill';
var NormalMenuComponent = React.createClass({
    contextTypes: {
        setStateFromChildren: React.PropTypes.func.isRequired,
        menuHint: React.PropTypes.number.isRequired,
    },
    getInitialState: function () {
        var menuType = LAST_MENU_TAB || 'skill';
        if (this.context.menuHint) {
            menuType = 'skill';
        }
        return {
            menuType: menuType,
        }
    },
    // 打开菜单即清空菜单提示角标
    componentWillMount: function () {
        this.context.setStateFromChildren({ menuHint: 0 });
    },
    quitMenu: function () {
        this.context.setStateFromChildren({ showMenu: '' });
    },
    handleTab: function (menuType) {
        LAST_MENU_TAB = menuType;
        this.setState({ menuType: menuType });
    },
    render: function () {
        var menuType = this.state.menuType;
        var menuTitle = menuType == 'settings' ? '设置 · 存档' : '技能 · 加成';
        var menuHintText = menuType == 'settings'
            ? '读取/删除会覆盖或清除进度，操作前请确认目标存档'
            : '点击技能行查看当前效果、下一级效果与学费';
        return <div className='menuOuter' role='dialog' aria-modal='true' aria-label={'菜单 · ' + menuTitle}>
            <div className='menuInner'>
                <div className='menu'>
                    <div className='ux-menuTitle'>
                        <span className='ux-menuTitleMain'>{menuTitle}</span>
                        <span className='ux-menuTitleHint'>{menuHintText}</span>
                    </div>
                    <div className='menuMain'>
                        {menuType == 'skill' ? <SkillPanelComponent /> : <SettingsPanelComponent />}
                    </div>
                    <div className="nav menuTabs" role="tablist">
                        <button type="button" role="tab" aria-selected={menuType == 'skill' ? 'true' : 'false'}
                            className={'btn tabBtn' + (menuType == 'skill' ? ' is-active' : '')}
                            onClick={this.handleTab.bind(this, 'skill')}>技能</button>
                        <button type="button" role="tab" aria-selected={menuType == 'settings' ? 'true' : 'false'}
                            className={'btn tabBtn' + (menuType == 'settings' ? ' is-active' : '')}
                            onClick={this.handleTab.bind(this, 'settings')}>设置</button>
                        <BtnComponent desc='返回' handleClick={this.quitMenu} />
                    </div>
                </div>
            </div>
        </div>
    }
});
