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
        var seasonDescMap = {
            'spring': <span className='season' style={{ color: COLOR.GREEN }}>春</span>,
            'summer': <span className='season' style={{ color: COLOR.RED }}>夏</span>,
            'autumn': <span className='season' style={{ color: COLOR.YELLOW }}>秋</span>,
            'winter': <span className='season' style={{ color: COLOR.BLUE }}>冬</span>,
        }
        return <div className="panel panel-primary advanMain" >
            <div className="panel-heading">
                <div className="time" id="time">
                    {this.context.generation ? <span>-轮回{this.context.generation}-</span> : null}
                    {seasonDescMap[this.context.season]}第<span className="date">{time.day}</span>日 {getTimeDiplay(time.hour)}
                    <div style={{ backgroundColor: getColor(time.hour) }} className="weatherBox"></div>
                </div>
                <span> : </span>
                <div className="title">{this.state.title}</div>
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
                {/* 回家按钮：独立容器，外出场景（分支/地点等）始终显示 */}
                {this.props.children == null && this.context.currentScene != 'home' && this.context.currentScene != 'dungeon' ?
                    <div className='homeBtnBar'>
                        <BtnHome placeName={PLACE_DATA[this.context.currentScene] ? this.context.currentScene : null} />
                    </div>
                    : null}
                {this.context.msgList && this.context.msgList.length ? <div className='toast'>{this.context.msgList[this.context.msgList.length - 1]}</div> : null}
            </div>
            <StateComponent />
        </div>
    }
});
