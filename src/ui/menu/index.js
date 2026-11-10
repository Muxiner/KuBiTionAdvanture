/**
 * src/ui/menu/index.js —— 菜单/弹窗入口
 * MenuBtnComponent(菜单按钮)、CustomMenuComponent(自定义弹窗)、MenuComponent(分发)。
 * 具体面板见 normalMenu/skillPanel/settingsPanel/bag/ 等。
 */
//弹窗
var MenuBtnComponent = React.createClass({
    contextTypes: {
        showMenu: React.PropTypes.string.isRequired,
        menuHint: React.PropTypes.number.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
    },
    // 打开主菜单
    handleClick: function () {
        this.context.setStateFromChildren({ showMenu: 'menu' });
    },
    render: function () {
        var menuHint = this.context.menuHint;
        return <BtnComponent style={{ backgroundColor: '#9FAA83' }} className='stateVector menuToggleBtn' handleClick={this.handleClick} title='打开菜单：技能 / 设置与存档'><span>菜单</span>{(menuHint > 0 ? <span className='badge'>{menuHint}</span> : '')}</BtnComponent>
    }
});
var CustomMenuComponent = React.createClass({
    contextTypes: {
        menuDesc: React.PropTypes.object.isRequired,
    },
    render: function () {
        return <div>{this.context.menuDesc}</div>
    }
});
var MenuComponent = React.createClass({
    contextTypes: {
        showMenu: React.PropTypes.string.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        skill: React.PropTypes.object.isRequired,
    },
    render: function () {
        var type = this.context.showMenu;
        if (!type || type == '') return null
        // NormalMenuComponent 自带 menuOuter/menuInner/menu 结构；这里不能再包一层，
        // 否则会出现“两层遮罩 + 外层高度塌陷”的双重嵌套（实测移动端菜单高度只剩 22px）。
        if (type == 'menu') {
            return <NormalMenuComponent />;
        }
        return <div className='menuOuter' role='dialog' aria-modal='true' aria-label='提示'>
            <div className='menuInner'>
                <div className='menu'>
                    <div className='ux-menuTitle'>
                        <span className='ux-menuTitleMain'>提示</span>
                        <span className='ux-menuTitleHint'>按下方按钮或「返回」关闭</span>
                    </div>
                    <div className='menuMain'>
                        <CustomMenuComponent />
                    </div>
                </div>
            </div>
        </div>
    }
});
