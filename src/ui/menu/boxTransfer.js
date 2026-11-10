/**
 * src/ui/menu/boxTransfer.js —— 容器快捷转移
 * 把当前建筑容器内的物品一键放入「大箱子」（受容量限制）。
 */
// 容器快捷转移：把当前建筑容器内的物品一键放入「大箱子」
// props.box 为当前容器名（如 'cooked' 等）
var BoxTransferComponent = React.createClass({
    getDefaultProps: function () {
        return {
            box: null,
        }
    },
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        buildingSaveData: React.PropTypes.object.isRequired,
        checkFull: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    // 渲染签名：当前容器件数 / 大箱子件数与容量 / 大箱子是否已建
    // （boxSaveData、buildingSaveData 都可能原地修改）
    getTransferSig: function (props, ctx) {
        var boxSaveData = ctx.boxSaveData || {};
        var buildingSaveData = ctx.buildingSaveData || {};
        var src = boxSaveData[props.box];
        var big = boxSaveData['bigBox'];
        var bigBuilding = buildingSaveData['bigBox'];
        return (src ? getLength(src.things) : 0) + '|' +
            (big ? getLength(big.things) : 0) + '|' +
            (big ? big.size : 0) + '|' +
            (bigBuilding && bigBuilding.own ? 1 : 0);
    },
    shouldComponentUpdate: function (nextProps, nextState, nextContext) {
        if (uxShallowChanged(nextProps, this.props)) return true;
        if (uxCtxChanged(nextContext, this.context, ['boxSaveData', 'buildingSaveData', 'checkFull', 'changeItem', 'AudioEngine', 'showMsg'])) return true;
        return this.getTransferSig(nextProps, nextContext || this.context) !== this._transferSig;
    },
    // 放入大箱子：把当前容器内的物品全部移回大箱子（受容量限制）
    putOut: function () {
        var box = this.props.box;
        if (!box || box == 'bigBox') return;
        var bigBox = this.context.buildingSaveData['bigBox'];
        if (!bigBox || !bigBox.own) {
            this.context.showMsg(<p key={Math.random()}>还没有建造大箱子……请先回家，在「建造」里造一个（需要木头 ×12）</p>);
            return;
        }
        var boxSaveData = this.context.boxSaveData;
        var from = clone(boxSaveData[box].things);
        if (getLength(from) == 0) {
            this.context.showMsg(<p key={Math.random()}>当前容器里没有可放入的物品……先去制作或采集一些吧</p>);
            return;
        }
        var move = {};
        for (var id in from) {
            if (this.context.checkFull(boxSaveData['bigBox'], id)) continue;
            move[id] = from[id];
        }
        if (getLength(move) == 0) {
            this.context.showMsg(<p key={Math.random()}>大箱子已满……请先整理或出售一些物品，或升级大箱子扩容</p>);
            return;
        }
        this.context.changeItem(clone(move), 'bigBox');
        this.context.changeItem(clone(move), box, true);
        this.context.AudioEngine.playEffect('exchange');
        var bigBoxData = this.context.boxSaveData['bigBox'];
        this.context.showMsg(<p key={Math.random()}>{'已把 ' + fmtNum(getLength(move)) + ' 种物品放入大箱子（大箱子 ' + fmtNum(getLength(bigBoxData.things)) + ' / ' + fmtNum(bigBoxData.size) + ' 格）'}</p>);
    },
    getDisabledReason: function () {
        if (!this.props.box || this.props.box == 'bigBox') return '';
        var bigBox = this.context.buildingSaveData['bigBox'];
        if (!bigBox || !bigBox.own) return '还没有建造大箱子';
        if (getLength(this.context.boxSaveData[this.props.box].things) == 0) return '当前容器里没有物品';
        return '大箱子已满';
    },
    render: function () {
        this._transferSig = this.getTransferSig(this.props, this.context);
        if (!this.props.box || this.props.box == 'bigBox') return null;
        var empty = getLength(this.context.boxSaveData[this.props.box].things) == 0;
        var noBigBox = !(this.context.buildingSaveData['bigBox'] && this.context.buildingSaveData['bigBox'].own);
        return <div className='boxTransfer'>
            <BtnComponent disabled={empty || noBigBox} disabledReason={this.getDisabledReason()} handleClick={this.putOut}>放入大箱子</BtnComponent>
        </div>;
    }
});
