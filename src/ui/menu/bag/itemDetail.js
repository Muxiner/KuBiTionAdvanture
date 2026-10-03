/**
 * src/ui/menu/bag/itemDetail.js —— 物品/状态/说明 详情面板
 * 由 menu.js 的 BagComponent 拆出，自带丢弃二次确认逻辑。
 * 读取上下文：detailedType/detailedItem/detailedList 决定展示哪种详情。
 */
var ItemDetailComponent = React.createClass({
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        currentBox: React.PropTypes.string.isRequired,
        detailedItem: React.PropTypes.string.isRequired,
        detailedType: React.PropTypes.string.isRequired,
        detailedList: React.PropTypes.array.isRequired,
        durableSaveData: React.PropTypes.object.isRequired,
        getMaxDurable: React.PropTypes.func.isRequired,
        getTempDesc: React.PropTypes.func.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        cancelEquip: React.PropTypes.func.isRequired,
        handleItemClick: React.PropTypes.func.isRequired,
        discardItem: React.PropTypes.func.isRequired,
        changeMsg: React.PropTypes.func.isRequired,
        playerState: React.PropTypes.object.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
    },
    getInitialState: function () {
        return {
            discardConfirm: null,
        }
    },
    getItemBoxFromDetail: function () {
        var detailedItem = this.context.detailedItem;
        var boxSaveData = this.context.boxSaveData;
        var currentBox = this.context.currentBox;
        var box;
        if (boxSaveData.bag.things[detailedItem]) {
            box = 'bag';
        } else {
            if (currentBox && boxSaveData[currentBox].things[detailedItem]) {
                box = currentBox;
            } else {
                box = false;
            }
        }
        return box;
    },
    useItemFromDetail: function () {
        var detailedItem = this.context.detailedItem;
        this.context.handleItemClick(detailedItem, this.getItemBoxFromDetail());
    },
    // 丢弃物品：默认丢 1 个，按住 Shift 丢该容器内全部；需二次确认
    handleDiscard: function (item, event) {
        if (this.state.discardConfirm != item) {
            this.setState({ discardConfirm: item });
            return;
        }
        var box = this.getItemBoxFromDetail();
        if (!box) return;
        this.context.cancelEquip(item);
        var have = this.context.boxSaveData[box].things[item] || 0;
        var amount = (event && event.shiftKey) ? have : 1;
        if (amount < 1) amount = 1;
        this.context.discardItem(item, box, amount);
        this.setState({ discardConfirm: null });
        this.context.changeMsg('', 'item');
        this.context.AudioEngine.playEffect('pick');
    },
    cancelDiscard: function () {
        this.setState({ discardConfirm: null });
    },
    getItemDetail: function () {
        var detailedItem = this.context.detailedItem;
        if (!detailedItem) return null;
        if (!ITEM_DATA[detailedItem]) return null; // 非物品条目（如某些升级项）不显示详情
        //装备的处理
        var currentEquip = this.context.currentEquip;
        var equipShow = null;
        var equipType = ITEM_DATA[detailedItem].equipType;
        if (equipType) {
            if (currentEquip[equipType] != detailedItem) {
                equipShow = <span style={{ color: COLOR.RED }}>右键装备</span>;
            } else {
                equipShow = <span style={{ color: COLOR.GREEN }}>已装备</span>;
            }
        }
        function getDetailDesc() {
            if (ITEM_DATA[detailedItem].effect) {
                var res = [];
                for (var attr in ITEM_DATA[detailedItem].effect) {
                    var effectAmount = ITEM_DATA[detailedItem].effect[attr];

                    var prefix = effectAmount > 0 ? '+' : '';
                    var isGreen;
                    if (attr == 'temp') {
                        isGreen = (this.context.playerState['temp'].amount > 0) != (effectAmount > 0);
                    } else {
                        isGreen = (effectAmount > 0);
                    }
                    res.push(<span key={attr} className={'detailVector ' + (isGreen ? "effectPlus" : "effectMinus")}>{STATE_DATA[attr].name}:{prefix}{effectAmount}</span>)
                };
                return <p>{res}</p>
            } else {
                return null
            }
        }
        var maxDurable = ITEM_DATA[detailedItem].durable && this.context.getMaxDurable(detailedItem);
        var durable = durableWear(this.context.durableSaveData, detailedItem);
        return <div className="detailHead">
            <p className="detailVector effectHeading clearFix">
                {ITEM_DATA[detailedItem].name}
            </p>
            {equipType ? <p className="detailVector effectHeading clearFix">{EQUIP_TYPE_DATA[equipType]}</p> : null}
            <p className="detailVector effectHeading clearFix">
                {equipShow || (TYPE_DATA[ITEM_DATA[detailedItem].type] ? TYPE_DATA[ITEM_DATA[detailedItem].type].name : ITEM_DATA[detailedItem].type)}
            </p>
            {(!IS_IPAD && ITEM_DATA[detailedItem].canUse) ? <p className="detailVector effectHeading clearFix" >右键使用</p> : null}
            {maxDurable != undefined ? <div className="detailVector effectHeading clearFix" >耐久度：{maxDurable - durable}/{maxDurable}</div> : null}
            <div className="detailVector detailDesc">
                {ITEM_DATA[detailedItem].desc}
                {(IS_IPAD && ITEM_DATA[detailedItem].canUse) ? <BtnComponent disabled={!this.getItemBoxFromDetail()} handleClick={this.useItemFromDetail}>使用</BtnComponent> : null}
                {(IS_IPAD && ITEM_DATA[detailedItem].equipType) ? <BtnComponent disabled={this.getItemBoxFromDetail() != 'bag'} handleClick={this.useItemFromDetail}>装备</BtnComponent> : null}
            </div>
            {(ITEM_DATA[detailedItem].type != 'quest' && ITEM_DATA[detailedItem].type != 'special') ?
                <div className="detailVector detailDiscard">
                    {this.state.discardConfirm == detailedItem ?
                        <span>
                            <BtnComponent disabled={!this.getItemBoxFromDetail()} handleClick={this.handleDiscard.bind(this, detailedItem)}>确认丢弃</BtnComponent>
                            <BtnComponent handleClick={this.cancelDiscard}>取消</BtnComponent>
                            <span className="discardHint">Shift=丢全部</span>
                        </span>
                        :
                        <span>
                            <BtnComponent disabled={!this.getItemBoxFromDetail()} handleClick={this.handleDiscard.bind(this, detailedItem)}>丢弃</BtnComponent>
                            <span className="discardHint">点两次·Shift=丢全部</span>
                        </span>
                    }
                </div>
                : null}
            {getDetailDesc.bind(this)()}
        </div>
    },
    getStateDetail: function () {
        var detailedItem = this.context.detailedItem;
        var tempDesc = this.context.getTempDesc();
        var name = STATE_DATA[detailedItem].name;
        if (detailedItem == 'temp') {
            var desc = <div>
                <p>{TEMP_DATA[tempDesc].desc}</p>
            </div>
        } else {
            var desc = STATE_DATA[detailedItem].desc;
        }
        return <div className="detailHead">
            <span className='detailVector effectHeading clearFix'>{name}</span>
            {detailedItem == 'temp' ? <span className='detailVector effectHeading clearFix'>{TEMP_DATA[tempDesc].name}</span> : null}
            <div className="detailVector detailDesc">
                {desc}
            </div>
        </div>
    },
    getDescDetail: function () {
        var detailedList = this.context.detailedList;
        var result = [];
        for (var i = 0; i < detailedList.length; i++) {
            result.push(detailedList[i]);
        };
        return <div className="detailHead">
            <div className="detailVector detailDesc">
                {result}
            </div>
        </div>
    },
    render: function () {
        switch (this.context.detailedType) {
            case 'item': return this.getItemDetail();
            case 'state': return this.getStateDetail();
            case 'desc': return this.getDescDetail();
        }
        return null;
    }
});
