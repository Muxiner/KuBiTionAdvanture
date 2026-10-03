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
    },
    getInitialState: function () {
        return {
            teacher: false,
        }
    },
    // 拜师成功：对应技能等级 +1
    handleDone: function (type) {
        var skillType = EVENT_DATA[type].skill;
        var skill = this.context.skill;
        skill[skillType] = (skill[skillType] || 0) + 1;
        this.context.useTime(function () {
            this.context.setStateFromChildren({ skill: skill });
            this.context.setStateFromChildren({ menuHint: 1 }, true);
            this.setState({ rewarding: true });
        }.bind(this), 0.1);
    },
    // 导师列表：学费随技能等级递增
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
            var itemList = EVENT_DATA[attr].want || { gold: 10 };
            var skillType = EVENT_DATA[attr].skill;
            var level = skill[skillType];
            itemList = cloneMul(itemList, ((1 + 1 * level) * (1 + 0.001 * level)), true);
            if (EVENT_DATA[attr]) {
                result.push(<tr key={attr}>
                    <td>{EVENT_DATA[attr].name}</td>
                    <td>{SKILL_DATA[skillType].name}</td>
                    <td><GiveComponent itemList={itemList} onDone={this.handleDone.bind(null, attr)} /></td>
                </tr>)
            }
        }
        return result;
    },
    handleTeacherWindow: function (teacher) {
        this.setState({ teacher: teacher })
    },
    render: function () {
        if (this.state.teacher) {
            return <div>
                <TeacherComponent type={this.state.teacher} />
                <BtnComponent desc='返回' handleClick={this.handleTeacherWindow.bind(null, null)} />
            </div>
        }
        return <div>
            <div className="tableOuter">
                <table className="table table-condensed table-hover">
                    <thead>
                        <tr><td>教师</td><td>内容</td><td>学费</td></tr>
                    </thead>
                    <tbody>
                        {this.getTeathers()}
                    </tbody>
                </table>
            </div>
        </div>

    }
})
