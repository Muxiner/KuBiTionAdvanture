/**
 * src/scenes/advan.js —— 顶层冒险面板
 * 显示时间/季节，按 currentScene 路由场景或渲染 callWindow 打开的窗口，并承载进度遮罩与提示。
 */

//==>the outer view of game
//逻辑层
// 顶层冒险面板：显示时间/季节，按 currentScene 路由场景或渲染 callWindow 打开的窗口，
// 并承载加载进度遮罩与全局提示
// 顶层冒险面板：显示时间/季节，按 currentScene 路由场景或渲染 callWindow 打开的窗口
var AdvanComponent = React.createClass({
    getDefaultProps: function () {
        return {
            misk: 0,
            progress: 0,
        }
    },
    getInitialState: function () {
        return {
            title: '冒险',
            wind: null,
            buildingSaveData: null
        }
    },
    contextTypes: {
        time: React.PropTypes.object.isRequired,
        currentScene: React.PropTypes.string.isRequired,
        season: React.PropTypes.string.isRequired,
        generation: React.PropTypes.number.isRequired,
        msgList: React.PropTypes.array.isRequired,
    },
    childContextTypes: {
        setTitle: React.PropTypes.func.isRequired,
    },
    getChildContext: function () {
        return {
            setTitle: this.setTitle,
        };
    },
    setTitle: function (name) {
        this.setState({ title: name });
    },
    getScene: function (name) {
        var sceneMap = {
            home: <HomeComponent />,
            branch: <BranchComponent />,
            dungeon: <DungeonComponent />,
        }
        var result = sceneMap[name];
        if (!result) {
            result = <PlaceComponent place={name} />;
        }
        return result;
    },
    render: function () {
        function getTimeDiplay(time) {
            var str = "";
            var hour = Math.floor(time);
            if (hour < 2) {
                str += "半夜";
            } else {
                if (hour < 5) {
                    str += "凌晨";
                } else {
                    if (hour < 10) {
                        str += "早晨";
                    } else {
                        if (hour < 13) {
                            str += "中午";
                        } else {
                            if (hour < 17) {
                                str += "下午";
                            } else {
                                if (hour < 19) {
                                    str += "傍晚";
                                } else {
                                    if (hour < 22) {
                                        str += "晚上";
                                    } else {
                                        str += "深夜";
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return str;
        };
        function getDisplay() {
            if (this.props.children == null) {
                return <div className="advan" id="advan">{this.getScene(this.context.currentScene)}</div>
            } else {
                return this.props.children
            }
        };
        function getColor(num) {
            var str = "";
            var time = Math.abs(12 - num);
            var r, g, b;
            if (time < 2) {
                r = 255;
                g = 255;
                b = 255;
            } else {
                if (time < 4) {
                    r = Math.floor((2 - time) * (255 - 102) / 2 + 255);
                    g = Math.floor((2 - time) * (255 - 153) / 2 + 255);
                    b = Math.floor((2 - time) * (255 - 204) / 2 + 255);
                } else {
                    if (time < 7) {
                        r = Math.floor((6 - time) * (102 - 66) / 4 + 102);
                        g = Math.floor((6 - time) * (153 - 21) / 4 + 153);
                        b = Math.floor((6 - time) * (204 - 0) / 4 + 204);
                    } else {
                        if (time < 8) {
                            r = Math.floor((9 - time) * (66 - 0) / 3 + 66);
                            g = Math.floor((9 - time) * (21 - 0) / 3 + 21);
                            b = Math.floor((9 - time) * (0 - 0) / 3 + 0);
                        }
                        else {
                            r = 0;
                            g = 0;
                            b = 0;
                        }
                    }
                }
            }
            str += "rgb(";
            str += r;
            str += ",";
            str += g;
            str += ",";
            str += b;
            str += ")";
            return str;
        }
        var misk = this.props.misk;
        var time = this.context.time;
        var progress = this.props.progress;
        // 深色季节文字（白底 ≥5.8:1；原绿色 #74AB6A 仅 2.7:1）
        var seasonDescMap = {
            'spring': <span className='season' style={{ color: '#2f6b2f' }}>春</span>,
            'summer': <span className='season' style={{ color: '#a3352a' }}>夏</span>,
            'autumn': <span className='season' style={{ color: '#6b5300' }}>秋</span>,
            'winter': <span className='season' style={{ color: '#1f4f8a' }}>冬</span>,
        }
        // 用文字表达昼夜（原来的 30×30 颜色方块没有图例，正午白块/半夜黑块像占位符）
        var isNight = time.hour >= 19 || time.hour < 6;
        var phaseText = isNight ? '夜晚' : '白天';
        // 标题随场景推导，避免地图/窗口里顶部一直显示“家”
        var sceneTitles = { home: '家', branch: '地图', dungeon: '地牢' };
        var sceneTitle = sceneTitles[this.context.currentScene] ||
            (PLACE_DATA[this.context.currentScene] ? PLACE_DATA[this.context.currentScene].name : this.state.title);
        return <div className="panel panel-primary advanMain" >
            <div className="panel-heading">
                <div className="time" id="time">
                    {this.context.generation ? <span className="generation">-轮回{this.context.generation}-</span> : null}
                    {seasonDescMap[this.context.season]}第<span className="date">{time.day}</span>日 {getTimeDiplay(time.hour)}
                    <span className={'dayPhase ' + (isNight ? 'dayPhaseNight' : 'dayPhaseDay')}
                        title={'游戏内时间：' + Math.floor(time.hour) + ' 点，' + phaseText}>
                        {isNight ? '☾ ' + phaseText : '☀ ' + phaseText}
                    </span>
                </div>
                <span className="headingSep">·</span>
                <div className="title" title={'当前位置：' + sceneTitle}>{sceneTitle}</div>
            </div>
            <div className="panel-body  clearFix">
                <div className="mask" style={{ display: misk == 0 ? 'none' : 'block', opacity: misk }}>
                    <div className="waitBar" style={{ display: (misk == 0 || progress == 0) ? 'none' : 'block', opacity: misk }}>
                        <div className="waitBarIn" style={{ width: Math.ceil(100 * progress) }}></div>
                    </div>
                </div>
                <div className='advanOuter' >
                    <div className="advan">
                        {getDisplay.bind(this)()}
                    </div>
                </div>
                {this.context.msgList && this.context.msgList.length ?
                    <div className='toast' role='status' aria-live='polite'>{this.context.msgList[this.context.msgList.length - 1]}</div>
                    : null}
            </div>
            {/* 回家按钮：移到场景内容层之外（原绝对定位会压住地点卡片的“出发”） */}
            {this.props.children == null && this.context.currentScene != 'home' && this.context.currentScene != 'dungeon' ?
                <div className='homeBtnBar'>
                    <BtnHome placeName={PLACE_DATA[this.context.currentScene] ? this.context.currentScene : null} />
                </div>
                : null}
            <StateComponent />
        </div>
    }
});
