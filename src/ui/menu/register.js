/**
 * src/ui/menu/register.js —— 寄存器（拾取/获得物品）窗口
 * 从 menu.js 拆出：用于把事件/采集得到的物品放入 register 容器并「全部拾取」。
 */
var RegisterComponent = React.createClass({
    //寄存器，用于存放获得物品
    getDefaultProps: function () {
        return {
            itemList: null,
            willUnmount: null,
            canPick: true,//显示'全部拾取'
            canBack: true,//显示'返回'
            canBeEmpty: false,//为空时自动返回
        }
    },
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        checkFull: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    // 渲染签名：register 容器的物品（原地修改，不能只比 context 引用）
    getRegisterSig: function (ctx) {
        var boxSaveData = ctx.boxSaveData || {};
        var register = boxSaveData.register;
        return JSON.stringify((register && register.things) || {});
    },
    shouldComponentUpdate: function (nextProps, nextState, nextContext) {
        if (uxShallowChanged(nextProps, this.props)) return true;
        // 本组件读取的 context：boxSaveData；另外三个方法用于操作
        // detailedItem/currentEquip/durableSaveData 透传给子级 BoxComponent/ItemComponent（子级高亮与耐久）
        if (uxCtxChanged(nextContext, this.context, [
            'boxSaveData', 'setStateFromChildren', 'checkFull', 'changeItem', 'callWindow', 'showMsg',
            'detailedItem', 'currentEquip', 'durableSaveData'
        ])) return true;
        return this.getRegisterSig(nextContext || this.context) !== this._registerSig;
    },
    componentWillMount: function () {
        var itemList = this.props.itemList;
        if (!itemList) {
            return;
        }
        var saveData = this.context.boxSaveData;
        saveData.register.things = cloneMul(itemList, 1);
        this.context.setStateFromChildren({ boxSaveData: saveData });
    },
    componentWillUnmount: function () {
        // if(this.props.willUnmount){
        //     this.props.willUnmount();
        // }
    },
    // 全部拾取：把 register 内物品在容量允许下移入背包
    grabAll: function () {
        var saveData = this.context.boxSaveData;
        var itemList = saveData.register.things;
        var picked = [];
        for (var attr in itemList) {
            if (!this.context.checkFull('bag', attr)) {
                var amount = itemList[attr];
                var displayName = uxDisplayName(attr);
                this.context.changeItem(o(attr, amount), 'bag');
                this.context.changeItem(o(attr, amount), 'register', true);
                picked.push(displayName + ' ' + fmtQty(amount));
            }
        }
        this.context.setStateFromChildren({ boxSaveData: saveData });
        if (picked.length) {
            this.context.showMsg(<p key={Math.random()}>{'已拾取：' + picked.join('、')}</p>);
        } else if (getLength(itemList) > 0) {
            this.context.showMsg(<p key={Math.random()}>背包已满……请先整理背包，或把物品存入大箱子后再拾取</p>);
        }
        this.check();
    },
    // 非「允许为空」时，拾取完自动关闭窗口
    check: function () {
        if (this.props.canBeEmpty == true) return;
        var saveData = this.context.boxSaveData;
        var itemList = saveData.register.things;
        if (getLength(itemList) == 0) {
            this.context.callWindow(null);
            this.props.willUnmount && this.props.willUnmount();
        }
    },
    render: function () {
        this._registerSig = this.getRegisterSig(this.context);
        var things = this.context.boxSaveData.register.things;
        var disabled = (getLength(things) == 0);
        return <div>
            {this.props.canBack ? <BtnBack callBack={this.props.willUnmount || null} /> : null}
            <BoxComponent isRegister={true} box='register' itemList={things} handleClick={this.check} />
            {this.props.canPick ? <BtnComponent sound='pickall' disabled={disabled} disabledReason='没有可拾取的物品' handleClick={this.grabAll} desc='全部拾取' /> : null}
        </div>
    }
});
