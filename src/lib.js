/**
 * lib.js —— 通用工具库与运行时垫片
 * 提供 requestAnimationFrame 兼容、动画步进、对象/物品增删、随机抽取、
 * 深拷贝、数量倍乘等基础函数；同时负责核心库加载失败时的本地回退。
 * 本文件的函数在 data_*.js 与 main.js 中被全局调用。
 */
//requestAnimationFrame：兼容旧浏览器的帧动画接口
window.requestAnimationFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();
/**
 * 基于 rAF 的动画步进封装：回调收到两次帧之间的时间差 step(ms)。
 * 用法：requestAnimationFrame(bindAnimation(fn)())
 */
function bindAnimation(foo) {
    return function () {
        var dt_old = 0;
        return function (dt) {
            if (!dt_old) dt_old = dt - 1000 / 30;
            var step = dt - dt_old;
            dt_old = dt;
            foo(step);
        }
    }
}
//御用库函数
/**
 * 把 add 中各属性的数值累加到 obj 上（属性不存在则直接赋值）。
 * 常用于物品容器（things）的合并。
 */
function addTo(obj, add) {
    for (var attr in add) {
        if (obj[attr]) {
            obj[attr] += add[attr];
        } else {
            obj[attr] = add[attr];
        }
    }
}
/**
 * 合并两个物品容器并返回新对象（不改动入参）。
 * 例：together(bag.things, bigBox.things)
 */
function together(a, b) {
    var result = clone(a);
    var add = clone(b);
    for (var attr in add) {
        if (result[attr]) {
            result[attr] += add[attr];
        } else {
            result[attr] = add[attr];
        }
    }
    return result;
}
function getLength(obj) {
    //计算对象中成员属性的数量
    var count = 0;
    for (var attr in obj) {
        count++;
    };
    return count;
}
/**
 * 按数量权重从物品容器中随机抽取一个物品。
 * 支持值为数字或 {amount:n} 两种形式；返回 {attr:物品id,total:总量}，
 * 容器为空时 attr 为 false。
 */
function getRandomThing(things) {
    var num = 0;
    for (var attr in things) {
        num += things[attr].amount == undefined ? things[attr] : things[attr].amount;
    };
    var total = num;
    num = Math.ceil(Math.random() * num);
    var flag = false;
    for (var attr in things) {
        num -= things[attr].amount == undefined ? things[attr] : things[attr].amount;
        if (num <= 0) {
            flag = true;
            break;
        }
    };
    if (flag == false || total == 0) {
        return { attr: false, total: total };
    }
    return { attr: attr, total: total };
};
/**
 * 从对象中随机取一个条目，返回 {attr,value}。
 * props.noAttr：跳过具有该字段的条目；
 * props.haveValue：[字段,值] 仅保留字段等于该值的条目。
 * 无匹配项时返回 false。
 */
function getRandom(obj, props) {
    var count = 0;
    for (var attr in obj) {
        if (props && props.noAttr) {
            if (obj[attr][props.noAttr]) continue;
        }
        if (props && props.haveValue) {
            if (obj[attr][props.haveValue[0]] != props.haveValue[1]) continue;
        }
        count++;
    };
    var length = Math.random() * count;

    count = 0;
    for (var attr in obj) {
        if (props && props.noAttr) {
            if (obj[attr][props.noAttr]) continue;
        }
        if (props && props.haveValue) {
            if (obj[attr][props.haveValue[0]] != props.haveValue[1]) continue;
        }
        count++;
        if (count >= length) {
            return { attr: attr, value: obj[attr] };
        }
    };
    return false;
}
function clone(obj) {
    //克隆一个对象
    var o;
    switch (typeof obj) {
        case 'undefined': break;
        case 'string': o = obj + ''; break;
        case 'number': o = obj - 0; break;
        case 'boolean': o = obj; break;
        case 'object':
            if (obj === null) {
                o = null;
            } else {
                if (obj instanceof Array) {
                    o = [];
                    for (var i = 0, len = obj.length; i < len; i++) {
                        o.push(clone(obj[i]));
                    }
                } else {
                    o = {};
                    for (var k in obj) {
                        o[k] = clone(obj[k]);
                    }
                }
            }
            break;
        default:
            o = obj; break;
    }
    return o;
}
function cloneMul(obj, mul, isRound) {
    //克隆一个容器内的物品，并倍乘一个数
    var o = {};
    var mul = mul || 1;
    for (var attr in obj) {
        var num = mul * obj[attr];
        o[attr] = isRound ? Math.round(num) : num;
    };
    return o;
}
/** 快速构造单键对象：o('wood',5) => {wood:5}。 */
function o(attr, value) {
    var o = {};
    o[attr] = value;
    return o;
}
/** console.log 的简写别名。 */
function lll(value) {
    console.log(value);
}
/**
 * 物品实例化支持：耐久类武器/工具在背包中以 baseId#序号 的实例键存放，
 * 实例键对应的 ITEM_DATA 条目会带有 baseId 字段。此函数把任意键还原为物品基础 id。
 */
