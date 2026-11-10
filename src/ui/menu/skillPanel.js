/**
 * src/ui/menu/skillPanel.js —— 技能面板
 * 左侧技能列表（等级/上限），右侧展示说明、当前效果、下一级效果与学费。
 * 空状态给出下一步：技能书来源（集市/地牢/事件）与「学院」。
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
    // 键盘 Enter/Space 也可选择技能
    handleSkillKey: function (skill, event) {
        if (event.keyCode === 13 || event.keyCode === 32) {
            event.preventDefault();
            this.handleSkillTab(skill);
        }
    },
    // 训练师可提升的技能 → 对应 EVENT_DATA（学费与等级上限来源）
    getTrainerEvent: function (skillKey) {
        for (var ev in EVENT_DATA) {
            if (EVENT_DATA[ev] && EVENT_DATA[ev].skill === skillKey) return EVENT_DATA[ev];
        }
        return null;
    },
    // 等级上限：一次性技能为 1；训练师技能为 TRAINER_MAX_LEVEL；天赋技能无学院上限
    getSkillMax: function (skillKey) {
        if (SKILL_DATA[skillKey].one) return 1;
        if (this.getTrainerEvent(skillKey)) return TRAINER_MAX_LEVEL;
        return null;
    },
    // 某等级的技能效果文本（数值从 SKILL_DATA.buff 派生，单位清晰、带 + / -）
    getSkillEffect: function (skillKey, lv) {
        var data = SKILL_DATA[skillKey];
        var effectLabels = {
            greedy: '拾荒/采集收益', lucky: '敌人材料掉落', durable: '体力/精神上限',
            physique: '生命/水分/满腹上限', seller: '商人交易量', manage: '建筑产出速度',
            fighter: '伤害', melee: '近战伤害', shoot: '远程伤害', magic: '魔法伤害',
            farm: '种植收益', alco: '酿酒收益'
        };
        if (skillKey === 'blood') return '胜利后恢复 20% 生命';
        if (skillKey === 'absorb') return '胜利后恢复 20% 精神';
        if (skillKey === 'agile') return '射程 +' + fmtNum(lv * data.buff);
        if (skillKey === 'def') {
            var reduce = Math.round(100 * (1 - (Math.pow(data.buff, lv) * 0.95 + 0.05 * (10 / (10 + lv)))));
            reduce = Math.min(reduce, Math.round(DAMAGE_REDUCTION_CAP * 100));
            return '受到伤害 -' + reduce + '%（乘算递减，上限 85%）';
        }
        var label = effectLabels[skillKey] || '效果';
        var pct = Math.round(lv * data.buff * 100);
        return label + ' +' + pct + '%';
    },
    // 学费文本：训练师技能按金币；其它技能提示来源
    getSkillTuition: function (skillKey, lv, max) {
        if (max != null && lv >= max) return '已满级（' + fmtNum(max) + ' 级）';
        var ev = this.getTrainerEvent(skillKey);
        if (!ev) return '使用技能书或对应道具提升（可在集市、地牢、事件中获得）';
        var base = ev.want || { gold: 10 };
        var scaled = {};
        var keys = [];
        for (var attr in base) {
            scaled[attr] = Math.round(base[attr] * (1 + TRAINER_COST_GROWTH * lv));
            keys.push(attr);
        }
        if (keys.length === 1 && keys[0] === 'gold') return fmtMoney(scaled.gold);
        return fmtReqText(scaled);
    },
    // 技能列表（名称 + 等级/上限，单击选中）
    getSkillList: function () {
        var skill = this.context.skill;
        if (getLength(skill) == 0) {
            return <div className="skillEmpty">
                <p className="skillEmptyTitle">还没有习得任何技能</p>
                <p>使用技能书（集市、地牢、事件中获得）可以习得技能。</p>
                <p>也可以去「学院」向导师交学费学习：菜单 → 技能页查看当前与下一级效果。</p>
            </div>;
        }
        var result = [];
        for (var attr in skill) {
            if (!SKILL_DATA[attr].name) continue;
            var lv = skill[attr] || 0;
            var max = this.getSkillMax(attr);
            var lvText = max != null ? ('Lv.' + fmtNum(lv) + ' / ' + fmtNum(max)) : (SKILL_DATA[attr].one ? '已习得' : ('Lv.' + fmtNum(lv)));
            var titleText = SKILL_DATA[attr].name + ' ' + lvText + '\n当前：' + this.getSkillEffect(attr, lv) + '\n下一级：' + (max != null && lv >= max ? '已满级' : this.getSkillEffect(attr, lv + 1)) + '\n学费：' + this.getSkillTuition(attr, lv, max);
            result.push(<div className={'btn skillItem' + (this.state.selectedSkill == attr ? ' is-active' : '')}
                tabIndex="0" role="button" title={titleText}
                onClick={this.handleSkillTab.bind(this, attr)} onKeyDown={this.handleSkillKey.bind(this, attr)}
                key={SKILL_DATA[attr].name}>
                <span className='skillItemName'>{SKILL_DATA[attr].name}</span>
                <span className='skillItemLv'>{lvText}</span>
            </div>)
        }
        return result;
    },
    // 选中技能的说明、当前/下一级效果与学费
    getSkillDesc: function () {
        var skill = this.context.skill;
        var selectedSkill = this.state.selectedSkill;
        if (!selectedSkill) {
            for (var first in skill) {
                if (SKILL_DATA[first] && SKILL_DATA[first].name) { selectedSkill = first; break; }
            }
        }
        if (!selectedSkill) return null;
        var data = SKILL_DATA[selectedSkill];
        var lv = skill[selectedSkill] || 0;
        var max = this.getSkillMax(selectedSkill);
        var lvText = max != null ? ('Lv.' + fmtNum(lv) + ' / ' + fmtNum(max)) : ('Lv.' + fmtNum(lv));
        var maxed = max != null && lv >= max;
        var nextText = maxed ? '已满级' : this.getSkillEffect(selectedSkill, lv + 1);
        return <div className='ux-skillDesc'>
            <p className='ux-skillTitle'>{data.name}<span className='ux-skillLevel'>{lvText}</span></p>
            <p className='ux-skillLine'><span className='ux-skillLabel'>说明</span>{data.desc}</p>
            <p className='ux-skillLine'><span className='ux-skillLabel'>当前效果</span><span className='ux-good'>{this.getSkillEffect(selectedSkill, lv)}</span></p>
            <p className='ux-skillLine'><span className='ux-skillLabel'>下一级</span><span className={maxed ? 'ux-muted' : 'ux-good'}>{nextText}</span></p>
            <p className='ux-skillLine'><span className='ux-skillLabel'>学费</span>{this.getSkillTuition(selectedSkill, lv, max)}</p>
            <p className='ux-skillHint'>在「学院」找导师交学费可提升训练师技能；技能书可在集市、地牢、事件中获得。</p>
        </div>;
    },
    render: function () {
        return (
            <div className='skillMenu'>
                <div className='skill panel panel-primary ux-skillPanel'>
                    <div className='panel-heading'>所有技能</div>
                    <div className='panel-body'>
                        {this.getSkillList()}
                    </div>
                </div>
                <div className='skill panel panel-primary ux-skillPanel'>
                    <div className='panel-heading'>描述与效果</div>
                    <div className='panel-body' style={{ padding: '5px' }}>
                        {this.getSkillDesc()}
                    </div>
                </div>
            </div>
        )
    }
});
