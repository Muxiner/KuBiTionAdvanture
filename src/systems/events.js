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
                {value == 0 ? (getLength(playerGive) == 0 ? <p>{EVENT_TEXT.tramp.askEmpty}</p> : <p>{EVENT_TEXT.tramp.askHaveFood}</p>) : (foodGot + value > this.maxFood ? <p>{EVENT_TEXT.tramp.thanksFull}</p> : <p>{EVENT_TEXT.tramp.thanksMore}</p>)}
                <RegisterComponent itemList={{}} canBack={false} onlyOne={true} canBeEmpty={true} canPick={false} />
                {value == 0 ? <BtnBack /> : <BtnComponent handleClick={this.giveFood} desc={'施舍'} />}
            </div>;
        } else {
            if (foodGot > this.maxFood) {
                return <div>
                    <p>{header}</p>
                    <p>{EVENT_TEXT.tramp.feelBetter}</p>
                    <p>--------</p>
                    <p>{EVENT_TEXT.tramp.mapGivePre}<span style={{ color: COLOR.GREEN }}>[{EVENT_TEXT.tramp.mapGivePlace}]</span>{EVENT_TEXT.tramp.mapGivePost}</p>
                    <p>{EVENT_TEXT.tramp.leave}</p>
                    <BtnBack />
                </div>;
            } else {
                var sanGet = Math.ceil(value / 5);
                return <div>
                    <p>{header}</p>
                    <p>{EVENT_TEXT.tramp.bless}</p>
                    <p>{EVENT_TEXT.tramp.askMoreNext}</p>
                    {sanGet ? <p>--------</p> : null}
                    {sanGet ? <p>{EVENT_TEXT.tramp.gainPre}{<RequireComponent isGreen={true} requireList={{ san: Math.ceil(value / 5) }} />}</p> : null}
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
                    {learn ? <div><p>--------</p><p>{EVENT_TEXT.quest.learnPre}<span style={{ color: COLOR.YELLOW }}>{learn}</span>{EVENT_TEXT.quest.learnPost}</p></div> : null}
                    {place ? <div><p>--------</p><p>{EVENT_TEXT.quest.placePre}<span style={{ color: COLOR.YELLOW }}>{place}</span>{EVENT_TEXT.quest.placePost}</p></div> : null}
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
                    <p>{formatText(EVENT_TEXT.town.challenge, { oppoDesc: oppoDesc })}</p>
                    <RegisterComponent canBack={false} canBeEmpty={true} itemList={itemList[town]} />
                    <BtnBack callBack={this.setPicked} />
                </div>
            )
        }

        if (!choice) {
            var vars = { townDesc: townDesc, oppoDesc: oppoDesc };
            return (
                <div>
                    <div>
                        {EVENT_TEXT.town[town].map(function (line, idx) {
                            return <p key={idx}>{formatText(line, vars)}</p>;
                        })}
                    </div>
                    <p style={{ color: '#C2C788' }}>{formatText(town == 'ice' ? EVENT_TEXT.town.abilityIce : EVENT_TEXT.town.abilityFire, vars)}</p>
                    <BtnComponent handleClick={this.handleJoin}>加入<span style={{ color: COLOR.BLUE }}>{townDesc}</span></BtnComponent>
                    <BtnBack />
                </div>
            )
        } else {
            return (
                <div>
                    <p>{EVENT_TEXT.town.gainSkillPre}<span style={{ color: COLOR.BLUE }}>{town == 'ice' ? EVENT_TEXT.town.skillBlood : EVENT_TEXT.town.skillAbsorb}</span>{EVENT_TEXT.town.gainSkillPost}</p>
                    <p>{EVENT_TEXT.town.supplies}</p>
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
            <p>{EVENT_TEXT.thief.gift}</p>
            <RegisterComponent itemList={{ ninjaJacket: 1 }} canBack={false} canBeEmpty={true} />
            <BtnBack />
        </div>
        this.context.callWindow(wind);
    },
    handleKill: function () {
        this.context.setEventExperienced('thief_2');
        var wind = <div>
            <p>--覆面忍者--</p>
            <p>{EVENT_TEXT.thief.selfAsk}</p>
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
                        <p>{EVENT_TEXT.thief.gotTreasure1}</p>
                        <p>{EVENT_TEXT.thief.gotTreasure2}</p>
                        <BtnComponent handleClick={self.handleGive}>把财宝分给穷人吧....</BtnComponent>
                        <BtnComponent handleClick={self.handleKill}>这是我的！休想离开！</BtnComponent>
                    </div>
                )} mst='robberHead' />
            </div>
        }
        return <div>
            <p>--覆面忍者--</p>
            <p>{EVENT_TEXT.thief.spotted}</p>
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
            <p>{EVENT_TEXT.reincarnation.warn}</p>
            <p>{EVENT_TEXT.reincarnation.chooseHint}</p>
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
                    <p>{EVENT_TEXT.boss.return}</p>
                    <RegisterComponent itemList={{ blood: 1 }} canBeEmpty={true} canBack={false} />
                    <BtnBack callBack={this.onWin} />
                </div>
            )} />;
        } else {
            var showLevel = maouLevel > 0 ? (<span style={{ color: COLOR.BLUE }}>[轮回:{maouLevel}]</span>) : null;
            if (this.state.giving) {
                return (
                    <div>
                        <p>{EVENT_TEXT.boss.appearPre}{showLevel}{EVENT_TEXT.boss.appearPost}</p>
                        <BtnComponent desc='战斗！' handleClick={this.onBattle} />
                    </div>
                )
            } else {
                return <div>
                    <p>--邪恶的封印阵{showLevel}--</p>
                    <p>{EVENT_TEXT.boss.sealNeed}</p>
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
                {EVENT_TEXT.event.miner.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <p>--------</p>
                <p>{EVENT_TEXT.event.miner.placePre}<span style={{ color: COLOR.GREEN }}>[{EVENT_TEXT.event.miner.place}]</span>{EVENT_TEXT.event.miner.placePost}</p>
                <RegisterComponent canBeEmpty={true} itemList={{ pickaxe: 1 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'miner')} />
            </div>
        );
        this.eventMap.trade = (
            <div>
                <p>-商队-</p>
                {EVENT_TEXT.event.trade.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <p>{EVENT_TEXT.event.trade.placePre}<span style={{ color: COLOR.RED }}>[{EVENT_TEXT.event.trade.place}]</span>{EVENT_TEXT.event.trade.placePost}</p>
                <RegisterComponent canBeEmpty={true} itemList={{ security: 2 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'trade')} />
            </div>
        );
        this.eventMap.giveScroll = (
            <div>
                <p>-神秘旅者-</p>
                {EVENT_TEXT.event.giveScroll.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <RegisterComponent canBeEmpty={true} itemList={{ scroll: 1 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'giveScroll')} />
            </div>
        );
        this.eventMap.santa = (
            <div>
                <p>-麋鹿-</p>
                {EVENT_TEXT.event.santa.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <RegisterComponent canBeEmpty={true} itemList={SANTA_GIFT} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'santa')} />
            </div>
        );

        this.eventMap.huntIntro = (
            <div>
                <p>-年迈的猎人-</p>
                {EVENT_TEXT.event.huntIntro.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <RegisterComponent canBeEmpty={true} itemList={{ meat: 1 }} canBack={false} />
                <BtnBack callBack={this.setEventExperienced.bind(this, 'huntIntro')} />
            </div>
        );
        this.eventMap.robberQuestGet = (
            <div>
                <p>-村长-</p>
                {EVENT_TEXT.event.robberQuestGet.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <p>--------</p>
                <p>{EVENT_TEXT.event.robberQuestGet.placePre}<span style={{ color: COLOR.GREEN }}>[{EVENT_TEXT.event.robberQuestGet.place}]</span>{EVENT_TEXT.event.robberQuestGet.placePost}</p>
                <BtnBack callBack={this.setEventExperienced.bind(this, 'robberQuestGet')} />
            </div>
        );
        this.eventMap.robberQuest = <QuestComponent event='robberQuest' />;
        this.eventMap.spiderQuestGet = (
            <div>
                <p>-村长-</p>
                {EVENT_TEXT.event.spiderQuestGet.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <p>--------</p>
                <p>{EVENT_TEXT.event.spiderQuestGet.placePre}<span style={{ color: COLOR.GREEN }}>[{EVENT_TEXT.event.spiderQuestGet.place}]</span>{EVENT_TEXT.event.spiderQuestGet.placePost}</p>
                <BtnBack callBack={this.setEventExperienced.bind(this, 'spiderQuestGet')} />
            </div>
        );
        this.eventMap.spiderQuest = <QuestComponent event='spiderQuest' />;
        this.eventMap.dragonQuestGet = (
            <div>
                <p>-村长-</p>
                {EVENT_TEXT.event.dragonQuestGet.paragraphs.map(function (line, idx) { return <p key={idx}>{line}</p>; })}
                <p>--------</p>
                <p>{EVENT_TEXT.event.dragonQuestGet.placePre}<span style={{ color: COLOR.GREEN }}>[{EVENT_TEXT.event.dragonQuestGet.place}]</span>{EVENT_TEXT.event.dragonQuestGet.placePost}</p>
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
                    <p key='1'>{EVENT_TEXT.trade.notEnough1}</p>) : (
                    <p key='1'>{EVENT_TEXT.trade.notEnough2}</p>)
                );
            } else {
                result.push(state.max == 1 ? (
                    <p key='1'>{EVENT_TEXT.trade.deal1}</p>) : (
                    <p key='1'>{formatText(EVENT_TEXT.trade.givePre, { amount: state.amount })}{wrap(state.giveName)}{EVENT_TEXT.trade.givePost}</p>)
                );
            }
        } else {
            result.push(state.max == 1 ? (
                <p key='0'>{EVENT_TEXT.trade.exclusivePre}{wrap(state.giveName)}{EVENT_TEXT.trade.exclusivePost}</p>) : (
                <p key='0'>{EVENT_TEXT.trade.bringPre}{wrap(state.giveName)}{EVENT_TEXT.trade.bringPost}</p>)
            );
            result.push(<p key='hint' style={{ 'color': '#ccc' }}>/按住ctrl(10倍) shift(100倍)进行批量交易/</p>)
        }
        if (state.overFlow) {
            result.push(<p key='2'>{EVENT_TEXT.trade.noMorePre}{wrap(state.giveName)}{EVENT_TEXT.trade.noMorePost}</p>);
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
                    <p>{formatText(EVENT_TEXT.trade.leave, { traderName: TRADE_DATA[this.props.trade].name })}</p>
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
            result.push(<div className='tradeEmpty' key='empty'>{EVENT_TEXT.tradeList.empty}</div>);
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
