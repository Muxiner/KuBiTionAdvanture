/**
 * src/systems/events.js —— 事件/任务/交易 系统
 * 流浪汉、任务、给予、城镇/盗贼事件、转生、Boss、事件组件、交易与集市、消息框。
 */

var TrampComponent = React.createClass({
    maxFood: 50,
    contextTypes: {
        getValue: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        eventSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        playerStateChange: React.PropTypes.func.isRequired,
        setDueling: React.PropTypes.func.isRequired,
        setEventExperienced: React.PropTypes.func.isRequired,
    },
    getInitialState: function () {
        return {
            over: false
        }
    },
    componentWillMount: function () {
        this.context.setDueling(true);
    },
    componentWillUnmount: function () {
        this.context.setDueling(false);
    },
    checkFood: function () {
        var playerGive = this.context.boxSaveData.register.things;
        var value = 0;
        for (var attr in playerGive) {
            if (ITEM_DATA[attr].type != 'food' && ITEM_DATA[attr].type != 'cooked') continue;
            if (ITEM_DATA[attr].isDrink) {
                value += this.context.getValue(attr) * playerGive[attr] * 0.5;
            } else {
                value += this.context.getValue(attr) * playerGive[attr];
            }
        }
        return value;
    },
    giveFood: function () {
        var eventSaveData = this.context.eventSaveData;
        var value = this.checkFood();
        eventSaveData.tramp['foodGot'] += value;
        this.context.setStateFromChildren({ eventSaveData: eventSaveData });
        //帮助乞丐，获得精神上的慰藉
        this.context.playerStateChange({ san: value / 5 });
        this.setState({ over: true })
        if (eventSaveData.tramp['foodGot'] > this.maxFood) {
            this.context.setEventExperienced('tramp');
        }
    },
    render: function () {
        var playerGive = this.context.boxSaveData.register.things;
        var value = this.checkFood();
        var header = '-流浪汉-';
        var eventSaveData = this.context.eventSaveData;
        var foodGot = eventSaveData.tramp['foodGot'];
        if (!this.state.over) {
            return <div>
                <p>{header}</p>
                {value == 0 ? (getLength(playerGive) == 0 ? <p>求你了，能不能给我一点食物。。。</p> : <p>拜托..我要食物啊...</p>) : (foodGot + value > this.maxFood ? <p>太感谢了，上帝保佑你...</p> : <p>谢谢你...还有吗...</p>)}
                <RegisterComponent itemList={{}} canBack={false} onlyOne={true} canBeEmpty={true} canPick={false} />
                {value == 0 ? <BtnBack /> : <BtnComponent handleClick={this.giveFood} desc={'施舍'} />}
            </div>;
        } else {
            if (foodGot > this.maxFood) {
                return <div>
                    <p>{header}</p>
                    <p>我感觉好多了。</p>
                    <p>--------</p>
                    <p>流浪汉递给你一张<span style={{ color: COLOR.GREEN }}>[小镇]</span>的地图。</p>
                    <p>流浪汉扬长而去....</p>
                    <BtnBack />
                </div>;
            } else {
                var sanGet = Math.ceil(value / 5);
                return <div>
                    <p>{header}</p>
                    <p>上帝保佑你...</p>
                    <p>如果你有更多的食物，可以下次再带给我一点吗？</p>
                    {sanGet ? <p>--------</p> : null}
                    {sanGet ? <p>你获得了{<RequireComponent isGreen={true} requireList={{ san: Math.ceil(value / 5) }} />}</p> : null}
                    <BtnBack />
                </div>;
            }
        }
    }
});
var QuestComponent = React.createClass({
    contextTypes: {
        eventSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        changeItem: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            event: '',
            requireList: null,
            name: null,
            forever: false,//是否为永久任务
            callBack: null,
        }
    },
    getInitialState: function () {
        return {
            done: false,
        }
    },
    onDone: function () {
        this.setState({ done: true });
        if (this.props.forever) return;
        var eventSaveData = this.context.eventSaveData;
        eventSaveData[this.props.event].experienced = true;
        this.context.setStateFromChildren({ eventSaveData: eventSaveData });

        this.props.callBack && this.props.callBack();
    },
    onForeverDone: function () {
        var data = EVENT_DATA[this.props.event];
        var itemList = clone(data.get) || null;
        var chanceGet = data.chanceGet;
        if (chanceGet) {
            for (var attr in chanceGet) {
                if (Math.random() < chanceGet[attr]) {
                    itemList[attr] = 1;
                }
            }
        }
        this.context.changeItem(itemList, 'register');
    },
    render: function () {
        var data = EVENT_DATA[this.props.event];

        if (this.props.forever) {
            return (
                <div>
                    <p>-{this.props.name || data.name}-</p>
                    {this.props.children && this.props.children[0] || toParagraphs(data.d_1)}
                    <div>
                        <GiveComponent giveDesc={data.giveDesc || null} onDone={this.onForeverDone} itemList={this.props.requireList || EVENT_DATA[this.props.event].want} />
                    </div>
                    <RegisterComponent itemList={{}} />
                </div>
            )
        }
        if (this.state.done) {
            if (data.mst) {
                var callBack = function () {
                    this.context.callWindow(<BattleComponent mst={data.mst} />);
                }
            } else {
                var callBack = function () {
                }

            }
            var itemList = clone(data.get) || null;
            var chanceGet = data.chanceGet;
            if (chanceGet) {
                for (var attr in chanceGet) {
                    if (Math.random() < chanceGet[attr]) {
                        itemList[attr] = 1;
                    }
                }
            }
            var learn = (data.learn) || null;
            var place = (data.place) || null;
            return (
                <div>
                    {this.props.children && this.props.children[1] || data.d_2}
                    {itemList ? <RegisterComponent canBack={false} canBeEmpty={true} itemList={itemList} willUnmount={callBack.bind(this) || null} /> : null}
                    {learn ? <div><p>--------</p><p>你学会了[<span style={{ color: COLOR.YELLOW }}>{learn}</span>]的制作。</p></div> : null}
                    {place ? <div><p>--------</p><p>在地图上标出了[<span style={{ color: COLOR.YELLOW }}>{place}</span>]的位置。</p></div> : null}
                    <BtnBack callBack={callBack.bind(this) || null} />
                </div>
            )
        }
        return (
            <div>
                <p>-{this.props.name || data.name}-</p>
                {this.props.children && this.props.children[0] || toParagraphs(data.d_1)}
                <div>
                    <GiveComponent giveDesc={data.giveDesc || null} onDone={this.onDone} itemList={this.props.requireList || EVENT_DATA[this.props.event].want} />
                </div>
                <BtnBack />
            </div>
        )
    }
});
var GiveComponent = React.createClass({
    contextTypes: {
        boxSaveData: React.PropTypes.object.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
        useItem: React.PropTypes.func.isRequired,
    },
    getDefaultProps: function () {
        return {
            event: '',
            onDone: null,
            itemList: null,
            giveDesc: null,
        }
    },
    onDone: function () {
        this.context.useItem(this.props.itemList);
        this.props.onDone();
    },
    render: function () {
        var itemList = this.props.itemList;
        var boxSaveData = this.context.boxSaveData;
        var bag = boxSaveData.bag.things;
        var haveItem = (this.context.checkHaveResourceAll(itemList));
        return (
            <BtnComponent disabled={!haveItem} handleClick={this.onDone}>
                <span>{this.props.giveDesc || '给'}&nbsp;</span>
                <RequireComponent requireList={itemList} />
            </BtnComponent>
        )
    }
});
var TownEvent = React.createClass({
    contextTypes: {
        campSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        eventSaveData: React.PropTypes.object.isRequired,
        setEventExperienced: React.PropTypes.func.isRequired,
        skill: React.PropTypes.object.isRequired,
    },
    getInitialState: function () {
        return {
            givingEquip: false,
        }
    },
    getDefaultProps: function () {
        return {
            town: null,
        }
    },
    handleJoin: function () {
        var town = this.props.town;
        this.context.useTime(function () {
            var campSaveData = this.context.campSaveData;
            campSaveData.choice = this.props.town;
            this.context.setStateFromChildren({ campSaveData: campSaveData });

            //  敌人不可使用
            var oppo = (town == 'ice') ? 'fire' : 'ice';
            this.context.setEventExperienced(oppo + 'TownEvent');
            this.context.skill[town == 'ice' ? 'blood' : 'absorb'] = true;
            this.context.setStateFromChildren({ menuHint: 1 }, true);
        }.bind(this), 4);
    },
    handleBack: function () {
        this.context.callWindow(null);
    },
    handleOK: function () {
        this.setState({ givingEquip: true });
    },
    setPicked: function () {
        this.context.setEventExperienced('iceTownEvent');
        this.context.setEventExperienced('fireTownEvent');
    },
    render: function () {
        var campSaveData = this.context.campSaveData;
        var choice = campSaveData.choice;
        var town = this.props.town;
        var oppo = (town == 'ice') ? 'fire' : 'ice';
        var townDesc = PLACE_DATA[town].name;
        var oppoDesc = PLACE_DATA[oppo].name;

        if (this.state.givingEquip) {
            var itemList = {
                ice: {
                    healPotion: 4,
                    psPotion: 4,
                    iceBumb: 20,
                },
                fire: {
                    smallSanPotion: 4,
                    bighpPotion: 2,
                    fireBumb: 2,
                }
            }
            return (
                <div>
                    <p>你现在可以随时去挑战{oppoDesc}。</p>
                    <RegisterComponent canBack={false} canBeEmpty={true} itemList={itemList[town]} />
                    <BtnBack callBack={this.setPicked} />
                </div>
            )
        }

        if (!choice) {
            return (
                <div>
                    {
                        town == 'fire' ? (
                            <div>
                                <p>我们是由法师教徒组成的{townDesc}。</p>
                                <p>自从我们踏上这片土地，就一直在努力清理各种恐怖生物。</p>
                                <p>直到邪恶的{oppoDesc}进入我我们的视野。</p>
                                <p>他们的力量十分强大，但是蠢得就像一袋子锤子！</p>
                                <p>我们必须去消灭{oppoDesc}！我们不能让这些家伙的势力壮大起来。</p>
                                <p>我们即将展开一场大战，你要加入我们吗？</p>
                            </div>
                        ) : (
                            <div>
                                <p>我们是蛮力的{townDesc}。</p>
                                <p>最近一段时间，{oppoDesc}已经在南面占领了大片沙漠，并建立了一个营地。</p>
                                <p>我怀疑他们是不是在谋划什么你想象不到的可怕事情。</p>
                                <p>我们必须去消灭{oppoDesc}！我们不能让这些家伙的势力壮大起来。</p>
                                <p>我们即将展开一场大战，你要加入我们吗？</p>
                            </div>
                        )
                    }
                    <p style={{ color: '#C2C788' }}>{townDesc}{town == 'ice' ? <span>擅长格斗攻击，你能够习得‘嗜血’能力</span> : <span>擅长魔法攻击，你能够习得‘吸收’能力</span>}</p>
                    <BtnComponent handleClick={this.handleJoin}>加入<span style={{ color: COLOR.BLUE }}>{townDesc}</span></BtnComponent>
                    <BtnBack />
                </div>
            )
        } else {
            return (
                <div>
                    <p>你获得了技能<span style={{ color: COLOR.BLUE }}>[{town == 'ice' ? '嗜血' : '吸收'}]</span>。</p>
                    <p>现在我将授予你战争的给养。</p>
                    <div><BtnComponent handleClick={this.handleOK}>我准备好了</BtnComponent></div>
                    <div><BtnComponent handleClick={this.handleBack}>容我休整下</BtnComponent></div>
                </div>
            )
        }
    }
});
var ThiefEvent = React.createClass({
    contextTypes: {
        campSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        eventSaveData: React.PropTypes.object.isRequired,
        setEventExperienced: React.PropTypes.func.isRequired,
        skill: React.PropTypes.object.isRequired,
    },
    getInitialState: function () {
        return {
            give: false,
            battle: false,
            killingRobber: false,
        }
    },
    handleGive: function () {
        this.context.setEventExperienced('thief_2');
        var wind = <div>
            <p>--覆面忍者--</p>
            <p>感激不尽，兄弟！我给你一个我的最得意的装备作为谢礼..</p>
            <RegisterComponent itemList={{ ninjaJacket: 1 }} canBack={false} canBeEmpty={true} />
            <BtnBack />
        </div>
        this.context.callWindow(wind);
    },
    handleKill: function () {
        this.context.setEventExperienced('thief_2');
        var wind = <div>
            <p>--覆面忍者--</p>
            <p>这是你自找的...</p>
            <BtnComponent handleClick={this.handleBattle}>决斗！</BtnComponent>
        </div>
        this.context.callWindow(wind);
    },
    handleKillRobber: function () {
        this.setState({ killingRobber: true });
    },
    handleBattle: function () {
        var wind = <div>
            <BattleComponent mst='thief' />
        </div>
        this.context.callWindow(wind);
    },
    render: function () {
        var self = this;
        if (this.state.killingRobber) {
            return <div>
                <BattleComponent winScene={(
                    <div>
                        <p>--覆面忍者--</p>
                        <p>嗨，多亏你的帮助，我拿到了这个宝物。</p>
                        <p>它散发着金色的光辉，肯定是古董错不了！</p>
                        <BtnComponent handleClick={self.handleGive}>把财宝分给穷人吧....</BtnComponent>
                        <BtnComponent handleClick={self.handleKill}>这是我的！休想离开！</BtnComponent>
                    </div>
                )} mst='robberHead' />
            </div>
        }
        return <div>
            <p>--覆面忍者--</p>
            <p>他也发现了我们！</p>
            <BtnComponent handleClick={this.handleKillRobber} >战斗！</BtnComponent>
            <BtnBack />
        </div>
    }
});
var Reincarnation = React.createClass({
    contextTypes: {
        skill: React.PropTypes.object.isRequired,
        reBorn: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        checkHaveResourceAll: React.PropTypes.func.isRequired,
    },
    getInitialState: function () {
        return {
        }
    },
    getCost: function (attr, tmp) {
        //传入技能名以及技能对象计算升级所需的消耗
        var amount = this.context.skill[attr] || 0;
        return tmp.cost + tmp.costInc * amount;
    },
    handleDone: function (attr) {
        this.context.reBorn(attr);
    },
    getChoiceDisplay: function () {
        var result = [];
        for (var attr in SKILL_DATA) {
            var tmp = SKILL_DATA[attr];
            if (!tmp.isTalent) continue;
            var requireList = o('blood', this.getCost(attr, tmp));
            result.push(
                <tr key={attr}>
                    <td>{tmp.name}</td>
                    <td>{tmp.desc}</td>
                    <td><RequireComponent requireList={requireList} /></td>
                    <td><BtnComponent desc='转生' disabled={!this.context.checkHaveResourceAll(requireList, 'bag')} handleClick={this.handleDone.bind(null, attr)} /></td>
                </tr>
            )
        }
        return result;
    },
    render: function () {
        return <div>
            <p>--转生--</p>
            <p>选择转生，你将失去当前(90%)的(非天赋)技能以及物品。</p>
            <p>从以下天赋中选择一项进行转生。</p>
            <div style={{ margin: 'auto', fontSize: 10, maxHeight: 300, width: '80%', overflow: 'auto' }}>
                <table className="table table-condensed table-hover table-striped table-bordered">
                    <tbody>
                        {this.getChoiceDisplay()}
                    </tbody>
                </table>
            </div>
            <BtnBack />
        </div>
    }
});
var BossComponent = React.createClass({
    contextTypes: {
        eventSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        maouLevel: React.PropTypes.number.isRequired,
    },
    getInitialState: function () {
        return {
            giving: false,
            battling: false,
        }
    },
    onGive: function () {
        this.setState({ giving: true });
    },
    onBattle: function () {
        this.setState({ battling: true });
    },
    onWin: function () {
        this.context.setStateFromChildren({ maouLevel: this.context.maouLevel + 1 });
    },
    render: function () {
        var maouLevel = this.context.maouLevel;
        if (this.state.battling) {
            var mstState = {
                maxHp: 10000,
                hpMul: 500 * (0.2 * maouLevel + 1) * maouLevel,
                dmg: 5000 * (0.2 * maouLevel + 1) * maouLevel + 10000,
            }
            return <BattleComponent mstState={mstState} mst='maou' onWin={this.setDone} winScene={(
                <div>
                    <p>--邪恶大魔王--</p>
                    <p>我会回来哒！！！</p>
                    <RegisterComponent itemList={{ blood: 1 }} canBeEmpty={true} canBack={false} />
                    <BtnBack callBack={this.onWin} />
                </div>
            )} />;
        } else {
            var showLevel = maouLevel > 0 ? (<span style={{ color: COLOR.BLUE }}>[轮回:{maouLevel}]</span>) : null;
            if (this.state.giving) {
                return (
                    <div>
                        <p>邪恶大魔王{showLevel}出现了！</p>
                        <BtnComponent desc='战斗！' handleClick={this.onBattle} />
                    </div>
                )
            } else {
                return <div>
                    <p>--邪恶的封印阵{showLevel}--</p>
                    <p>你需要一些魂晶石才能打破魔王的封印。。。</p>
                    <GiveComponent itemList={{ reiPart: 10 + 2 * maouLevel }} onDone={this.onGive} />
                    <BtnBack />
                </div>
            }
        }
    }
});
// 事件：根据 EVENT_DATA 呈现剧情，处理需求提交、奖励、解锁地点与制作
var EventComponent = React.createClass({
    contextTypes: {
        eventSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
    },
    childContextTypes: {
        setEventExperienced: React.PropTypes.func.isRequired,
    },
    getChildContext: function () {
        return {
            setEventExperienced: this.setEventExperienced
        }
    },
    getDefaultProps: function () {
        return {
            type: null
        }
    },
    setEventExperienced: function (eventName) {
        var eventSaveData = this.context.eventSaveData;
        if (eventSaveData[eventName] == undefined) {
            eventSaveData[eventName] = {};
        }
        eventSaveData[eventName].experienced = true;
        this.context.setStateFromChildren({ eventSaveData: eventSaveData });
    },
    componentWillMount: function () {
        this.eventMap = {
            tramp: <TrampComponent />,
        }
        this.eventMap.boss = <BossComponent />;
        this.eventMap.reincarnation = <Reincarnation />;
        this.eventMap.miner = (
            <div>
                <p>-采矿小分队-</p>
                <p>我们的矿洞有大量的矿石资源。</p>
                <p>你也要加入我们吗？</p>
                <p>--------</p>
                <p>采矿小分队标出了<span style={{ color: COLOR.GREEN }}>[矿洞]</span>的位置。</p>
                <RegisterComponent canBeEmpty={true} itemList={{ pickaxe: 1 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'miner')} />
            </div>
        );
        this.eventMap.trade = (
            <div>
                <p>-商队-</p>
                <p>你好，我们正准备在这个偏僻的小镇设置集市。</p>
                <p>希望能方便大家交换物品。</p>
                <p>商队标出了<span style={{ color: COLOR.RED }}>[集市]</span>的位置。</p>
                <RegisterComponent canBeEmpty={true} itemList={{ security: 2 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'trade')} />
            </div>
        );
        this.eventMap.giveScroll = (
            <div>
                <p>-神秘旅者-</p>
                <p>你好勇士，前方就是地牢了。</p>
                <p>地牢坑爹的设定是,你不能随时回去。</p>
                <p>别担心，我送你一个回城卷轴，祝你玩的愉快...</p>
                <RegisterComponent canBeEmpty={true} itemList={{ scroll: 1 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'giveScroll')} />
            </div>
        );
        this.eventMap.santa = (
            <div>
                <p>-麋鹿-</p>
                <p>嗨，圣诞快乐！</p>
                <p>拿好你的礼物不要掉了！</p>
                <RegisterComponent canBeEmpty={true} itemList={SANTA_GIFT} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'santa')} />
            </div>
        );

        this.eventMap.huntIntro = (
            <div>
                <p>-年迈的猎人-</p>
                <p>这里一很多小兔子，但要小心那些老鹰。</p>
                <p>对付它们最好带上一把猎枪。</p>
                <p>这些是我今天的猎物，很乐意与你分享：</p>
                <RegisterComponent canBeEmpty={true} itemList={{ meat: 1 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'huntIntro')} />
            </div>
        );
        this.eventMap.robberQuestGet = (
            <div>
                <p>-村长-</p>
                <p>几个星期前，一个离开家去远处采草药，被盗贼袭击了</p>
                <p>小镇因此被整得人心惶惶。</p>
                <p>你能帮我去贼窝解决掉一些贼吗？</p>
                <p>贼窝有很多赃物，如果你能整治盗贼，那些当然都归你了。</p>
                <p>--------</p>
                <p>村长标记出<span style={{ color: COLOR.GREEN }}>[贼窝]</span>的位置。</p>
                <BtnBack callBack={this.setEventExperienced.bind(this, 'robberQuestGet')} />
            </div>
        );
        this.eventMap.robberQuest = <QuestComponent event='robberQuest' />;
        this.eventMap.spiderQuestGet = (
            <div>
                <p>-村长-</p>
                <p>村子的侦察兵报告说周边地区充斥着可怕的蜘蛛，并且已经建立了自己的巢穴。</p>
                <p>你能帮我去蜘蛛巢穴解决掉蛛魔的首领吗？</p>
                <p>--------</p>
                <p>村长标记出<span style={{ color: COLOR.GREEN }}>[蜘蛛巢穴]</span>的位置。</p>
                <BtnBack callBack={this.setEventExperienced.bind(this, 'spiderQuestGet')} />
            </div>
        );
        this.eventMap.spiderQuest = <QuestComponent event='spiderQuest' />;
        this.eventMap.dragonQuestGet = (
            <div>
                <p>-村长-</p>
                <p>我们接到越来越多的报告，邪恶的龙群正在滋扰附近的地区。</p>
                <p>我给那些畜牲挂了悬赏。但我相信，只有你能阻止它们。</p>
                <p>--------</p>
                <p>村长标记出<span style={{ color: COLOR.GREEN }}>[龙之峡谷]</span>的位置。</p>
                <BtnBack callBack={this.setEventExperienced.bind(this, 'dragonQuestGet')} />
            </div>
        );
        this.eventMap.dragonQuest = <QuestComponent event='dragonQuest' />;

        this.eventMap.graveEvent = <QuestComponent event='graveEvent' />;



        this.eventMap.misteryQuest_1 = <QuestComponent event='misteryQuest_1' />;
        this.eventMap.misteryQuest_2 = <QuestComponent event='misteryQuest_2' />;
        this.eventMap.misteryQuest_3 = <QuestComponent event='misteryQuest_3' />;

        this.eventMap.drinker_1 = <QuestComponent event='drinker_1' />;
        this.eventMap.drinker_2 = <QuestComponent event='drinker_2' />;
        this.eventMap.drinker_3 = <QuestComponent event='drinker_3' />;
        this.eventMap.drinker_4 = <QuestComponent event='drinker_4' />;
        this.eventMap.drinker_end = <QuestComponent event='drinker_end' forever='true' />;

        this.eventMap.farmer_1 = <QuestComponent event='farmer_1' />;
        this.eventMap.farmer_2 = <QuestComponent event='farmer_2' />;
        this.eventMap.farmer_3 = <QuestComponent event='farmer_3' />;
        this.eventMap.farmer_end = <QuestComponent event='farmer_end' forever='true' />;

        this.eventMap.minerFood = <QuestComponent event='minerFood' forever='true' />;

        this.eventMap.goblin = <QuestComponent event='goblin' />;
        this.eventMap.goblin_1 = <QuestComponent event='goblin_1' />;
        this.eventMap.goblin_2 = <QuestComponent event='goblin_2' />;
        this.eventMap.goblin_3 = <QuestComponent event='goblin_3' />;
        this.eventMap.goblin_4 = <QuestComponent event='goblin_4' />;
        this.eventMap.goblin_5 = <QuestComponent event='goblin_5' />;
        this.eventMap.goblin_end = <QuestComponent event='goblin_end' forever='true' />;

        this.eventMap.iceTownEvent = <TownEvent town='ice' />
        this.eventMap.fireTownEvent = <TownEvent town='fire' />

        this.eventMap.thief = <QuestComponent event='thief' />;
        this.eventMap.thief_1 = <QuestComponent event='thief_1' />;
        this.eventMap.thief_2 = <ThiefEvent />;

        this.eventMap.map_1 = <QuestComponent event='map_1' />;
        this.eventMap.map_2 = <QuestComponent event='map_2' />;
        this.eventMap.map_3 = <QuestComponent event='map_3' />;
        this.eventMap.map_4 = <QuestComponent event='map_4' />;

        this.eventMap.iceTownEvent_1 = <QuestComponent event='iceTownEvent_1' />;
        this.eventMap.iceTownEvent_2 = <QuestComponent event='iceTownEvent_2' />;
        this.eventMap.iceTownEvent_3 = <QuestComponent event='iceTownEvent_3' />;
        this.eventMap.iceTownEvent_end = <QuestComponent event='iceTownEvent_end' forever='true' />;

        this.eventMap.fireTownEvent_1 = <QuestComponent event='fireTownEvent_1' />;
        this.eventMap.fireTownEvent_2 = <QuestComponent event='fireTownEvent_2' />;
        this.eventMap.fireTownEvent_3 = <QuestComponent event='fireTownEvent_3' />;
        this.eventMap.fireTownEvent_end = <QuestComponent event='fireTownEvent_end' forever='true' />;

        this.eventMap.police_1 = <QuestComponent event='police_1' />;
        this.eventMap.traces_1 = <QuestComponent event='traces_1' />;
        this.eventMap.traces_2 = <QuestComponent event='traces_2' />;
        this.eventMap.traces_3 = <QuestComponent event='traces_3' />;
        this.eventMap.part_1 = <QuestComponent event='part_1' />;
        this.eventMap.part_2 = <QuestComponent event='part_2' />;
        this.eventMap.denBox = <QuestComponent event='denBox' />;

        this.eventMap.gulf = <QuestComponent event='gulf' />;
    },
    render: function () {
        var type = this.props.type;
        var data = EVENT_DATA[type];
        return <div>{this.eventMap[type]}</div>;
    }
});
// 交易：与商队/集市买卖物品，处理换取、成交与撤回
var TradeComponent = React.createClass({
    preBagThings: null,
    contextTypes: {
        getScienceLevel: React.PropTypes.func.isRequired,
        tradeSaveData: React.PropTypes.array.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        callWindow: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        setDueling: React.PropTypes.func.isRequired,
        getValue: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        skill: React.PropTypes.object.isRequired,
    },
    getDefaultProps: function () {
        return {
            trade: null,
            tradeData: null,
            index: null,
            canBack: true,
        }
    },
    getInitialState: function () {
        return {
            isOver: false,
        }
    },
    getTradingState: function () {
        var skill = this.context.skill;
        var sellerLevel = (skill.seller || 0) * SKILL_DATA.seller.buff;

        var beaconMax = this.context.getScienceLevel('通勤性能');

        var trade = this.props.trade;
        var detail = TRADE_DATA[trade];
        var max = Math.round((detail.max || 100) * (0.5 * beaconMax + 1) * (1 + sellerLevel));
        var give = detail.give;
        var value = this.context.getValue(give);
        var playerGive = this.context.boxSaveData.register.things;
        var playerValue = 0;
        for (var attr in playerGive) {
            playerValue += this.context.getValue(attr) * playerGive[attr];
        }
        playerValue *= TRADE_MUL;
        var amount = Math.floor(playerValue / value);
        var overFlow = false;
        if (amount > max) {
            overFlow = true;
            amount = max;
        }
        var isNothing = false;
        if (getLength(playerGive) == 0) isNothing = true;
        return {
            give: give,
            max: max,
            isNothing: isNothing,
            amount: amount,
            overFlow: overFlow,
            traderName: detail.name,
            giveName: ITEM_DATA[give].name
        };
    },
    getDialog: function () {
        var result = [];
        var state = this.getTradingState();
        function wrap(input) {
            return <span style={{ color: COLOR.BLUE }}>[{input}]</span>
        }
        result.push(<p key='header'>-{state.traderName}-</p>);
        if (!state.isNothing) {
            if (state.amount == 0) {
                result.push(state.max == 1 ? (
                    <p key='1'>这不够，再多给点。</p>) : (
                    <p key='1'>拜托...再多给一点...</p>)
                );
            } else {
                result.push(state.max == 1 ? (
                    <p key='1'>好吧，那么。。成交？</p>) : (
                    <p key='1'>我可以给你({(state.amount)})个{wrap(state.giveName)}...</p>)
                );
            }
        } else {
            result.push(state.max == 1 ? (
                <p key='0'>这本{wrap(state.giveName)}凝聚了我的真传，你得给我很多东西来换它。</p>) : (
                <p key='0'>我给你带来了一些{wrap(state.giveName)}，感兴趣吗？</p>)
            );
            result.push(<p key='hint' style={{ 'color': '#ccc' }}>/按住ctrl(10倍) shift(100倍)进行批量交易/</p>)
        }
        if (state.overFlow) {
            result.push(<p key='2'>我没有更多的{wrap(state.giveName)}了，伙计。</p>);
        }
        return result;
    },
    componentWillMount: function () {
        var boxSaveData = this.context.boxSaveData;
        this.preBagThings = clone(boxSaveData.bag.things);
        boxSaveData.register.things = {};
        this.context.setStateFromChildren({ boxSaveData: boxSaveData });
        this.context.setDueling(true);
        this.context.AudioEngine.playEffect('bell');
    },
    componentWillUnmount: function () {
        this.context.setDueling(false);
    },
    duel: function () {
        this.context.setDueling(false);
        //成交
        var state = this.getTradingState();
        var give = state.give;
        var amount = state.amount;
        var o = {};
        if (amount > 0) o[give] = amount;
        var boxSaveData = this.context.boxSaveData;
        boxSaveData.register.things = o;
        this.context.setStateFromChildren({ boxSaveData: boxSaveData });
        if (TRADE_DATA[this.props.trade].type != 'dungeon') {
            this.context.tradeSaveData.splice(this.props.index, 1);
        }
        this.setState({ isOver: true });
    },
    refuse: function () {
        var boxSaveData = this.context.boxSaveData;
        // boxSaveData.bag.things = clone(this.preBagThings);
        // boxSaveData.register.things = {};

        for (var attr in boxSaveData.register.things) {
            boxSaveData.bag.things[attr] = (boxSaveData.bag.things[attr] || 0) + boxSaveData.register.things[attr];
            delete boxSaveData.register.things[attr];
        }
        this.context.setStateFromChildren({ boxSaveData: boxSaveData });

    },
    render: function () {
        var currenState = this.getTradingState();
        if (this.state.robbing) {
            return (
                <BattleComponent mst={this.props.trade} />
            );
        }

        if (this.state.isOver) {
            return (
                <div>
                    <p>{TRADE_DATA[this.props.trade].name}扬长而去...</p>
                    <RegisterComponent canBack={this.props.canBack} itemList={o} />
                </div>
            );
        }
        return <div>
            {this.getDialog()}
            <RegisterComponent canBeEmpty={true} canPick={false} canBack={false} />
            {this.props.canBack ? <BtnBack disabled={getLength(this.context.boxSaveData.register.things) != 0} /> : null}
            <BtnComponent disabled={getLength(this.context.boxSaveData.register.things) == 0} desc='撤回' handleClick={this.refuse} />
            <BtnComponent disabled={!this.getTradingState().amount > 0} desc='成交' handleClick={this.duel} />
        </div>
    }
});
var TradeListComponent = React.createClass({
    contextTypes: {
        tradeSaveData: React.PropTypes.array.isRequired,
        callWindow: React.PropTypes.func.isRequired,
    },
    handleClick: function (index) {
        var tradeName = this.context.tradeSaveData[index].trade;
        this.context.callWindow(<TradeComponent index={index} trade={tradeName} />);
    },
    getTradeList: function () {
        var tradeSaveData = this.context.tradeSaveData;
        var result = [];
        for (var i = tradeSaveData.length - 1; i >= 0; i--) {
            var tmp = tradeSaveData[i];
            var data = TRADE_DATA[tmp.trade];
            if (!data) continue;
            var giveName = ITEM_DATA[data.give] ? ITEM_DATA[data.give].name : data.give;
            result.push(<div className='tradeCard' key={'trade_' + i}>
                <div className='tradeName'>{data.name}</div>
                <div className='tradeGoods'>贩卖：<span style={{ color: COLOR.BLUE }}>{giveName}</span> × {data.max}</div>
                <BtnComponent handleClick={this.handleClick.bind(this, i)} desc='交易' />
            </div>)
        };
        if (result.length == 0) {
            result.push(<div className='tradeEmpty' key='empty'>一个人也没有...</div>);
        }
        return result;
    },
    render: function () {
        return <div className="oppo">
            <div className='tradeTitle'>集市</div>
            <div className='tradeGrid'>
                {this.getTradeList()}
            </div>
        </div>
    }
})
var MsgBox = React.createClass({
    contextTypes: {
        msgList: React.PropTypes.array.isRequired,
        showMsg: React.PropTypes.func.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
    },
    componentWillMount: function () {
    },
    componentWillUnmount: function () {
        this.context.setStateFromChildren({ msgList: [] });
    },
    render: function () {
        var msgList = this.context.msgList;
        var list = [];
        for (var i = msgList.length - 1; i >= 0; i--) {
            list[msgList.length - i] = msgList[i];
        };
        return (
            <div className='msgShow'>
                <ReactCSSTransitionGroup transitionEnterTimeout={200} transitionLeaveTimeout={1000} transitionName="msg" className="msg">
                    {list}
                </ReactCSSTransitionGroup>
            </div>
        );
    }
});
