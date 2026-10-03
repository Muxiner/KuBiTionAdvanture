/**
 * data_event_text.js —— 事件剧情/对话文本数据表 EVENT_TEXT
 *
 * 只存放「剧情旁白 / NPC 对话」文本；标题（如 --覆面忍者--）、按钮文案、
 * 字段标签等界面文案仍保留在组件中，不在此表。
 *
 * 约定：
 *  - 含动态内容的文本用 {xxx} 占位，代码侧用 formatText(tpl, vars) 插值；
 *  - 需要彩色/额外构件（如 [地点]、物品图标）的句子，拆成 pre/place/post
 *    等片段，由代码在片段之间插入 <span>/<RequireComponent>。
 */
var EVENT_TEXT = {
    // 流浪汉
    tramp: {
        askEmpty: '求你了，能不能给我一点食物。。。',
        askHaveFood: '拜托..我要食物啊...',
        thanksFull: '太感谢了，上帝保佑你...',
        thanksMore: '谢谢你...还有吗...',
        feelBetter: '我感觉好多了。',
        mapGivePre: '流浪汉递给你一张',
        mapGivePlace: '小镇',
        mapGivePost: '的地图。',
        leave: '流浪汉扬长而去....',
        bless: '上帝保佑你...',
        askMoreNext: '如果你有更多的食物，可以下次再带给我一点吗？',
        gainPre: '你获得了',
    },
    // 通用任务：奖励/解锁提示
    quest: {
        learnPre: '你学会了[',
        learnPost: ']的制作。',
        placePre: '在地图上标出了[',
        placePost: ']的位置。',
    },
    // 战争营地（冰/火阵营）对话
    town: {
        challenge: '你现在可以随时去挑战{oppoDesc}。',
        fire: [
            '我们是由法师教徒组成的{townDesc}。',
            '自从我们踏上这片土地，就一直在努力清理各种恐怖生物。',
            '直到邪恶的{oppoDesc}进入我我们的视野。',
            '他们的力量十分强大，但是蠢得就像一袋子锤子！',
            '我们必须去消灭{oppoDesc}！我们不能让这些家伙的势力壮大起来。',
            '我们即将展开一场大战，你要加入我们吗？',
        ],
        ice: [
            '我们是蛮力的{townDesc}。',
            '最近一段时间，{oppoDesc}已经在南面占领了大片沙漠，并建立了一个营地。',
            '我怀疑他们是不是在谋划什么你想象不到的可怕事情。',
            '我们必须去消灭{oppoDesc}！我们不能让这些家伙的势力壮大起来。',
            '我们即将展开一场大战，你要加入我们吗？',
        ],
        abilityIce: '{townDesc}擅长格斗攻击，你能够习得‘嗜血’能力',
        abilityFire: '{townDesc}擅长魔法攻击，你能够习得‘吸收’能力',
        skillBlood: '嗜血',
        skillAbsorb: '吸收',
        gainSkillPre: '你获得了技能[',
        gainSkillPost: ']。',
        supplies: '现在我将授予你战争的给养。',
    },
    // 覆面忍者
    thief: {
        gift: '感激不尽，兄弟！我给你一个我的最得意的装备作为谢礼..',
        selfAsk: '这是你自找的...',
        gotTreasure1: '嗨，多亏你的帮助，我拿到了这个宝物。',
        gotTreasure2: '它散发着金色的光辉，肯定是古董错不了！',
        spotted: '他也发现了我们！',
    },
    // 转生
    reincarnation: {
        warn: '选择转生，你将失去当前(90%)的(非天赋)技能以及物品。',
        chooseHint: '从以下天赋中选择一项进行转生。',
    },
    // 魔王
    boss: {
        return: '我会回来哒！！！',
        appearPre: '邪恶大魔王',
        appearPost: '出现了！',
        sealNeed: '你需要一些魂晶石才能打破魔王的封印。。。',
    },
    // 一段式剧情事件（EventComponent 内联块）
    event: {
        miner: {
            paragraphs: ['我们的矿洞有大量的矿石资源。', '你也要加入我们吗？'],
            placePre: '采矿小分队标出了',
            place: '矿洞',
            placePost: '的位置。',
        },
        trade: {
            paragraphs: ['你好，我们正准备在这个偏僻的小镇设置集市。', '希望能方便大家交换物品。'],
            placePre: '商队标出了',
            place: '集市',
            placePost: '的位置。',
        },
        giveScroll: {
            paragraphs: ['你好勇士，前方就是地牢了。', '地牢坑爹的设定是,你不能随时回去。', '别担心，我送你一个回城卷轴，祝你玩的愉快...'],
        },
        santa: {
            paragraphs: ['嗨，圣诞快乐！', '拿好你的礼物不要掉了！'],
        },
        huntIntro: {
            paragraphs: ['这里一很多小兔子，但要小心那些老鹰。', '对付它们最好带上一把猎枪。', '这些是我今天的猎物，很乐意与你分享：'],
        },
        robberQuestGet: {
            paragraphs: ['几个星期前，一个离开家去远处采草药，被盗贼袭击了', '小镇因此被整得人心惶惶。', '你能帮我去贼窝解决掉一些贼吗？', '贼窝有很多赃物，如果你能整治盗贼，那些当然都归你了。'],
            placePre: '村长标记出',
            place: '贼窝',
            placePost: '的位置。',
        },
        spiderQuestGet: {
            paragraphs: ['村子的侦察兵报告说周边地区充斥着可怕的蜘蛛，并且已经建立了自己的巢穴。', '你能帮我去蜘蛛巢穴解决掉蛛魔的首领吗？'],
            placePre: '村长标记出',
            place: '蜘蛛巢穴',
            placePost: '的位置。',
        },
        dragonQuestGet: {
            paragraphs: ['我们接到越来越多的报告，邪恶的龙群正在滋扰附近的地区。', '我给那些畜牲挂了悬赏。但我相信，只有你能阻止它们。'],
            placePre: '村长标记出',
            place: '龙之峡谷',
            placePost: '的位置。',
        },
    },
    // 交易对话
    trade: {
        notEnough1: '这不够，再多给点。',
        notEnough2: '拜托...再多给一点...',
        deal1: '好吧，那么。。成交？',
        givePre: '我可以给你({amount})个',
        givePost: '...',
        exclusivePre: '这本',
        exclusivePost: '凝聚了我的真传，你得给我很多东西来换它。',
        bringPre: '我给你带来了一些',
        bringPost: '，感兴趣吗？',
        noMorePre: '我没有更多的',
        noMorePost: '了，伙计。',
        leave: '{traderName}扬长而去...',
    },
    // 集市列表
    tradeList: {
        empty: '一个人也没有...',
    },
};
