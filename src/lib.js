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
// 计算对象自身可枚举属性的数量
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
// 深拷贝（支持 对象/数组/基本类型）
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
// 深拷贝一个「值→数量」映射并按 mul 倍乘，isRound 为真时取整
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
// ===== UI 文案格式化工具（v0.52 内容优化，供全部界面共用）=====
// 千分位数字：15766 -> "15,766"；非数字原样返回。
function fmtNum(value) {
    if (value == null || value === '') return '';
    var n = Number(value);
    if (!isFinite(n)) return String(value);
    var neg = n < 0;
    n = Math.abs(n);
    var str = String(Math.round(n * 10) / 10);
    var parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + parts.join('.');
}
// 游戏内时长：小时数 -> "2 小时" / "1 天 4 小时" / "0.5 小时"。
function fmtHours(hours) {
    var n = Number(hours);
    if (!isFinite(n) || n <= 0) return '0 小时';
    var days = Math.floor(n / 24);
    var rest = n - days * 24;
    var restText = (rest % 1 === 0) ? String(rest) : String(Math.round(rest * 10) / 10);
    if (days > 0) return fmtNum(days) + ' 天' + (rest > 0 ? ' ' + restText + ' 小时' : '');
    return restText + ' 小时';
}
// 金币：15766 -> "15,766 金币"。
function fmtMoney(n) {
    if (n == null || n === '') return '0 金币';
    return fmtNum(n) + ' 金币';
}
// 数量：2 -> "×2"。
function fmtQty(n) {
    return '×' + fmtNum(n);
}
// 物品/状态显示名（找不到数据时退回 id）。
// 说明：需求列表里除物品外还会出现 ps/san/hp/full/moist/temp 这类"状态消耗"，
// 它们不在 ITEM_DATA 里，但 STATE_DATA 有中文名，这里一并映射。
function fmtItemName(id) {
    if (id == null) return '';
    if (typeof ITEM_DATA !== 'undefined' && ITEM_DATA[id] && ITEM_DATA[id].name) return ITEM_DATA[id].name;
    if (typeof STATE_DATA !== 'undefined' && STATE_DATA[id] && STATE_DATA[id].name) return STATE_DATA[id].name;
    if (id == 'gold') return '金币';
    return String(id);
}
// 物品 + 数量：("wood",4) -> "木头 ×4"。
function fmtItemQty(id, n) {
    return fmtItemName(id) + (n == null ? '' : ' ' + fmtQty(n));
}
// 百分比数值：12 -> "+12%"；0 -> "+0%"；负数保留负号（传入的已是百分数，不是 0.12 这种比例）。
function fmtPct(p) {
    var n = Number(p);
    if (!isFinite(n)) return String(p);
    return (n > 0 ? '+' : '') + Math.round(n) + '%';
}
// 需求列表转文本：{wood:4} / ["axe"] -> "木头 ×4、斧头"。
function fmtReqText(require) {
    if (!require) return '';
    var parts = [];
    if (require instanceof Array) {
        for (var i = 0; i < require.length; i++) parts.push(fmtItemName(require[i]));
    } else {
        for (var attr in require) parts.push(fmtItemQty(attr, require[attr]));
    }
    return parts.join('、');
}
// 缺失材料文本：传入需求与"现有数量"取值函数/对象，返回 "缺少：木头 ×7、铁块 ×2" 或 "材料齐备"。
function fmtMissingText(require, amounts) {
    if (!require) return '';
    var getAmount = (typeof amounts === 'function') ? amounts : function (id) {
        return (amounts && amounts[id]) || 0;
    };
    var missing = [];
    if (require instanceof Array) {
        for (var i = 0; i < require.length; i++) {
            if (getAmount(require[i]) <= 0) missing.push(fmtItemName(require[i]));
        }
    } else {
        for (var attr in require) {
            var need = require[attr];
            var have = getAmount(attr);
            if (have < need) missing.push(fmtItemName(attr) + ' ×' + fmtNum(need - have));
        }
    }
    return missing.length ? ('缺少：' + missing.join('、')) : '材料齐备';
}
// 资源相对丰富度说明（地图卡片/地点页悬浮提示用）。
function richnessHint(label) {
    var map = {
        '大量': '存量很高（约为上限的 80% 以上），适合集中采集',
        '较多': '存量较高（约 50%~80%），可以稳定采集',
        '一般': '存量中等（约 20%~50%）',
        '较少': '存量偏低（约 10%~20%），采几次就会见底',
        '很少': '存量很低（不足 10%），建议换地点',
        '极少': '存量极低，基本采不到'
    };
    return map[label] || ('相对丰富度：' + label);
}
// 状态值语义：按当前/上限比例返回"充足/正常/偏低/危险"（不依赖颜色）。
function stateLevelText(amount, max) {
    var m = Number(max) || 100;
    var ratio = (Number(amount) || 0) / m;
    if (ratio <= 0.2) return '危险';
    if (ratio <= 0.4) return '偏低';
    if (ratio <= 0.8) return '正常';
    return '充足';
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