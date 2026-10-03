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
        checkFull: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
    },
    // 放入大箱子：把当前容器内的物品全部移回大箱子（受容量限制）
    putOut: function () {
        var box = this.props.box;
        if (!box || box == 'bigBox') return;
        var boxSaveData = this.context.boxSaveData;
        var from = clone(boxSaveData[box].things);
        var move = {};
        for (var id in from) {
            if (this.context.checkFull(boxSaveData['bigBox'], id)) continue;
            move[id] = from[id];
        }
        if (getLength(move) == 0) return;
        this.context.changeItem(clone(move), 'bigBox');
        this.context.changeItem(clone(move), box, true);
        this.context.AudioEngine.playEffect('exchange');
    },
    render: function () {
        if (!this.props.box || this.props.box == 'bigBox') return null;
        return <div className='boxTransfer'>
            <BtnComponent handleClick={this.putOut}>放入大箱子</BtnComponent>
        </div>;
    }
});
