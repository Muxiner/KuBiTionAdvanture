/**
 * src/ui/menu/upgradePlace.js —— 学院/导师（升级地点）
 * 展示各技能导师，交学费（GiveComponent）后提升对应技能等级。
 */
//outer components
//中组件
var UpgradePlaceComponent = React.createClass({
    contextTypes: {
        skill: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        showMsg: React.PropTypes.func.isRequired,
    },
    getInitialState: function () {
        return {
        }
    },
    // 学费：随当前等级线性增长（常量见 data.js 的 TRAINER_COST_GROWTH/TRAINER_MAX_LEVEL）
    getNextCost: function (type) {
        var skillType = EVENT_DATA[type].skill;
        var level = this.context.skill[skillType] || 0;
        var base = EVENT_DATA[type].want || { gold: 10 };
        return cloneMul(base, 1 + TRAINER_COST_GROWTH * level, true);
    },
    // 拜师成功：对应技能等级 +1（有等级上限）
    handleDone: function (type) {
        var skillType = EVENT_DATA[type].skill;
        var skill = this.context.skill;
        var level = skill[skillType] || 0;
        if (level >= TRAINER_MAX_LEVEL) {
            this.context.showMsg(<p key={Math.random()}>该技能已达等级上限（{TRAINER_MAX_LEVEL} 级）。</p>);
            return;
        }
        skill[skillType] = level + 1;
        this.context.useTime(function () {
            this.context.setStateFromChildren({ skill: skill });
            this.context.setStateFromChildren({ menuHint: 1 }, true);
        }.bind(this), 0.1);
    },
    // 导师列表：显示当前等级、上限与下一级学费
    getTeathers: function () {
        var list = {
            meleeUpgrade: true,
            shootUpgrade: true,
            magicUpgrade: true,
            agileUpgrade: true,
            defUpgrade: true,
            farmUpgrade: true,
            alcoUpgrade: true,
        }
        var skill = this.context.skill;
        var result = [];
        for (var attr in list) {
            var skillType = EVENT_DATA[attr].skill;
            var level = skill[skillType] || 0;
            var maxed = level >= TRAINER_MAX_LEVEL;
            var itemList = this.getNextCost(attr);
            result.push(<tr key={attr}>
                <td>{EVENT_DATA[attr].name}</td>
                <td>{SKILL_DATA[skillType].name}</td>
                <td>{level} / {TRAINER_MAX_LEVEL}</td>
                <td>{maxed ? '-' : <RequireComponent requireList={itemList} />}</td>
                <td>{maxed ? <BtnComponent disabled={true} disabledReason={'已达等级上限(' + TRAINER_MAX_LEVEL + ')'} desc='已满级' /> : <GiveComponent itemList={itemList} onDone={this.handleDone.bind(null, attr)} />}</td>
            </tr>)
        }
        return result;
    },
    render: function () {
        return <div>
            <p style={{ color: '#ccc' }}>每次学习消耗金币，费用随技能等级上升；每项技能上限 {TRAINER_MAX_LEVEL} 级。</p>
            <div className="tableOuter">
                <table className="table table-condensed table-hover">
                    <thead>
                        <tr><td>教师</td><td>内容</td><td>等级</td><td>学费</td><td></td></tr>
                    </thead>
                    <tbody>
                        {this.getTeathers()}
                    </tbody>
                </table>
            </div>
        </div>
    }
})
