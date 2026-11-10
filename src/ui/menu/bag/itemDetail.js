/**
 * src/ui/menu/bag/itemDetail.js —— 物品/状态/说明 详情面板
 * 展示固定信息行（名称/类别/数量或耐久/描述/效果/价值），操作按钮常显；
 * 数量、时长、金币统一走 lib.js 的 fmt* 工具。
 */
// 武器类型显示名
var DETAIL_WEAPON_TYPE = { melee: '近战', shoot: '远程', magic: '魔法' };
// 装备加成的展示映射：[字段, 显示名, 类型]
//   pct     —— 值本身就是百分数（内部仍按比例存储）
//   plus    —— 直接显示 +N
//   mult    —— 乘法系数（×1.5）
var DETAIL_BONUS_FIELDS = [
    ['meleeMul', '近战伤害', 'pct'],
    ['shootMul', '远程伤害', 'pct'],
    ['magicMul', '魔法伤害', 'pct'],
    ['dmgMul', '总伤害', 'mult'],
    ['meleeCostDec', '近战体力消耗', 'dec'],
    ['shootCostDec', '远程体力消耗', 'dec'],
    ['magicCostDec', '魔法体力消耗', 'dec'],
    ['moveFaster', '移动耗时', 'dec'],
    ['collectSpeed', '采集速度', 'addpct'],
    ['tempBuff', '体温', 'plus'],
    ['block', '格挡概率', 'addpct'],
    ['agileInc', '射程', 'plus'],
    ['psToDef', '按体力获得防御', 'addpct'],
    ['reiToDmg', '每轮回额外伤害', 'plus'],
    ['reiToAtk', '每轮回命中', 'addpct'],
    ['reiToDef', '每轮回减伤', 'addpct'],
    ['frozenArm', '冰冻护甲', 'addpct'],
    ['frozen', '冰冻概率', 'addpct'],
    ['runChanceMul', '逃跑成功率', 'mult'],
    ['curse', '按敌人生命上限附加伤害', 'addpct'],
    ['durableDec', '每击耐久损耗', 'plus'],
    ['tempDownMul', '降温速度', 'mult'],
    ['tempUpMul', '升温速度', 'mult']
];

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
        getMaxState: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    getInitialState: function () {
        return {
            discardConfirm: null,
        }
    },
    // 判断被查看的物品所在容器（背包优先，其次当前容器），无则 false
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
    getItemAmount: function () {
        var box = this.getItemBoxFromDetail();
        if (!box) return 0;
        return this.context.boxSaveData[box].things[this.context.detailedItem] || 0;
    },
    // 使用/装备被查看的物品
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
        if (!box) {
            this.context.showMsg(<p key={Math.random()}>无法丢弃：该物品不在背包或当前容器中</p>);
            return;
        }
        this.context.cancelEquip(item);
        var have = this.context.boxSaveData[box].things[item] || 0;
        var amount = (event && event.shiftKey) ? have : 1;
        if (amount < 1) amount = 1;
        if (amount > have) amount = have;
        var displayName = fmtItemName(item);
        this.context.discardItem(item, box, amount);
        this.setState({ discardConfirm: null });
        this.context.changeMsg('', 'item');
        this.context.AudioEngine.playEffect('pick');
        this.context.showMsg(<p key={Math.random()}>{'已丢弃 ' + displayName + ' ' + fmtQty(amount)}</p>);
    },
    cancelDiscard: function () {
        this.setState({ discardConfirm: null });
    },
    // 一行"标签：值"
    detailRow: function (label, value, title) {
        return <div className='ux-detailRow' key={label} title={title || undefined}>
            <span className='ux-detailLabel'>{label}</span>
            <span className='ux-detailValue'>{value}</span>
        </div>;
    },
    // 使用效果（食物/药剂等）：满腹 +15、体力 +10
    getEffectRow: function (d) {
        if (!d.effect) return null;
        var parts = [];
        for (var attr in d.effect) {
            var n = d.effect[attr];
            var stateName = STATE_DATA[attr] ? STATE_DATA[attr].name : attr;
            var cls = n >= 0 ? 'ux-good' : 'ux-bad';
            var sign = n > 0 ? '+' : '';
            parts.push(<span key={attr} className={cls}>{(n > 0 ? '恢复' : '') + stateName + ' ' + sign + fmtNum(n)}</span>);
        }
        var joined = [];
        for (var i = 0; i < parts.length; i++) {
            if (i) joined.push(<span key={'sep' + i} className='ux-detailSep'>、</span>);
            joined.push(parts[i]);
        }
        return this.detailRow('效果', <span>{joined}</span>, '使用后立即生效，数值为绝对值');
    },
    // 武器信息：伤害 / 射程 / 每击消耗 / 弹药
    getWeaponRow: function (d) {
        if (d.damage == null && !d.weaponType) return null;
        var bits = [];
        var wt = DETAIL_WEAPON_TYPE[d.weaponType] || d.weaponType || '';
        if (wt) bits.push(wt);
        if (d.damage != null) bits.push('伤害 ' + fmtNum(d.damage));
        if (d.range != null) bits.push('射程 ' + fmtNum(d.range));
        var text = bits.join(' · ');
        var sub = [];
        if (d.require) sub.push('每击消耗 ' + uxReqText(d.require));
        if (d.bullet) sub.push('弹药：' + fmtItemName(d.bullet));
        var extra = sub.length ? <span className='ux-detailSub'>（{sub.join('；')}）</span> : null;
        return this.detailRow('武器', <span>{text}{extra}</span>, '伤害与射程会受技能和装备加成影响');
    },
    // 装备加成汇总：近战伤害 +12%、移动耗时 -10%
    getBonusRow: function (d) {
        var bits = [];
        for (var i = 0; i < DETAIL_BONUS_FIELDS.length; i++) {
            var key = DETAIL_BONUS_FIELDS[i][0];
            var label = DETAIL_BONUS_FIELDS[i][1];
            var type = DETAIL_BONUS_FIELDS[i][2];
            var v = d[key];
            if (v == null || v === 0 || v === 1 && type === 'mult') continue;
            if (type === 'pct') bits.push(label + ' ' + fmtPct(v * 100));
            else if (type === 'addpct') bits.push(label + ' +' + fmtNum(Math.round(v * 1000) / 10) + '%');
            else if (type === 'dec') {
                var decPct = fmtNum(Math.abs(Math.round(v * 1000) / 10));
                bits.push(label + (v >= 0 ? ' -' : ' +') + decPct + '%');
            }
            else if (type === 'mult') bits.push(label + ' ×' + fmtNum(v));
            else if (type === 'plus') bits.push(label + ' ' + (v > 0 ? '+' : '') + fmtNum(v));
        }
        if (d.rec) {
            var recBits = [];
            for (var stat in d.rec) {
                var rn = d.rec[stat];
                var sn = STATE_DATA[stat] ? STATE_DATA[stat].name : stat;
                recBits.push(sn + ' ' + (rn > 0 ? '+' : '') + fmtNum(rn) + '/小时');
            }
            bits.push('持续效果：' + recBits.join('、'));
        }
        if (d.dmgTo && d.dmgTo.target) {
            bits.push('吸取伤害 ' + fmtNum(d.dmgTo.buff * 100) + '% 转为' + (STATE_DATA[d.dmgTo.target] ? STATE_DATA[d.dmgTo.target].name : d.dmgTo.target));
        }
        if (!bits.length) return null;
        return this.detailRow('加成', bits.join(' · '), '来自装备本身的属性加成');
    },
    getItemDetail: function () {
        var detailedItem = this.context.detailedItem;
        if (!detailedItem) return null;
        if (!ITEM_DATA[detailedItem]) return null; // 非物品条目（如某些升级项）不显示详情
        var d = ITEM_DATA[detailedItem];
        var currentEquip = this.context.currentEquip;
        var equipType = d.equipType;
        // 武器走 weapon1/weapon2 动态槽位（数据里没有 equipType），这里统一解析出实际槽位，
        // 让详情面板也能显示"装备/卸下"，而不是只有右键才能装备武器。
        var equipSlot = null;
        if (equipType && currentEquip[equipType] == detailedItem) {
            equipSlot = equipType;
        } else if (d.type == 'weapon') {
            if (currentEquip.weapon1 == detailedItem) equipSlot = 'weapon1';
            else if (currentEquip.weapon2 == detailedItem) equipSlot = 'weapon2';
        }
        var isEquipped = !!equipSlot;
        var itemBox = this.getItemBoxFromDetail();
        var amount = this.getItemAmount();
        var typeName = TYPE_DATA[d.type] ? TYPE_DATA[d.type].name : d.type;
        var categoryText = typeName + (d.weaponType ? ' · ' + (DETAIL_WEAPON_TYPE[d.weaponType] || d.weaponType) : '');
        if (equipType) categoryText += ' · 装备槽：' + (EQUIP_TYPE_DATA[equipType] || equipType);
        var maxDurable = d.durable && this.context.getMaxDurable(detailedItem);
        var durable = durableWear(this.context.durableSaveData, detailedItem);
        var value = (d.value == null) ? 0 : d.value;
        var rows = [];
        rows.push(this.detailRow('类别', categoryText));
        if (maxDurable != undefined) {
            rows.push(this.detailRow('耐久', fmtNum(maxDurable - durable) + '/' + fmtNum(maxDurable),
                '耐久会在攻击/采集时消耗；可用充能卷轴或修理恢复'));
        }
        if (amount > 0) {
            rows.push(this.detailRow('数量', fmtQty(amount), '当前所在容器中的数量'));
        } else if (isEquipped) {
            rows.push(this.detailRow('数量', '已在装备栏（' + (EQUIP_TYPE_DATA[equipSlot] || equipSlot) + '）'));
        }
        rows.push(this.detailRow('描述', d.desc || '（暂无描述）'));
        var effectRow = this.getEffectRow(d);
        if (effectRow) rows.push(effectRow);
        var weaponRow = this.getWeaponRow(d);
        if (weaponRow) rows.push(weaponRow);
        var bonusRow = this.getBonusRow(d);
        if (bonusRow) rows.push(bonusRow);
        if (d.durableRec) {
            rows.push(this.detailRow('充能', '为' + (d.durableRec == 'unmagic' ? '剑/弓等武器' : (DETAIL_WEAPON_TYPE[d.durableRec] || d.durableRec)) + '恢复耐久 +' + fmtNum(d.durableAmount || 1)));
        }
        rows.push(this.detailRow('价值', fmtMoney(value) + (value <= 0 ? '（不可出售）' : ''), '出售给商人时可换取的金币'));
        return <div className="detailHead">
            <p className="detailVector effectHeading clearFix ux-detailTitle">
                {fmtItemName(detailedItem)}
                {isEquipped ? <span className='ux-equippedBadge' title='该物品已装备'>已装备</span> : null}
            </p>
            <div className='ux-detailRows'>{rows}</div>
            {/* 操作区：桌面与触屏始终可见（不依赖右键） */}
            <div className="detailActions">
                {d.canUse ? <BtnComponent disabled={!itemBox} disabledReason='该物品不在背包或当前容器中'
                    title='使用后会消耗 1 个并立即生效' handleClick={this.useItemFromDetail}>使用</BtnComponent> : null}
                {((equipType || d.type == 'weapon') && !isEquipped) ? <BtnComponent disabled={itemBox != 'bag'} disabledReason='只能装备背包里的物品'
                    title={d.type == 'weapon'
                        ? '装备到武器槽：优先放入空的武器 1/2 槽，两槽都满时替换武器 1；武器会占用装备栏，不再占背包格'
                        : '装备到「' + (EQUIP_TYPE_DATA[equipType] || equipType) + '」槽；重复装备会替换原装备'}
                    handleClick={this.useItemFromDetail}>装备</BtnComponent> : null}
                {isEquipped ? <BtnComponent title='卸下并放回背包（背包需要有空位）'
                    handleClick={this.context.cancelEquip.bind(this, detailedItem)}>卸下</BtnComponent> : null}
                {/* 武器：isEquipped 里已包含 weapon1/weapon2，上面一行即可覆盖 */}
                {!IS_IPAD && d.canUse ? <span className="detailHint">快捷键：右键可快速使用</span> : null}
            </div>
            {(d.type != 'quest' && d.type != 'special') ?
                <div className="detailVector detailDiscard">
                    {this.state.discardConfirm == detailedItem ?
                        <span>
                            <BtnComponent disabled={!itemBox} disabledReason='该物品不在背包或当前容器中'
                                title='确认丢弃后无法恢复' handleClick={this.handleDiscard.bind(this, detailedItem)}>确认丢弃</BtnComponent>
                            <BtnComponent handleClick={this.cancelDiscard}>取消</BtnComponent>
                            <span className="discardHint">Shift + 点击 = 丢弃全部</span>
                        </span>
                        :
                        <span>
                            <BtnComponent disabled={!itemBox} disabledReason='该物品不在背包或当前容器中'
                                title='第一次点击进入确认；Shift + 点击可丢弃全部' handleClick={this.handleDiscard.bind(this, detailedItem)}>丢弃</BtnComponent>
                            <span className="discardHint">点两次确认 · Shift + 点击丢全部</span>
                        </span>
                    }
                </div>
                : null}
        </div>
    },
    getStateDetail: function () {
        var detailedItem = this.context.detailedItem;
        var tempDesc = this.context.getTempDesc();
        var name = STATE_DATA[detailedItem].name;
        var isTemp = detailedItem == 'temp';
        var max = this.context.getMaxState(detailedItem);
        var cur = Math.ceil(this.context.playerState[detailedItem].amount);
        var levelText = isTemp ? TEMP_DATA[tempDesc].name : stateLevelText(cur, max);
        var desc = isTemp ? TEMP_DATA[tempDesc].desc : STATE_DATA[detailedItem].desc;
        var recover = STATE_RECOVER[detailedItem] || '—';
        var valueText = isTemp ? levelText : (fmtNum(cur) + ' / ' + fmtNum(max) + '（' + levelText + '）');
        return <div className="detailHead">
            <span className='detailVector effectHeading clearFix'>{name}</span>
            <div className='ux-detailRows'>
                {this.detailRow('当前', valueText)}
                {this.detailRow('说明', desc)}
                {this.detailRow('恢复方式', recover)}
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
        </div>;
    },
    render: function () {
        switch (this.context.detailedType) {
            case 'item':
                var detail = this.getItemDetail();
                if (detail) return detail;
                break;
            case 'state': return this.getStateDetail();
            case 'desc': return this.getDescDetail();
        }
        // 详情面板常驻提示（空状态三要素：为什么空 + 能做什么 + 怎么做）
        return <div className="detailHead detailEmpty">
            <p>还没有选中物品</p>
            <p className="detailEmptyHint">点按或左键点击背包/装备栏里的物品，这里会显示名称、属性与可执行操作。</p>
            <p className="detailEmptyHint">键盘：Tab 聚焦物品后按 Enter 选中。</p>
        </div>;
    }
});
