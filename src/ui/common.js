/**
 * src/ui/common.js —— 通用 UI 小组件
 * 由原 main.js 拆分而来。含：物品格、向量格、需求显示、进度条、各类按钮、
 * 容器、返回/回家按钮、调试组件、消息框、大箱子转移等基础部件。
 */

//游戏逻辑层/////////////////////////////////////////////////////////////////////////////
//tiny components
//小组件
// ===== 1) 通用 UI 组件 =====
// 单个物品格：显示名称/数量/耐久，处理左键转移、右键使用或装备
var ItemComponent = React.createClass({
    //物体组件
    getDefaultProps: function () {
        return {
            item: null,
            amount: 0,
            box: null,
            handleClick: null,
        }
    },
    contextTypes: {
        useItem:              React.PropTypes.func.isRequired,
        useTime:              React.PropTypes.func.isRequired,
        changeMsg:            React.PropTypes.func.isRequired,
        handleExchange:       React.PropTypes.func.isRequired,
        playerStateChange:    React.PropTypes.func.isRequired,
        isDueling:            React.PropTypes.bool.isRequired,
        AudioEngine:          React.PropTypes.object.isRequired,
        durableSaveData:      React.PropTypes.object.isRequired,
        getMaxDurable:        React.PropTypes.func.isRequired,
        currentEquip:         React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        skill:                React.PropTypes.object.isRequired,
        dungeonSaveData:      React.PropTypes.object.isRequired,
        mstState:             React.PropTypes.object.isRequired,
        showMsg:              React.PropTypes.func.isRequired,
        handleItemClick:      React.PropTypes.func.isRequired,
    },
    itemMouseEnter: function () {
        this.context.changeMsg(this.props.item, 'item');
    },
    itemMouseClick: function (event) {
        // this.context.AudioEngine.playEffect('pick');

        CTRL_PRESSED = event.ctrlKey;
        SHIFT_PRESSED = event.shiftKey;

        if (this.props.handleClick) {
            this.props.handleClick();
        }
        if (IS_IPAD) {
            this.itemMouseEnter();
        }

        this.context.handleExchange(this.props.item, this.props.box, this.context.isDueling);
    },
    itemClickRight: function (event) {
        var item = this.props.item;
        var box = this.props.box;
        event.preventDefault();
        //装备切换
        if (box != 'bag' && ITEM_DATA[item].equipType) {
            this.itemMouseClick(event);
        }
        if (this.props.handleClick) {
            this.props.handleClick();
        }

        this.context.handleItemClick(item, box);

    },
    checkIfISCurrentEquip: function () {
        var item = this.props.item;
        if (!ITEM_DATA[item] || !ITEM_DATA[item].equipType) return false;
        var currentEquip = this.context.currentEquip;
        for (var slot in currentEquip) {
            if (currentEquip[slot] == item) return true;
        }
        return false;
    },
    render: function () {
        var item = this.props.item;
        var isCurrentEquip = this.checkIfISCurrentEquip(item);
        var maxDurable = this.context.getMaxDurable(item);
        return <div className={"item " + (isCurrentEquip ? 'currentEquip' : '')} onMouseEnter={this.itemMouseEnter} onClick={this.itemMouseClick} onContextMenu={this.itemClickRight}>
            <p style={{ color: ((TYPE_DATA[ITEM_DATA[this.props.item].type] || {}).color || COLOR.BLACK) }}>{ITEM_DATA[item].name}</p>
            {ITEM_DATA[item].durable ? <ProgressComponent addStyle={{ position: 'absolute', width: '30px', left: '9px', top: '22px', height: '5px' }} max={maxDurable} current={maxDurable - durableWear(this.context.durableSaveData, item)} /> : null}
            <span className="badge itemAmount">{this.props.amount}</span>
        </div>
    }
});
// 单个状态格：显示状态名与数值，按数值插值底色，悬停展示说明
var StateVectorComponent = React.createClass({
    contextTypes: {
        playerState: React.PropTypes.object.isRequired,
        changeMsg: React.PropTypes.func.isRequired,
        getTempDesc: React.PropTypes.func.isRequired,
        getMaxState: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            state: null
        }
    },
    showMsg: function () {
        this.context.changeMsg(this.props.state, 'state');
    },
    render: function () {
        var playerState = this.context.playerState;
        var state = playerState[this.props.state];
        var stateName = STATE_DATA[this.props.state].name;
        var max = this.context.getMaxState(this.props.state);
        function getColor(num) {
            var str = "";
            var color_0, color_1, r, g, b;
            if (this.props.state == 'temp') {
                color_1 = { r: 100, g: 177, b: 255 };
                color_0 = { r: 255, g: 177, b: 100 };
                var offset = num + 50;
                offset = offset < 0 ? 0 : offset;
                offset = offset > 100 ? 100 : offset;
                r = Math.floor((Math.abs(offset)) * (color_0.r - color_1.r) / max + color_1.r);
                g = Math.floor((Math.abs(offset)) * (color_0.g - color_1.g) / max + color_1.g);
                b = Math.floor((Math.abs(offset)) * (color_0.b - color_1.b) / max + color_1.b);
            } else {
                color_0 = { r: 162, g: 184, b: 168 };
                color_1 = { r: 43, g: 14, b: 11 };
                r = Math.floor((Math.abs(num)) * (color_0.r - color_1.r) / max + color_1.r);
                g = Math.floor((Math.abs(num)) * (color_0.g - color_1.g) / max + color_1.g);
                b = Math.floor((Math.abs(num)) * (color_0.b - color_1.b) / max + color_1.b);
            }
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        }
        return <div className="stateVector" onMouseEnter={this.showMsg} style={{ background: getColor.bind(this, Math.ceil(state.amount))() }} >
            {stateName}
            <span className="badge"> {this.props.state == 'temp' ? TEMP_DATA[this.context.getTempDesc()].name : Math.ceil(state.amount)} </span>
        </div>
    }
});
// 通用向量格：上/下两行文本，可带底部按钮或进度条
var VectorComponent = React.createClass({
    getDefaultProps: function () {
        return {
            msg_top: null,
            msg_top_color: COLOR.BLACK,
            msg_bottom: null,
            msg_bottom_color: COLOR.BLACK,
            btn_bottom: null,
            onContextMenu: null,
        }
    },
    render: function () {
        function getBottom() {
            if (this.props.btn_bottom) {
                // 同时渲染底部说明（如进度条）与按钮（如 收获/取消）
                return <div>{this.props.msg_bottom}{this.props.btn_bottom}</div>
            } else {
                return <div style={{ color: this.props.msg_bottom_color }}>{this.props.msg_bottom}</div>
            }
        }
        return <div className='vector' onContextMenu={this.props.onContextMenu}>
            <div className="item">
                <div style={{ color: this.props.msg_top_color }}>{this.props.msg_top}</div>
                {getBottom.bind(this)()}
            </div>
        </div>
    }
});
// 需求显示：按拥有情况标红/绿显示材料数量，可选显示拥有总量
var RequireComponent = React.createClass({
    getDefaultProps: function () {
        return {
            requireList: null,
            checkHaveResource: null,
            isGreen: false,
            showTotal: false,
            withSpace: false,
            separator: null,
            haveBox: false,
        }
    },
    contextTypes: {
        checkHaveResource: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired
    },
    render: function () {
        var requireList = this.props.requireList;
        var boxSaveData = this.context.boxSaveData;
        if (this.props.haveBox) {
            var bag = together(boxSaveData.bag.things, boxSaveData.bigBox.things);
        } else {
            var bag = clone(this.context.boxSaveData.bag.things);
        };
        function mapRes() {
            var result = [];
            var count = 0;
            var total = getLength(requireList);

            for (var attr in requireList) {
                // if(count > 0 && count%2 == 0)result.push(<br key = {'br_'+count}/>);
                if (count > 0 && this.props.withSpace) result.push(<br key={'br_' + count} />);
                var amount = requireList[attr];
                var name = ITEM_DATA[attr] ? ITEM_DATA[attr].name : (STATE_DATA[attr] ? STATE_DATA[attr].name : attr);
                result.push(<span key={count} className="resourceName" style={{ color: this.props.isGreen ? COLOR.GREEN : (this.context.checkHaveResource(attr, amount, bag) ? COLOR.GREEN : COLOR.RED) }}>
                    {name}
                    <span className="badge resourceAmount">
                        {this.props.showTotal ? (amount + '/' + countBagItem(bag, attr)) : amount}
                    </span>
                    {total == count + 1 ? null : this.props.separator}
                </span>);
                count++;
            };
            return result;
        }
        return <span>
            {mapRes.bind(this)()}
        </span>
    }
});
// 进度条：按 current/max 计算填充宽度
var ProgressComponent = React.createClass({
    getDefaultProps: function () {
        return {
            max: null,
            current: null,
            addStyle: {},
            addClass: '',
            addClassIn: 0,
        }
    },
    render: function () {
        return <div style={this.props.addStyle} className={"progress " + this.props.addClass}>
            <div className={"progress-bar progress-bar-striped active " + this.props.addClassIn} role="progressbar" aria-valuenow={this.props.current} aria-valuemin="0" aria-valuemax={this.props.max} style={{ width: (Math.ceil(100 * this.props.current / this.props.max)) + '%' }}>
            </div>
        </div>
    }
});
// 容器格子：按容器 size 渲染物品格与空格，进入时登记 currentBox
var BoxComponent = React.createClass({
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        setCurrentBox: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            box: '',
            isRegister: false,
            handleClick: null
        };
    },
    getInitialState: function () {
        return {
            items: null,
            size: null
        }
    },
    componentWillMount: function () {
        var box = this.context.boxSaveData[this.props.box];
        if (this.props.box != 'bag' && !box.isDone) {
            this.context.setCurrentBox(this.props.box);
        }
    },
    componentWillUnmount: function () {
        var box = this.context.boxSaveData[this.props.box];
        if (this.props.box != 'bag' && !box.isDone) this.context.setCurrentBox('');
    },
    render: function () {
        var box = this.context.boxSaveData[this.props.box];
        var bagSize = this.state.size;
        function createVector() {
            var result = [];
            var count = 0;
            var itemList = box.things;
            var bagSize = this.props.isRegister ? getLength(box.things) + 1 : box.size;
            for (var attr in itemList) {
                result.push(
                    <li className="vector" key={count}>
                        <ItemComponent handleClick={this.props.handleClick} item={attr} box={this.props.box} amount={itemList[attr]} key={attr} />
                    </li>
                )
                count++;
            };
            for (var i = count; i < bagSize; i++) {
                result.push(<li className="vector" key={count}></li>);
                count++;
            };
            return result;
        };
        return <ul className="boxList">
            {createVector.bind(this)()}
        </ul>
    }
});
// 返回按钮：关闭当前窗口，并可选执行回调
var BtnBack = React.createClass({
    contextTypes: {
        callWindow: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            callBack: null,
            disabled: false,
        }
    },
    render: function () {
        function callBack() {
            this.context.callWindow(null);
            if (this.props.callBack) {
                this.props.callBack();
            }
        }
        return <BtnComponent disabled={this.props.disabled} handleClick={callBack.bind(this)} desc='返回' />
    }
});
// 回家按钮：从外部地点耗时返回家中
var BtnHome = React.createClass({
    getDefaultProps: function () {
        return {
            placeName: null,
            callBack: null,
        }
    },
    contextTypes: {
        setCurrentScene: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        getTimeNeed: React.PropTypes.func.isRequired,
    },
    homeCallBack: function () {
        this.context.AudioEngine.stopBg(this.props.place);
        this.context.AudioEngine.playEffect('door_closed');
    },
    gohome: function () {
        if (this.props.placeName) {
            var timeNeed = this.context.getTimeNeed(this.props.placeName);
            function callBack() {
                this.context.setCurrentScene('home');
                if (this.props.callBack != null) {
                    this.props.callBack();
                } else {
                    this.homeCallBack()
                }
            }
            this.context.useTime(callBack.bind(this), timeNeed);
        } else {
            this.context.setCurrentScene('home');
        }
    },
    render: function () {
        return <BtnComponent desc='回家' handleClick={this.gohome} />
    }
});
// 资源富集显示：把资源/怪物数量折算为「很少~大量」文字
var ResourceDisplayComponent = React.createClass({
    getDefaultProps: function () {
        return {
            resource: null,
            type: 'resource'
        }
    },
    getAmountDescAll: function (itemList) {
        var type = this.props.type;
        //清算资源富集程度
        function getAmountDesc(amount) {
            var arr = ['很少', '较少', '一般', '较多', '大量'];
            for (var i = 0; i < arr.length - 1; i++) {
                if (amount < i * 10 + 10)
                    return arr[i];
            };
            return arr[i];
        };
        var result = [];
        var res = {};
        if (type == 'resource') {
            var attachData = ITEM_DATA;
            var isMst = false;
        } else {
            if ((type == 'mst')) {
                var attachData = MST_DATA;
                var isMst = true;
            }
        }
        for (var attr in itemList) {
            var typeName = attachData[attr].type || attr;
            var amount = isMst ? itemList[attr].amount : itemList[attr];
            if (amount == 0) continue;
            if (res[typeName]) {
                res[typeName] += amount;
            } else {
                res[typeName] = amount;
            }
        };
        for (var attr in res) {
            if (isMst ? MST_DATA[attr] : TYPE_DATA[attr]) {
                result.push(<p key={attr}>
                    <span>{isMst ? MST_DATA[attr].name : TYPE_DATA[attr].name}</span>
                    <span className="badge resourceAmount">
                        {getAmountDesc(res[attr])}
                    </span>
                </p>)
            }
        };
        return result;
    },
    render: function () {
        return <div>
            {this.getAmountDescAll(this.props.resource)}
        </div>
    }
})
// 通用按钮：统一处理禁用判定（disabled 属性 / 材料需求）、音效、左右键与悬停，
// 并在禁用被点击时给出原因提示（title 悬停 + 全局 toast）
var BtnComponent = React.createClass({
    contextTypes: {
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            disabled: false,
            handleClick: null,
            handleMouseEnter: null,
            desc: null,
            requireList: null,
            style: {},
            canEvent: false,
            sound: 'pick',
            className: 'btn',
            disabledReason: null,
        }
    },
    getDisabled: function () {
        return this.props.disabled || !this.context.checkHaveResourceAll(this.props.requireList, true)
    },
    getDisabledReason: function () {
        //先判定材料，再给出调用方指定的其它原因（如饱食/水分不足、冷却中）
        if (this.props.requireList && !this.context.checkHaveResourceAll(this.props.requireList, true)) return '材料不足';
        if (this.props.disabled) return this.props.disabledReason || '';
        return '';
    },
    handleClick: function (isRight, event) {
        if (this.getDisabled()) {
            var reason = this.getDisabledReason();
            if (reason) this.context.showMsg(<p key={Math.random()}>{reason}</p>);
            return;
        }
        this.context.AudioEngine.playEffect(this.props.sound);

        if (this.props.handleRightClick && isRight) {
            this.props.handleRightClick(event)
        } else {
            this.props.handleClick(event);
        }
    },
    handleMouseEnter: function () {
        if (this.getDisabled()) return;
        if (this.props.handleMouseEnter) this.props.handleMouseEnter();
    },
    render: function () {
        var disabledReason = this.getDisabled() ? this.getDisabledReason() : '';
        return <button title={disabledReason || undefined} style={this.props.style} onContextMenu={this.handleClick.bind(null, 'right')} onClick={this.handleClick.bind(null, false)} onMouseEnter={this.handleMouseEnter} className={this.props.className + (this.getDisabled() ? " disabled" : '')}>{this.props.desc || this.props.children}</button>
    }
});

