/**
 * src/ui/menu/skillPanel.js —— 技能面板
 * 左侧技能列表 + 右侧描述与当前加成。从 NormalMenuComponent 拆出。
 */
var SkillPanelComponent = React.createClass({
    contextTypes: {
        skill: React.PropTypes.object.isRequired,
    },
    getInitialState: function () {
        return {
            selectedSkill: null,
        }
    },
    handleSkillTab: function (skill) {
        this.setState({ selectedSkill: skill });
    },
    // 技能列表（名称 + 等级角标，单击选中）
    getSkillList: function () {
        var skill = this.context.skill;
        if (getLength(skill) == 0) {
            return <p style={{ color: COLOR.YELLOW }}>你还没有习得任何技能</p>
        }
        var result = [];
        for (var attr in skill) {
            if (!SKILL_DATA[attr].name) continue;
            result.push(<div className='btn skillItem' onClick={this.handleSkillTab.bind(this, attr)} key={SKILL_DATA[attr].name}>{SKILL_DATA[attr].name} &nbsp; {SKILL_DATA[attr].one ? null : <span className='badge'>{skill[attr]}</span>}</div>)
        }
        return result;
    },
    // 选中技能的描述与当前加成数值
    getSkillDesc: function () {
        var skill = this.context.skill;
        var selectedSkill = this.state.selectedSkill;
        selectedSkill = selectedSkill || (getFirst(skill) && getFirst(skill).attr) || null;
        if (!selectedSkill) return null;

        function getAmount() {
            var lv = skill[selectedSkill];
            var buffTotal = lv * SKILL_DATA[selectedSkill].buff;
            var desc_1, desc_2;
            switch (selectedSkill) {
                case 'greedy':
                case 'durable':
                case 'physique':
                case 'lucky':
                case 'fighter':
                    desc_1 = '当前加成:';
                    desc_2 = Math.round(100 * buffTotal) + '%';
                    break;
                case 'magic':
                    desc_1 = '当前魔法加成:';
                    desc_2 = Math.round(100 * buffTotal) + '%';
                    break;
                case 'melee':
                    desc_1 = '当前近战加成:';
                    desc_2 = Math.round(100 * buffTotal) + '%';
                    break;
                case 'shoot':
                    desc_1 = '当前远程加成:';
                    desc_2 = Math.round(100 * buffTotal) + '%';
                    break;
                case 'alco':
                    desc_1 = '当前酿酒加成:';
                    desc_2 = Math.round(100 * buffTotal) + '%';
                    break;
                case 'farm':
                    desc_1 = '当前种植收益加成:'
                    desc_2 = Math.round(100 * buffTotal) + '%';
                    break;
                case 'def':
                    var buffTotal = 100 - Math.round(100 * (Math.pow(SKILL_DATA[selectedSkill].buff, lv) * 0.95) + 0.05 * (10 / (10 + lv)));
                    desc_1 = '当前伤害减免:';
                    desc_2 = (buffTotal) + '%';
                    break;
                case 'agile':
                    desc_1 = '当前射程加成:';
                    desc_2 = buffTotal;
                    break;
            }
            return <p>{desc_1}<span style={{ color: COLOR.GREEN }}>{desc_2}</span></p>
        }
        return <div>
            <p>{SKILL_DATA[selectedSkill].desc}</p>
            {getAmount.bind(this)()}
        </div>
    },
    render: function () {
        return (
            <div className='skillMenu'>
                <div className='skill panel panel-primary'>
                    <div className='panel-heading'>所有技能</div>
                    <div className='panel-body'>
                        {this.getSkillList()}
                    </div>
                </div>
                <div className='skill panel panel-primary'>
                    <div className='panel-heading'>描述</div>
                    <div className='panel-body' style={{ padding: '5px' }}>
                        {this.getSkillDesc()}
                    </div>
                </div>
            </div>
        )
    }
});
