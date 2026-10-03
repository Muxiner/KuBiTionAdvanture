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
// var move=function(e){
//     e.preventDefault && e.preventDefault();
//     e.returnValue = false;
//     e.stopPropagation && e.stopPropagation();
//     return false;
// }
// var start=function(e){
//     pos.y = e.targetTouches[0].pageY;
//             pos.x = e.targetTouches[0].pageX;
//     }
//     var end=function(e){
//     //stop the zoom in event be motivated ,for the handle equipment's dobule click event.
//     move(e);
//     y = e.targetTouches[0].pageY;
//     x = e.targetTouches[0].pageX;
//     if(Math.abs(pos.y-y)<3 ||Math.abs(pos.x-x)<3){
//         setTimeout(function(){fireEvent(e.target,'click');},2);
//     }
//     pos=null;
//     return false;
// }
// document.documentElement.style.overflow='hidden'; //低版本需要
// document.body.style.overflow='hidden';//mobile 低版本不生效
// eventUtil.addEvent(window,'touchmove',move);
// eventUtil.addEvent(document.body,'touchstart',start);
// eventUtil.addEvent(document.body,'touchend',end);

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
// IS_IPAD = true;


$(function () {
    FastClick.attach(document.body);
});

// function getEnveronmentTemperature(day){
//     var seasonMap = {
//         'spring':0,
//         'summer':1,
//         'autumn':2,
//         'winter':3,
//     };
//     var base = seasonMap['spring']* SEASON_CIRCLE - SEASON_CIRCLE/2 ;
//     var temperature = (Math.sin(Math.PI*(day+base)/(2*SEASON_CIRCLE)));
//     temperature = 50 * (temperature > 0?1:-1) * Math.pow(temperature,4);
//     return temperature;
// }
// for(var i = 0;i<100;i++){
//     console.log('day' + i + ' ' +getEnveronmentTemperature(i));
// }

// var LocString = String(window.document.location.href);
// function getQueryStr(str) {
//     var rs = new RegExp("(^|)" + str + "=([^&]*)(&|$)", "gi").exec(LocString), tmp;
//     if (tmp = rs) {
//         return tmp[2];
//     }
//     // parameter cannot be found
//     return "";
// }


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
