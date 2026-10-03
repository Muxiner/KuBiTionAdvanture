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
        function skillPct(id) {
            return Math.round(100 * (skill[id] || 0) * SKILL_DATA[id].buff);
        }
        var rows = [];
        rows.push(['生命上限', getMaxState('hp')]);
        rows.push(['体力上限', getMaxState('ps')]);
        rows.push(['精神上限', getMaxState('san')]);
        rows.push(['近战加成', '+' + skillPct('melee') + '%']);
        rows.push(['远程加成', '+' + skillPct('shoot') + '%']);
        rows.push(['魔法加成', '+' + skillPct('magic') + '%']);
        rows.push(['伤害加成', '+' + skillPct('fighter') + '%']);
        var dl = skill.def || 0;
        var mul = Math.pow(SKILL_DATA.def.buff, dl) * 0.95 + 0.05 * (10 / (10 + dl));
        rows.push(['伤害减免', Math.round(100 * (1 - mul)) + '%']);
        var moveMul = 1, collect = 0, temp = 0;
        for (var slot in currentEquip) {
            var eq = currentEquip[slot];
            if (!eq) continue;
            var d = ITEM_DATA[eq];
            if (d.moveFaster) moveMul *= d.moveFaster;
            if (d.collectSpeed) collect += d.collectSpeed;
            if (d.tempBuff) temp += d.tempBuff;
        }
        rows.push(['移速加成', '+' + Math.round(100 * (1 - moveMul)) + '%']);
        rows.push(['采集速度', '+' + Math.round(100 * collect) + '%']);
        rows.push(['体温修正', (temp > 0 ? '+' : '') + Math.round(temp)]);
        rows.push(['贪婪', '+' + skillPct('greedy') + '%']);
        rows.push(['幸运', '+' + skillPct('lucky') + '%']);
        return rows;
    },
    render: function () {
        var rows = this.getStatRows();
        return <div className="statPanel">
            <div className="statTitle">属性统计</div>
            <div className="statGrid">
                {rows.map(function (r) {
                    return <div className='statRow' key={r[0]}>
                        <span className='statName'>{r[0]}</span>
                        <span className='statValue'>{r[1]}</span>
                    </div>;
                })}
            </div>
        </div>;
    }
});