//调试用
var DebugComponent = React.createClass({
    contextTypes: {
        setStateFromChildren: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        playerState: React.PropTypes.object.isRequired,
        handleDeath: React.PropTypes.func.isRequired,
        dungeonSaveData: React.PropTypes.object.isRequired,
        parentState: React.PropTypes.object.isRequired,
    },
    handleAddItem: function () {
        var item = ($('#itemName')[0].value);
        var amount = parseInt($('#itemAmount')[0].value);
        for (var attr in ITEM_DATA) {
            if (ITEM_DATA[attr].name == item) {
                item = attr;
                var boxSaveData = this.context.boxSaveData;
                boxSaveData.bag.things[item] = amount;
                this.context.setStateFromChildren({ boxSaveData: boxSaveData });
                break;
            }
        }

        for (var attr in STATE_DATA) {
            if (STATE_DATA[attr].name == item) {
                item = attr;
                var playerState = this.context.playerState;
                playerState[attr].amount = amount;
                this.context.setStateFromChildren({ playerState: playerState });
                break;
            }
        }
    },
    changeStair: function () {
        var dungeonSaveData = this.context.dungeonSaveData;
        dungeonSaveData.stairCount = parseInt($('#stairNum')[0].value);
        this.context.setStateFromChildren({
            dungeonSaveData: dungeonSaveData
        })
    },
    log: function () {
        var state = this.context.parentState;
        var log = ($('#log')[0].value);
        eval(log);
    },
    logState: function () {
        var state = this.context.parentState;
        console.log(state)
    },
    render: function () {
        return (
            <div>
                <input id='log' />
                <BtnComponent handleClick={this.log} desc='输出' />
                <BtnComponent handleClick={this.logState} desc='输出所有' />
                <input id='itemName' />
                <input id='itemAmount' type='number' />
                <BtnComponent handleClick={this.handleAddItem} desc='添加' />
                <BtnComponent handleClick={this.context.handleDeath.bind(null, 'hunger')} desc='饿死' />
                <input id='stairNum' type='number' />
                <BtnComponent handleClick={this.changeStair} desc='穿越' />
            </div>
        )
    }
});
