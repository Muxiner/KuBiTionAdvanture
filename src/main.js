//《超苦逼冒险者》
//使用框架：React，jQuery
//作者：maou
//联系方式：496863906@qq.com
/**
 * main.js —— 游戏全部逻辑与界面（单文件，JSX 由浏览器内 Babel 编译）
 *
 * 结构概览：
 *   1) 通用 UI 组件：ItemComponent / VectorComponent / RequireComponent /
 *      BoxComponent / BtnComponent / ProgressComponent 等；
 *   2) 菜单与系统界面：NormalMenuComponent(设置/存档) / BagComponent /
 *      StateComponent / StudioComponent / BuildComponent 等；
 *   3) 玩法模块：事件、任务、交易、建造、生产、战斗、地牢；
 *   4) 顶层：AdvanComponent(场景路由与时间头) 与 MainComponent(全局状态中心)。
 *
 * 关键约定：MainComponent 持有全部游戏状态，并通过 React context 向子组件
 * 下发数据与操作方法；数据表见 data_*.js，工具函数见 lib.js。
 */


'use strict';

var CTRL_PRESSED = false;
var SHIFT_PRESSED = false;
$(function () {
    $(document).keypress(function (e) {
        if (e.keyCode == 32) {
            //...........code.......
            event.preventDefault();
            return false;
        }
        if (e.keyCode == 13) {
            //...........code.......
            event.preventDefault();
            return false;
        }
    })
    $(document).keyup(function (e) {
        if (e.keyCode == 32) {
            event.preventDefault();
            return false;
            //...........code.......
        }
        if (e.keyCode == 13) {
            //...........code.......
            event.preventDefault();
            return false;
        }
    })
});

//引入React动画库
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;


function IsPC() {
    var userAgentInfo = navigator.userAgent;
    var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod");
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) { flag = false; break; }
    }
    return flag;
}
var IS_IPAD = (IsPC()) ? false : true;

$(function () {
    FastClick.attach(document.body);
});

function toParagraphs(arr) {
    if (typeof arr == 'string') return arr;
    var result = [];
    for (var i = 0; i < arr.length; i++) {
        result.push(<p key={i}>{arr[i]}</p>);
    }
    return result;
}

function render() {
    ReactDOM.render(
        <MainComponent />,
        document.getElementById('game')
    );
}

render();
