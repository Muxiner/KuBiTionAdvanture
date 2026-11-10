/**
 * src/scenes/dungeon.js —— 地牢探索
 */

// 地牢：向下探索、随机房间/事件、遇敌进入战斗、绳索返回与深层奖励
// 地牢：逐层推进的房间与事件（含宝箱、机关、Boss 等）
var DungeonComponent = React.createClass({
    contextTypes: {
        callWindow: React.PropTypes.func.isRequired,
        dungeonSaveData: React.PropTypes.object.isRequired,
        setStateFromChildren: React.PropTypes.func.isRequired,
        changeMsg: React.PropTypes.func.isRequired,
        useTime: React.PropTypes.func.isRequired,
        useItem: React.PropTypes.func.isRequired,
        boxSaveData: React.PropTypes.object.isRequired,
        currentEquip: React.PropTypes.object.isRequired,
        playerStateUse: React.PropTypes.func.isRequired,
        setDueling: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired,
        time: React.PropTypes.object.isRequired,
        setTitle: React.PropTypes.func.isRequired,
    },
    choices: {
        search: {
            name: '探索'
        },
        sneak: {
            name: '潜行'
        },
        downStair: {
            name: '下楼'
        },
    },
    getInitialState: function () {
        var dungeonSaveData = this.context.dungeonSaveData;
        var deepest = dungeonSaveData.deepest;
        var maxFloor = DUNGEON_MAX_FLOOR;
        return {
            ropeGoTo: deepest > maxFloor ? maxFloor : deepest,
        }
    },
    componentWillMount: function () {
        var dungeonSaveData = this.context.dungeonSaveData;
        var maxFloor = this.getMaxFloor();
        if (dungeonSaveData.deepest > maxFloor) dungeonSaveData.deepest = maxFloor;
        if (dungeonSaveData.stairCount > maxFloor) dungeonSaveData.stairCount = maxFloor;
        this.context.setTitle('地牢');
    },
    // G5：地牢层数上限（数据层可调）；第 max 层继续下楼即通关
    getMaxFloor: function () {
        return DUNGEON_MAX_FLOOR;
    },
    // G5：当前深度对应的奖励/怪物档位（受数据表层数限制）
    getRewardLevel: function (stairCount) {
        var maxLayer = getLength(DUNGEON_DATA);
        var level = Math.ceil(stairCount / DUNGEON_REWARD_TIER);
        return level > maxLayer ? maxLayer : level;
    },
    getReward: function (stairCount) {
        //获得宝箱奖励
        var rewardLevel = this.getRewardLevel(stairCount);
        var list = [];
        for (var i = rewardLevel; i > 0; i--) {
            var arr = DUNGEON_DATA[i] && DUNGEON_DATA[i].reward;
            if (!arr) continue;
            for (var j = arr.length - 1; j >= 0; j--) {
                list.push(arr[j]);
            };
        };
        //每层都能获得之前层的宝物。
        var result = {};
        while (getLength(result) == 0) {
            for (var i = 0; i < list.length; i++) {
                var tmp = list[i];
                var chance = tmp.chance;
                var things = tmp.things;
                for (var attr_2 in things) {
                    for (var j = things[attr_2] - 1; j >= 0; j--) {
                        if (Math.random() < chance) {
                            if (result[attr_2]) {
                                result[attr_2] += 1;
                            } else {
                                result[attr_2] = 1;
                            }
                        }
                    };
                }
            }
        }
        return result;
    },
    discoverInc: function (amount) {
        //增加某一层的探索度
        var dungeonSaveData = this.context.dungeonSaveData;
        var stairCount = dungeonSaveData.stairCount;
        if (dungeonSaveData.stairData[stairCount]) {
            dungeonSaveData.stairData[stairCount] += amount;
        } else {
            dungeonSaveData.stairData[stairCount] = amount;
        }
        this.context.setStateFromChildren({ dungeonSaveData: dungeonSaveData });
    },
    getNewRoom: function (choice) {
        var dungeonSaveData = this.context.dungeonSaveData;
        var stairCount = dungeonSaveData.stairCount;
        var boxSaveData = this.context.boxSaveData;
        dungeonSaveData.roomCount += 1;
        var room;
        var rewardChance = this.getRewardChance(choice);
        if (Math.random() < rewardChance) {
            room = 'reward';
        } else {
            do {
                room = getRandomThing({
                    'empty': 5,
                    'home': 1,
                    'seller': 2,
                    'getKey': 2,
                    'useKey': 2,
                    'trap': 1,
                }).attr;
            } while ((room == 'useKey' && !boxSaveData.bag.things.dungeonKey) || (room == 'getKey' && boxSaveData.bag.things.dungeonKey))
        }
        //探索度惩罚
        room = ((Math.random() < ((dungeonSaveData.stairData[stairCount] || 0) / MAX_DISCOVER))) ? (boxSaveData.bag.things.dungeonKey ? 'empty' : 'getKey') : room;

        //清除目前的room
        dungeonSaveData.room = {
            desc: null,
        }
        this.context.setStateFromChildren({ dungeonSaveData: dungeonSaveData });

        setTimeout(function () {
            switch (room) {
                case 'seller':
                    var trade = getRandom(TRADE_DATA, { haveValue: ['type', 'dungeon'] }).attr;
                    dungeonSaveData.room = {
                        desc: <TradeComponent canBack={false} trade={trade} />,
                    }
                    break;
                case 'getKey':
                    dungeonSaveData.room = {
                        desc: <p>你发现了一把钥匙。</p>,
                        itemList: { dungeonKey: 1 },
                    }
                    break;
                case 'reward':
                    dungeonSaveData.room = {
                        desc: <p>你发现了一个[宝箱]</p>,
                        itemList: this.getReward(dungeonSaveData.stairCount),
                    }
                    this.discoverInc(1);
                    break;
                case 'home':
                    var handleClick = function () {
                        this.context.useTime(function () {
                            this.context.setStateFromChildren({ currentScene: 'home' });
                        }.bind(this), 2);
                    }
                    dungeonSaveData.room = {
                        desc: <div>
                            <p>一个古老的传送装置。</p>
                            <p>要回家吗？</p>
                            <p><BtnComponent desc='回家' handleClick={handleClick.bind(this)} /></p>
                        </div>,
                    }
                    break;
                case 'empty':
                    dungeonSaveData.room = {
                        desc: <p>这个房间空空如也。</p>,
                    }
                    break;
                case 'useKey':
                    var handleGet = function () {
                        this.context.useTime(function () {
                            this.discoverInc(1);
                            var dungeonSaveData = this.context.dungeonSaveData;
                            var get = this.getReward(dungeonSaveData.stairCount);
                            get = cloneMul(get, 2);
                            this.context.useItem({ dungeonKey: 1 }, 'bag');
                            dungeonSaveData.room.itemList = get;
                            dungeonSaveData.room.desc = null;
                            this.context.setStateFromChildren({ dungeonSaveData: dungeonSaveData });
                        }.bind(this), 1);
                    }
                    dungeonSaveData.room = {
                        desc: (
                            <div>
                                <p>你发现了一个上锁的宝箱，你决定...</p>
                                <p><BtnComponent desc='使用钥匙' handleClick={handleGet.bind(this)} /></p>
                            </div>
                        )
                    }
                    break;
                case 'trap':
                    var itemGet = getRandomThing({
                        'gem': 200,
                        'gold': 200,
                    }).attr;
                    var handleClick = function () {
                        this.context.useTime(function () {
                            this.discoverInc(1);
                            var damagedChance = 0.5;
                            var getDamaged = Math.random() < damagedChance;
                            var damage = Math.ceil(Math.random() * Math.floor((1 - Math.pow(0.9, this.context.dungeonSaveData.stairCount)) * 100));
                            var amount = Math.ceil(Math.pow(this.context.dungeonSaveData.stairCount, 0.2) + 1);
                            if (getDamaged) {
                                this.context.playerStateUse({ hp: damage });
                            }
                            dungeonSaveData.room.desc = (
                                <div>
                                    {getDamaged ? <p>你踩到了<span style={{ color: COLOR.RED }}>陷阱</span>！受到了<span style={{ color: COLOR.RED }}>{damage}</span>点伤害!</p> : null}
                                    <RegisterComponent canBack={false} itemList={o(itemGet, amount)} />
                                </div>
                            );
                            this.context.setStateFromChildren({ dungeonSaveData: dungeonSaveData });
                        }.bind(this), 0.2);
                    }
                    dungeonSaveData.room = {
                        desc: <div>
                            <p>你发现了远处闪闪发亮的<span style={{ color: COLOR.YELLOW }}>[{ITEM_DATA[itemGet].name}]</span>，但可能是一个陷阱。你决定...</p>
                            <BtnComponent desc='捡取' handleClick={handleClick.bind(this)} />
                        </div>
                    }
                    break;
            }
            this.context.setStateFromChildren({ dungeonSaveData: dungeonSaveData });
        }.bind(this), 0);
    },
    getNewStair: function (stairNum) {
        var dungeonSaveData = this.context.dungeonSaveData;
        //最深层（G5：不超过地牢层数上限）
        var target = stairNum ? stairNum : dungeonSaveData.stairCount + 1;
        if (target > this.getMaxFloor()) target = this.getMaxFloor();
        dungeonSaveData.stairCount = target;
        dungeonSaveData.deepest = dungeonSaveData.stairCount > dungeonSaveData.deepest ? dungeonSaveData.stairCount : dungeonSaveData.deepest;
        dungeonSaveData.roomCount = 0;
        this.getNewRoom();
    },
    getRewardChance: function (choice) {
        var dungeonSaveData = this.context.dungeonSaveData;
        var stairCount = dungeonSaveData.stairCount;
        var rewardChance = this.rewardChance[choice];
        var currentEquip = this.context.currentEquip;
        var mul = 1;
        for (var attr in currentEquip) {
            if (!currentEquip[attr]) continue;
            if (ITEM_DATA[currentEquip[attr]].rewardChanceMul) {
                mul *= ITEM_DATA[currentEquip[attr]].rewardChanceMul;
            }
        }
        //探索度惩罚
        return (1 - (1 - rewardChance) * mul) * (1 - (dungeonSaveData.stairData[stairCount] || 0) / MAX_DISCOVER);
    },
    getBattleChance: function (choice) {
        var dungeonSaveData = this.context.dungeonSaveData;
        var stairCount = dungeonSaveData.stairCount;
        var battleChance = this.battleChance[choice];
        var currentEquip = this.context.currentEquip;
        var mul = 1;
        for (var attr in currentEquip) {
            if (!currentEquip[attr]) continue;
            if (ITEM_DATA[currentEquip[attr]].battleChanceMul) {
                mul *= ITEM_DATA[currentEquip[attr]].battleChanceMul;
            }
        }
        //探索度惩罚
        return (1 - (1 - battleChance) * mul) * (1 - (dungeonSaveData.stairData[stairCount] || 0) / MAX_DISCOVER);
    },
    //不同行动的不同结果的几率
    battleChance: {
        search: 0.6,
        sneak: 0.1,
    },
    rewardChance: {
        search: 0.4,
        sneak: 0.3,
    },
    stepTime: 2,
    handleChoice: function (choice) {
        this.context.setDueling(false);
        var dungeonSaveData = this.context.dungeonSaveData;
        var useTime = this.context.useTime;
        var timeNeed = this.stepTime;
        function getDungeonBattle() {
            var step = DUNGEON_MST_TIER;
            var maxLayer = getLength(DUNGEON_DATA);
            var enermyLevel = Math.ceil(this.context.dungeonSaveData.stairCount / step);
            if (enermyLevel > maxLayer) enermyLevel = maxLayer;
            if (enermyLevel < 1) enermyLevel = 1;

            //作者还没更新的层
            var i = enermyLevel;
            var isUpper = Math.random() < UPPER_CHANCE;
            if (isUpper) i++;
            do {
                var mstList = DUNGEON_DATA[i] && DUNGEON_DATA[i].mst;
                i--;
            } while (!mstList);

            var mst = getRandomThing(mstList).attr;
            var prefixChance = (this.context.dungeonSaveData.stairCount % step) / step;
            var prefix = {};
            var time = Math.floor(Math.random() * prefixChance * 5);

            var o = clone(PREFIX_DATA);
            delete o.upper;
            if (isUpper) {
                time--;
                prefix.upper = true;
            }
            for (var i = time; i > 0; i--) {
                prefix[getRandom(o).attr] = true;
            }

            var wind = <BattleComponent mst={mst} prefix={prefix} onWin={this.discoverInc.bind(null, 1)} />
            this.context.callWindow(wind);
        }
        switch (choice) {
            case 'search':
            case 'sneak':
                var chance = this.getBattleChance(choice);
                var callBack = function () {
                    if (Math.random() < chance) {
                        getDungeonBattle.bind(this)();
                    }
                    this.getNewRoom(choice);
                }.bind(this);
                break;
            case 'downStair':
                var maxFloor = this.getMaxFloor();
                if (dungeonSaveData.stairCount >= maxFloor) {
                    // G5：最后一层继续向下 = 通关，不再消耗钥匙
                    var callBack = function () {
                        this.onWin();
                    }.bind(this);
                } else {
                    this.context.useItem({ 'dungeonKey': 1 }, 'bag');
                    var callBack = function () {
                        this.getNewStair();
                    }.bind(this);
                }
                break;
        }
        useTime((function () {
            callBack();
            this.context.setStateFromChildren({ dungeonSaveData: dungeonSaveData });
        }).bind(this), timeNeed);
    },
    showChoiceMsg: function (choice) {
        var changeMsg = this.context.changeMsg;
        switch (choice) {
            case 'search':
            case 'sneak':
                var chance = this.getBattleChance(choice);
                var chance_2 = this.getRewardChance(choice);
                var detailedList = [
                    <span key='1'>你有(<span style={{ color: COLOR.GREEN }}>{Math.round(chance_2 * 100)}%</span>)的几率获得宝物。</span>,
                    <span key='2'>你有(<span style={{ color: COLOR.RED }}>{Math.round(chance * 100)}%</span>)的几率遇到敌人。</span>
                ];
                break;
            case 'downStair':
                var detailedList = [<span key='1'>进入下一层：消耗钥匙 ×1，耗时 2 小时。</span>];
                break;
            case 'dungeonRope':
                var detailedList = [<span key='1'>穿洞绳：消耗 ×1，可下潜到第 {this.context.dungeonSaveData.deepest} 层（当前层与最深层之间）。</span>];
                break;
        }
        var detailType = 'desc';
        changeMsg(detailedList, detailType);
    },
    onWinGoHome: function () {
        this.context.useTime(function () {
            this.context.callWindow(null);
            this.context.setStateFromChildren({ currentScene: 'home' });
        }.bind(this), 1)
    },
    onGameEndDisplay: function () {
        var account = this.context.settings.save_account;
        var time = this.context.time;
        var jsonStr = 'action=end&day=' + time.day + '&account=' + account;
        var self = this;
        try {
            var upload = $('#upload')[0];
            if (upload) upload.onclick = null;
        } catch (e) { }
        var xhr = $.ajax({
            contentType: "application/x-www-form-urlencoded", type: 'POST', url: SAVE_URL, async: true, data: jsonStr,
            success: function (res) {
                self.handleBoard(res || (xhr && xhr.responseText) || '[]');
            }
        });
    },
    handleBoard: function (d) {
        var data = [];
        try {
            data = JSON.parse(d);
        } catch (e) {
            data = [];
        }
        if (!data || !data.length) {
            this.context.callWindow(<div><p>暂无排行榜记录：需要启动 dev_server 后端并点击「铭刻」才有数据；直接「带着战利品回家」也可以。</p><BtnBack /></div>);
            return;
        }
        function getTds(dataRow) {
            var result = []
            for (var j = 1; j < dataRow.length; j++) {
                result.push(<td key={j}>{dataRow[j]}</td>)
            }
            return result;
        }
        function getRows() {
            var result = [];
            for (var i = data.length - 1; i >= 0; i--) {
                result.push(<tr key={i}>{getTds(data[i])}</tr>);
            };
            return result;
        }
        var board = (
            <div>
                <p>所有通关的英雄们（存活天数 / 通关天数）：</p>
                <div style={{ overflow: 'auto' }} className="buildTable tableOuter">
                    <table style={{ overflow: 'auto' }} className="table table-condensed table-hover table-striped table-bordered">
                        <thead>
                            <tr>
                                <td>玩家</td>
                                <td>存活天数</td>
                                <td>通关天数</td>
                            </tr>
                        </thead>
                        <tbody>
                            {getRows()}
                        </tbody>
                    </table>
                </div>
                <BtnBack />
            </div>
        );
        this.context.callWindow(board);
    },
    onWin: function () {
        var time = this.context.time;
        var day = time.day;
        var account = this.context.settings.save_account;
        var maxFloor = this.getMaxFloor();
        var wind = <div>
            <p>恭喜你通关了地牢（第 {maxFloor} 层）！</p>
            <p>你存活了 <span className="num">{fmtNum(day)}</span> 天。</p>
            <p>你的战利品都在背包/登记区，请先全部拾取；之后可直接「带着战利品回家」（耗时 1 小时），或把名字刻在石碑上。</p>
            <div className="form-control">{account}</div>
            <div><BtnComponent className="btn btn-default" id="upload" handleClick={this.onGameEndDisplay}>铭刻</BtnComponent></div>
            <div><BtnComponent desc='带着战利品回家' handleClick={this.onWinGoHome} /></div>
            <div><BtnBack /></div>
        </div>
        this.context.callWindow(wind);
    },
    handleRopeGo: function () {
        var dungeonSaveData = this.context.dungeonSaveData;
        var deepest = dungeonSaveData.deepest;
        var ropeGoTo = this.state.ropeGoTo;
        var ropeGoFrom = dungeonSaveData.stairCount;
        var time = Math.pow(Math.abs(ropeGoTo - ropeGoFrom), 0.7);
        time = (time >= 20) ? 20 : time;
        this.context.useItem({ 'dungeonRope': 1 }, 'bag');
        this.context.useTime(function () {
            dungeonSaveData.stairCount = ropeGoTo;
            dungeonSaveData.roomCount = 1;
            dungeonSaveData.room = {
                desc: <p>你顺利的空降到了指定的地点。</p>
            };
            this.setState({ ropeWindow: false });
            this.context.setStateFromChildren({ dungeonSaveData: dungeonSaveData });
        }.bind(this), time);
    },
    handleRope: function () {
        this.setState({ ropeWindow: !this.state.ropeWindow });
    },
    checkRopeDisable: function () {
        var value = this.state.ropeGoTo;
        var dungeonSaveData = this.context.dungeonSaveData;
        var stairCount = dungeonSaveData.stairCount;
        var deepest = dungeonSaveData.deepest;
        return (value > deepest) || (value < stairCount + 1);
    },
    handleRopeChange: function (sender) {
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        // var value =  parseInt($('.scheduleInput_'+this.props.type)[0].value);
        var value = parseInt(obj.value);
        var dungeonSaveData = this.context.dungeonSaveData;
        var stairCount = dungeonSaveData.stairCount;
        var deepest = dungeonSaveData.deepest;
        value = value > deepest ? deepest : value;
        value = value < stairCount + 1 ? stairCount + 1 : value;
        this.setState({ ropeGoTo: value });
    },
    render: function () {
        var dungeonSaveData = this.context.dungeonSaveData;
        var boxSaveData = this.context.boxSaveData;
        function getChoices() {
            var result = [];
            var choiceDesc = {
                search: '探索：40% 获得宝物、60% 遭遇战斗；每次耗时 2 小时',
                sneak: '潜行：30% 获得宝物、10% 遭遇战斗；每次耗时 2 小时',
                downStair: '下楼：消耗钥匙 ×1，进入更深一层；每次耗时 2 小时',
            };
            for (var attr in this.choices) {
                var tmp = this.choices[attr];
                //判断能否下楼
                if (attr == 'downStair' && !boxSaveData.bag.things['dungeonKey'] && dungeonSaveData.stairCount < this.getMaxFloor()) continue;
                var label = tmp.name;
                var descText = choiceDesc[attr] || '';
                if (attr == 'downStair' && dungeonSaveData.stairCount >= this.getMaxFloor()) {
                    label = '通关';
                    descText = '通关：结束地牢探索并结算，可带战利品回家';
                }
                result.push(
                    <div key={attr} title={descText}>
                        <BtnComponent handleMouseEnter={this.showChoiceMsg.bind(this, attr)} handleClick={this.handleChoice.bind(this, attr)}>{label}</BtnComponent>
                        <div style={{ color: '#777', fontSize: '11px', marginTop: '2px' }}>{descText}</div>
                    </div>
                )
            }
            if (boxSaveData.bag.things['dungeonRope'] && dungeonSaveData.stairCount < dungeonSaveData.deepest) {
                result.push(
                    <div key='dungeonRope' title={'穿洞：消耗穿洞绳 ×1，直接下潜到已探索过的最深层'}>
                        <BtnComponent handleMouseEnter={this.showChoiceMsg.bind(this, 'dungeonRope')} handleClick={this.handleRope}>穿洞</BtnComponent>
                    </div>
                )
            }
            return <div className="well dungeonChoice">{result}</div>;
        }
        function getRoomDesc() {
            var room = dungeonSaveData.room;
            //到达底端
            return <div style={{ marginTop: 20, width: 300, margin: 'auto' }}>
                <div style={{ display: this.state.ropeWindow ? 'none' : 'block' }}>
                    {room.desc}
                    {(getLength(dungeonSaveData.room.itemList)) ? <RegisterComponent canBack={false} itemList={dungeonSaveData.room.itemList} /> : null}
                </div>
                {this.state.ropeWindow ? (
                    <div style={{ marginTop: 10, border: '1px solid #ddd' }}>
                        <p>--到达层--</p>
                        <div><ProgressComponent key='ropeGo' current={dungeonSaveData.stairData[this.state.ropeGoTo] || 0} max={MAX_DISCOVER} /></div>
                        <input className='form-control rope' type='number' onChange={this.handleRopeChange} value={this.state.ropeGoTo} />
                        <div>
                            <BtnComponent disabled={this.checkRopeDisable()} desc='前往' handleClick={this.handleRopeGo} />
                        </div>
                    </div>) : null}
            </div>
        };
        return (
            <div style={{ margin: 'auto', width: 400, height: 300 }}>
                <div className="dungeonHeading">
                    <p>第 <span className="num">{dungeonSaveData.stairCount}</span> 层 / 共 {this.getMaxFloor()} 层</p>
                    <p>本次已探索房间 <span className="num">{dungeonSaveData.roomCount}</span> 个</p>
                    <p>最深记录：第 <span className="num">{dungeonSaveData.deepest}</span> 层</p>
                    <div title={'本层探索度：越高，获得宝物/遇敌的概率越低；每日衰减 1'}>
                        <ProgressComponent key='view' current={dungeonSaveData.stairData[dungeonSaveData.stairCount] || 0} max={MAX_DISCOVER} />
                        <div style={{ color: '#777', fontSize: '11px' }}>本层探索度 {fmtNum(dungeonSaveData.stairData[dungeonSaveData.stairCount] || 0)}/{fmtNum(MAX_DISCOVER)}（越高收益越低，换层可重置）</div>
                    </div>
                </div>
                <div>
                    {getRoomDesc.bind(this)()}
                    {getChoices.bind(this)()}
                </div>
            </div>
        )
    }
});