function itemBaseId(id) {
    return (ITEM_DATA[id] && ITEM_DATA[id].baseId) || id;
}
/**
 * 读取某物品的耐久损耗值（0=全新）。stackable 物品的耐久是按每份存的数组，
 * 这里返回其中损耗最小的一份（最接近全新）作为展示值。
 */
function durableWear(durableSaveData, id) {
    var w = durableSaveData[id];
    if (Array.isArray(w)) {
        if (w.length === 0) return 0;
        var m = w[0];
        for (var i = 1; i < w.length; i++) { if (w[i] < m) m = w[i]; }
        return m;
    }
    return w || 0;
}
/**
 * 统计容器(bag)中某基础物品的总数量（含未实例化的堆叠与各实例）。
 */
function countBagItem(bag, id) {
    var n = 0;
    for (var k in bag) {
        if (itemBaseId(k) == id) n += bag[k];
    }
    return n;
}
/**
 * 根据现有材料(背包/箱子合并后的 bag)，计算某配方最多可制作的次数。
 * require 为 {物品id:需求量}；材料不足或需求为空时返回 0。
 */
function getCraftableCount(require, bag) {
    var min = Infinity;
    for (var attr in require) {
        var need = require[attr];
        if (!need) continue;
        var c = Math.floor(countBagItem(bag, attr) / need);
        if (c < min) min = c;
    }
    return (min === Infinity) ? 0 : min;
}
/**
 * 生成物品的作用文本（描述 + 状态效果），用于按钮/配方的悬浮提示。
 * 例：'清爽可口的酱料。\n效果：满腹+4、水分+2'
 */
function getItemInfoText(id) {
    var data = ITEM_DATA[id];
    if (!data) return '';
    var parts = [];
    if (data.desc) parts.push(data.desc);
    if (data.effect) {
        var eff = [];
        for (var attr in data.effect) {
            eff.push((STATE_DATA[attr] ? STATE_DATA[attr].name : attr) + (data.effect[attr] > 0 ? '+' : '') + data.effect[attr]);
        }
        if (eff.length) parts.push('效果：' + eff.join('、'));
    }
    return parts.join('\n');
}
/** 事件文本插值：将模板中的 {key} 替换为 vars[key]（找不到时原样保留）。 */
function formatText(tpl, vars) {
    if (tpl == null) return tpl;
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) {
        return (vars && vars[k] != null) ? vars[k] : m;
    });
}
/** 取对象的第一个成员，返回 {attr,value}；空对象返回 undefined。 */
function getFirst(obj) {
    for (var attr in obj) {
        return { attr: attr, value: obj[attr] }
    }
}
/** 动态向页面 <head> 注入 js/css 文件（用于库回退）。 */
function loadFile(filename, filetype) {
    if (filetype == "js") {
        var fileref = document.createElement('script');
        fileref.setAttribute("type", "text/javascript");
        fileref.setAttribute("src", filename);
    } else if (filetype == "css") {
        var fileref = document.createElement('link');
        fileref.setAttribute("rel", "stylesheet");
        fileref.setAttribute("type", "text/css");
        fileref.setAttribute("href", filename);
    }
    if (typeof fileref != "undefined") {
        document.getElementsByTagName("head")[0].appendChild(fileref);
    }
}
; (function () {
    //CDN获取JS失败时
    if (!window.jQuery) {
        loadFile("./build/jquery.js", "js");
    }
    if (!window.React) {
        loadFile("./build/react-with-addons.js");
        loadFile("./build/react-dom.js");
        loadFile("./build/browser.min.js");
    }
})();