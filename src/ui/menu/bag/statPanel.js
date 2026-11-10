/**
 * src/ui/menu/bag/statPanel.js —— 属性统计面板
 * 由当前装备与技能推导出的关键属性。
 * props: skill, currentEquip, getMaxState
 */
var StatPanelComponent = React.createClass({
    getDefaultProps: function () {
        return {
            skill: {},
            currentEquip: {},
            getMaxState: null,
        }
    },
    getStatRows: function () {
        var skill = this.props.skill || {};
        var currentEquip = this.props.currentEquip || {};
        var getMaxState = this.props.getMaxState;
        function skillLv(id) { return skill[id] || 0; }
        // 有加成的行统一带 +（lib 的 fmtPct(0) 返回 "0%"，这里显示 "+0%"）
        function bonusPct(n) { return Number(n) === 0 ? '+0%' : fmtPct(n); }
        function skillPct(id) {
            return Math.round(100 * skillLv(id) * SKILL_DATA[id].buff);
        }
        function skillTitle(skillId, extra) {
            return '来自技能「' + SKILL_DATA[skillId].name + '」Lv.' + fmtNum(skillLv(skillId)) + '（' + extra + '）';
        }
        var rows = [];
        rows.push({ name: '生命上限', value: fmtNum(getMaxState('hp')), title: '基础 100，受「体能强化」技能提升（每级 +100%）' });
        rows.push({ name: '体力上限', value: fmtNum(getMaxState('ps')), title: '基础 100，受「耐久强化」技能提升（每级 +100%）' });
        rows.push({ name: '精神上限', value: fmtNum(getMaxState('san')), title: '基础 100，受「耐久强化」技能提升（每级 +100%）' });
        rows.push({ name: '近战加成', value: bonusPct(skillPct('melee')), title: skillTitle('melee', '每级近战伤害 +15%') });
        rows.push({ name: '远程加成', value: bonusPct(skillPct('shoot')), title: skillTitle('shoot', '每级远程伤害 +15%') });
        rows.push({ name: '魔法加成', value: bonusPct(skillPct('magic')), title: skillTitle('magic', '每级魔法伤害 +15%') });
        rows.push({ name: '伤害加成', value: bonusPct(skillPct('fighter')), title: skillTitle('fighter', '每级伤害 +100%') });
        var dl = skill.def || 0;
        var mul = Math.pow(SKILL_DATA.def.buff, dl) * 0.95 + 0.05 * (10 / (10 + dl));
        var defPct = Math.min(Math.round(100 * (1 - mul)), Math.round(DAMAGE_REDUCTION_CAP * 100));
        rows.push({ name: '伤害减免', value: bonusPct(defPct), title: skillTitle('def', '每级约减少所受伤害 10%，乘算递减，总减伤上限 85%') });
        var moveMul = 1, collect = 0, temp = 0;
        var equipNames = [];
        for (var slot in currentEquip) {
            var eq = currentEquip[slot];
            if (!eq) continue;
            var d = ITEM_DATA[eq];
            equipNames.push(ITEM_DATA[eq].name);
            if (d.moveFaster) moveMul *= d.moveFaster;
            if (d.collectSpeed) collect += d.collectSpeed;
            if (d.tempBuff) temp += d.tempBuff;
        }
        var equipHint = equipNames.length ? ('当前装备：' + equipNames.join('、')) : '当前没有装备';
        rows.push({ name: '移速加成', value: bonusPct(Math.round(100 * (1 - moveMul))), title: '来自装备的移速效果，减少外出耗时；' + equipHint });
        rows.push({ name: '采集速度', value: bonusPct(Math.round(100 * collect)), title: '来自装备的采集速度，缩短采集耗时；' + equipHint });
        rows.push({ name: '体温修正', value: temp === 0 ? '0（无）' : ((temp > 0 ? '+' : '') + fmtNum(Math.round(temp))), title: '来自装备的体温修正；0 表示没有修正。体温过高流失水分，过低流失体力。' });
        rows.push({ name: '贪婪', value: bonusPct(skillPct('greedy')), title: skillTitle('greedy', '每级拾荒/采集收益 +100%') });
        rows.push({ name: '幸运', value: bonusPct(skillPct('lucky')), title: skillTitle('lucky', '每级敌人材料掉落 +50%') });
        return rows;
    },
    // 渲染签名：技能等级 + 当前装备（skill/currentEquip 都可能被原地修改）
    getStatSig: function (props) {
        var skill = props.skill || {};
        var equip = props.currentEquip || {};
        var parts = [];
        for (var k in skill) parts.push(k + ':' + skill[k]);
        for (var slot in equip) parts.push(slot + ':' + (equip[slot] || ''));
        return parts.join(',');
    },
    shouldComponentUpdate: function (nextProps, nextState, nextContext) {
        // 本组件不读取 context；state 变化（折叠）与 props/签名变化都要放行
        if (nextState.open !== this.state.open) return true;
        if (uxShallowChanged(nextProps, this.props)) return true;
        return this.getStatSig(nextProps) !== this._statSig;
    },
    getInitialState: function () {
        // 属性统计默认展开，可折叠（后期信息过载时让玩家自己决定看不看）
        return { open: true };
    },
    toggle: function () {
        this.setState({ open: !this.state.open });
    },
    render: function () {
        this._statSig = this.getStatSig(this.props);
        var rows = this.getStatRows();
        var open = this.state.open;
        return <div className={"statPanel" + (open ? '' : ' isCollapsed')}>
            <button type="button" className="sectionToggle" aria-expanded={open ? 'true' : 'false'} onClick={this.toggle} title='生命/体力上限受技能影响；各项加成来自技能与当前装备'>
                <span className="sectionToggleTitle">属性统计</span>
                <span className="sectionToggleMark" aria-hidden="true">{open ? '▾' : '▸'}</span>
            </button>
            {open ? <div className="statGrid">
                {rows.map(function (r) {
                    return <div className='statRow' key={r.name} title={r.title}>
                        <span className='statName'>{r.name}</span>
                        <span className='statValue'>{r.value}</span>
                    </div>;
                })}
            </div> : null}
        </div>;
    }
});
