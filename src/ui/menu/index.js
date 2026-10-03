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
    handleClick: function () {
        this.context.setStateFromChildren({ showMenu: 'menu' });
    },
    render: function () {
        var menuHint = this.context.menuHint;
        return <BtnComponent style={{ backgroundColor: '#9FAA83' }} className='stateVector' handleClick={this.handleClick}><span>菜单</span>{(menuHint > 0 ? <span className='badge'>{menuHint}</span> : '')}</BtnComponent>
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
        switch (type) {
            case 'menu':
                var inner = <NormalMenuComponent />
                break;
            case 'custom':
                var inner = <CustomMenuComponent />
        }
        return <div className='menuOuter'>
            <div className='menuInner'>
                <div className='menu'>
                    <div className='menuMain'>
                        {inner}
                    </div>
                </div>
            </div>
        </div>
    }
});
