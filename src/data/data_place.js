/**
 * data_place.js —— 地图地点数据表 PLACE_DATA
 * 每个地点以 id 为键，包含：
 *   name                 地点名
 *   resource             可采集资源：things(产出)、circle(刷新速度)、timeNeed(耗时)、require(体力/工具)、action(按钮文字)、initAmount(初始量)
 *   mst                  可刷新怪物及 balancedAmount(平衡数量)
 *   things               地面可拾取物
 *   event                可触发的事件集合
 *   temp/requireEvent/science/season  温度修正 / 前置事件 / 前置科技 / 限定季节
 */
var PLACE_DATA = {
    town: {
        name: '银溪镇',
        desc: '银溪镇：可掠夺金子/宝石（需完成赏金猎人线）、拾取地面物资，并接取长者/村长任务。',
        resource: {
            tree: {
                name: '农田',
                things: { wheat: 3 },
                circle: 0.2,
                timeNeed: 1,
                action: '收集',
                require: { ps: 3 },
                initAmount: 15
            },
            part: {
                name: '垃圾堆',
                things: { part: 2 },
                circle: 0.5,
                timeNeed: 1,
                action: '收集',
                require: { ps: 2 },
                initAmount: 10,
            },

            gold: {
                name: '金子',
                things: { gold: 10 },
                circle: 1,
                timeNeed: 0.1,
                action: '掠夺',
                require: { ps: 3 },
                initAmount: 100,
                event: 'denBox'
            },
            gem: {
                name: '宝石',
                things: { gem: 10 },
                circle: 1,
                timeNeed: 0.1,
                action: '掠夺',
                require: { ps: 3 },
                initAmount: 50,
                event: 'denBox'
            },
        },
        things: {
            wood: 20,
            seed: 40,
            part: 20,
        },
        mst: {},
        event: {
            trade: true,
            miner: true,
            farmer_1: true,
            farmer_2: true,
            farmer_3: true,
            farmer_end: true,
            robberQuestGet: true,
            robberQuest: true,
            spiderQuestGet: true,
            spiderQuest: true,
            dragonQuestGet: true,
            dragonQuest: true,
            misteryQuest_1: true,
            misteryQuest_2: true,
            misteryQuest_3: true,
            gulf: true,
        },
        requireEvent: 'tramp',
        timeNeed: 0.5
    },
    upgradePlace: {
        name: '学院',
        desc: '学院：花金币向 7 位导师学习近战/远程/魔法/防御/射程/种植/酿酒，每项技能上限 30 级。',
        timeNeed: 1,
        science: 'upgradePlace',
    },
    forest: {
        event: {
            tramp: true
        },
        name: '静谧森林',
        desc: '静谧森林：砍树得木头/树皮，采浆果/草药；可狩猎藤鞭怪与麻雀。',
        resource: {
            tree: {
                name: '树',
                things: { bark: 2, wood: 5 },
                circle: 0.5,
                timeNeed: 1,
                action: '砍',
                require: { ps: 5, axe: 1 },
                initAmount: 30
            },
            fruitCluster: {
                name: '浆果丛',
                things: { fruit: 3 },
                circle: 0.1,
                timeNeed: 0.5,
                action: '收获',
                require: { ps: 3 },
                initAmount: 10
            },
            herbCluster: {
                name: '草药丛',
                things: { herb: 3 },
                circle: 0.1,
                timeNeed: 0.5,
                action: '收获',
                require: { ps: 3 },
                initAmount: 10
            },

        },
        mst: {
            scaryFlower: {
                balancedAmount: 15
            },
            butterFly: {
                balancedAmount: 12
            },
        },
        things: {
            wood: 20,
            fruit: 20,
            flower: 20,
            seed: 30,
            bark: 10,
        },
        timeNeed: 1
    },
    river: {
        name: '溪流',
        desc: '溪流：取水、砍树、采猛毒花棘（毒根/种子）；可狩猎乌鸦。',
        resource: {
            tree: {
                name: '树',
                things: { bark: 2, wood: 5 },
                circle: 0.3,
                timeNeed: 1,
                action: '砍',
                require: { ps: 5, axe: 1 },
                initAmount: 15
            },
            brook: {
                name: '小溪',
                things: { water: 4 },
                circle: 0.3,
                timeNeed: 1,
                action: '取水',
                require: { ps: 5 },
                initAmount: 40
            },
            flowerCluster: {
                name: '猛毒花棘',
                things: { flower: 3, seed: 3, poizonRoot: 1 },
                circle: 0.2,
                timeNeed: 0.5,
                action: '收获',
                require: { ps: 3 },
                initAmount: 10
            }
        },
        things: {
            water: 20,
            fruit: 20,
            poizonRoot: 10,
            flower: 8,
            seed: 8,
        },
        mst: {
            crow: {
                balancedAmount: 15
            },
        },
        timeNeed: 2,
        event: {
            map_1: true,
            map_2: true,
            map_3: true,
            map_4: true,
        }
    },
    robberPlace: {
        name: '贼窝',
        desc: '贼窝：搜刮赃物与线索，击败盗贼推进赏金猎人任务；可触发覆面忍者事件。',
        pickDesc: '搜刮',
        resource: {
            brook: {
                name: '赃物',
                things: { gold: 1 },
                circle: 0.1,
                timeNeed: 1,
                action: '偷窃',
                require: { ps: 2 },
                initAmount: 5
            },
            traces: {
                name: '线索',
                things: { traces: 1 },
                circle: 0.1,
                timeNeed: 2,
                action: '调查',
                require: { ps: 10 },
                initAmount: 5,
            },
        },
        pickDesc: '偷窃',
        things: {
            gold: 5,
            meat: 8,
        },
        mst: {
            robber: {
                balancedAmount: 25
            },
            robberHead: {
                balancedAmount: 1
            },
        },
        event: {
            thief: 1,
            thief_1: 1,
            thief_2: 1,
            police_1: 1,
        },
        huntDesc: '制裁',
        requireEvent: 'robberQuestGet',
        timeNeed: 1,
    },
    den: {
        name: '地下通道',
        desc: '地下通道：用线索开启机关，最终取得「偷窃宝典」后可掠夺银溪镇。',
        pickDesc: '搜刮',
        timeNeed: 1.5,
        mst: {
            robber_1: {
                balancedAmount: 100
            },
            robber_2: {
                balancedAmount: 5
            },
            robber_3: {
                balancedAmount: 1
            },
        },
        event: {
            traces_1: 1,
            traces_2: 1,
            traces_3: 1,
            part_1: 1,
            part_2: 1,
            denBox: 1,
        },
        requireEvent: 'police_1',
    },

    mine: {
        name: '幽暗的矿洞',
        desc: '幽暗的矿洞：挖铁块/硝石/金子/宝石（需铁镐）；采矿小分队可用面包换铁。',
        resource: {
            ironMine: {
                name: '铁矿',
                things: { iron: 5 },
                circle: 0.3,
                count: 0,
                timeNeed: 2,
                action: '开采',
                require: { ps: 5, pickaxe: 1 },
                initAmount: 20,
            },
            saltpeterMine: {
                name: '硝石',
                things: { saltpeter: 5 },
                circle: 0.3,
                timeNeed: 2,
                action: '开采',
                require: { ps: 5, pickaxe: 1 },
                initAmount: 20,
            },
            gold: {
                name: '金',
                things: { gold: 2 },
                circle: 0.1,
                timeNeed: 3,
                action: '开采',
                require: { ps: 10, pickaxe: 1 },
                initAmount: 20,
            },
            gem: {
                name: '宝石',
                things: { gem: 1 },
                circle: 0.05,
                count: 0,
                timeNeed: 5,
                action: '开采',
                require: { ps: 10, pickaxe: 1 },
                initAmount: 4,
            },
        },
        mst: {
        },
        event: {
            minerFood: true
        },
        things: {
            wood: 25,
            iron: 25,
            saltpeter: 15,
        },
        timeNeed: 2,
        requireEvent: 'miner',
    },
    mountain: {
        name: '冰冻荒原',
        desc: '冰冻荒原：采冰露、地洞胡萝卜、干草；可狩猎兔子/老鹰/野牛。',
        resource: {
            ice: {
                name: '冰露',
                things: { ice: 4 },
                circle: 0.1,
                timeNeed: 1,
                action: '采集',
                require: { ps: 5 },
                initAmount: 12
            },
            rabbitHole: {
                name: '地洞',
                things: { carrot: 3 },
                circle: 0.1,
                timeNeed: 2,
                action: '挖掘',
                require: { ps: 3, shovel: 1 },
                initAmount: 20
            },
            hayCrop: {
                name: '干草丛',
                things: { hay: 6 },
                circle: 0.1,
                timeNeed: 2,
                action: '收获',
                require: { ps: 10 },
                initAmount: 20
            },
        },
        mst: {
            rabbit: {
                balancedAmount: 12
            },
            eagle: {
                balancedAmount: 8
            },
            bull: {
                balancedAmount: 4
            },
        },
        event: {
            huntIntro: true,
        },
        things: {
            hay: 50,
        },
        timeNeed: 3,
        requireEvent: 'map_1'
    },
    spiderPlace: {
        name: '蜘蛛巢穴',
        desc: '蜘蛛巢穴：收集蜘蛛卵；击败蛛魔之后推进村长任务链。',
        resource: {
            brook: {
                name: '蜘蛛卵群',
                things: { spiderEgg: 1 },
                circle: 0.1,
                timeNeed: 1,
                action: '偷窃',
                require: { ps: 1 },
                initAmount: 20
            },
        },
        things: {
            spiderEgg: 20,
            teeth: 20,
            humanMeat: 2,
            bone: 12,
            meat: 8,
        },
        mst: {
            spider: {
                balancedAmount: 2
            },
            bigSpider: {
                balancedAmount: 1
            },
        },
        requireEvent: 'spiderQuestGet',
        timeNeed: 2,
    },
    blackForest: {
        name: '黑森林',
        desc: '黑森林：枯树/荆棘/火草；可狩猎灰熊/秃鹫。',
        resource: {
            oldTree: {
                name: '枯树',
                things: { bark: 4, wood: 2 },
                circle: 0.1,
                timeNeed: 2,
                action: '收获',
                require: { ps: 3 },
                initAmount: 20
            },
            rootCrop: {
                name: '荆棘丛',
                things: { clawRoot: 2 },
                circle: 0.1,
                timeNeed: 2,
                action: '收获',
                require: { ps: 3 },
                initAmount: 10
            },
            fire: {
                name: '火草',
                things: { fire: 2 },
                circle: 0.1,
                timeNeed: 2,
                action: '收获',
                require: { ps: 3 },
                initAmount: 10
            },
        },
        mst: {
            bear: {
                balancedAmount: 8
            },
            vulture: {
                balancedAmount: 8
            }
        },
        things: {
            part: 20,
            iron: 20,
            saltpeter: 20,
            bone: 20,
            clawRoot: 10,
        },
        timeNeed: 3,
        requireEvent: 'map_1',
    },
    iceberg: {
        name: '漂浮的冰川',
        desc: '漂浮的冰川（仅冬季开放）：取水/采冰露；可狩猎企鹅/北极熊。',
        resource: {
            tree: {
                name: '冰川',
                things: { water: 6 },
                circle: 0.1,
                timeNeed: 1,
                action: '开采',
                require: { ps: 5, pickaxe: 1 },
                initAmount: 10
            },
            ice: {
                name: '冰露',
                things: { ice: 3 },
                circle: 0.1,
                timeNeed: 1,
                action: '获取',
                require: { ps: 3 },
                initAmount: 10
            },
        },
        mst: {
            penguin: {
                balancedAmount: 15
            },
            polarBear: {
                balancedAmount: 3
            },
        },
        temp: -10,
        things: {
            water: 10,
            iceHeart: 2,
        },
        event: {
        },
        timeNeed: 5,
        season: 'winter',
    },
    swamp: {
        name: '遥远的湿地',
        desc: '遥远的湿地：采肥料、胡萝卜/生菜/浆果；可触发酒仙与地精任务。',
        resource: {
            shit: {
                name: '肥沃的泥土',
                things: { fertilizer: 4 },
                circle: 0.1,
                timeNeed: 1,
                action: '开采',
                require: { ps: 2, shovel: 1 },
                initAmount: 20
            },
        },
        things: {
            carrot: 10,
            veg: 10,
            fruit: 10,
            seed: 20,
        },
        mst: {
            creeper: {
                balancedAmount: 10
            },
        },
        timeNeed: 3,
        event: {
            drinker_1: true,
            drinker_2: true,
            drinker_3: true,
            drinker_4: true,
            drinker_end: true,
            goblin: true,
        },
        requireEvent: 'map_2',
    },
    goblinTown: {
        name: '地精村庄',
        desc: '地精村庄：零件/雕像；完成地精工匠任务链可解锁车床等科技。',
        resource: {
            shit: {
                name: '零件堆',
                things: { part: 3 },
                circle: 0.2,
                timeNeed: 0.5,
                action: '拾取',
                require: { ps: 1 },
                initAmount: 20
            },
            woodStatue: {
                name: '木雕',
                things: { woodStatue: 5 },
                circle: 1,
                timeNeed: 0.1,
                action: '掠夺',
                require: { ps: 3 },
                initAmount: 35,
                event: 'denBox'
            },
            ironStatue: {
                name: '铁像',
                things: { ironStatue: 5 },
                circle: 1,
                timeNeed: 0.1,
                action: '掠夺',
                require: { ps: 3 },
                initAmount: 35,
                event: 'denBox'
            },
        },
        timeNeed: 4,
        things: {
            part: 40,
            wood: 20,
            iron: 20,
            gold: 5,
            ironStatue: 4,
            woodStatue: 4,
            beer: 5
        },
        event: {
            goblin_1: true,
            goblin_2: true,
            goblin_3: true,
            goblin_4: true,
            goblin_5: true,
            goblin_end: true,
        },
        requireEvent: 'goblin'
    },
    grave: {
        name: '墓穴',
        desc: '墓穴：挖骨头/花/金子（需铲子，消耗精神）；可触发可疑的祭坛。',
        pickDesc: '盗墓',
        pickRequire: { san: 3, shovel: 1 },
        resource: {
            tombstone: {
                name: '墓碑',
                things: {
                    bone: 3,
                    flower: 1,
                    gold: 2,
                },
                circle: 0.1,
                timeNeed: 4,
                action: '挖掘',
                require: { ps: 20, shovel: 1 },
                initAmount: 20
            },
        },
        things: {
            part: 20,
            wood: 20,
            teeth: 5,
            bone: 20,
            gold: 20,
            ironStatue: 8,
            woodStatue: 8,
        },
        mst: {
            wolf: {
                balancedAmount: 10
            },
        },
        event: {
            graveEvent: true,
        },
        timeNeed: 4,
        requireEvent: 'map_3'
    },
    ice: {
        name: '食人氏族',
        desc: '食人氏族（战争营地）：加入后可换取装备/金币；烹饪锅可取熟食（需体力）。',
        pickDesc: '拾取',
        huntDesc: '干掉食人魔！',
        thingsDesc: '部落给养',
        pickDesc: '拾取',
        resource: {
            meat: {
                name: '烹饪锅',
                things: { humanCook: 1 },
                circle: 0.2,
                timeNeed: 0.5,
                action: '拿取',
                require: { ps: 5 },
                initAmount: 10
            },
        },
        things: {
            humanCook: 5,
            meat: 10,
            humanMeat: 10,
            hamburger: 5,
        },
        mst: {
            ice: {
                balancedAmount: 100
            },
            iceNinja: {
                balancedAmount: 5
            },
            iceMaster: {
                balancedAmount: 1
            },
        },
        event: {
            iceTownEvent: true,
            iceTownEvent_1: true,
            iceTownEvent_2: true,
            iceTownEvent_3: true,
            iceTownEvent_end: true,
        },
        timeNeed: 4,
        requireEvent: 'map_3'
    },
    fire: {
        name: '法师公会',
        desc: '法师公会（战争营地）：加入后可换取装备/金币；烤架可取魔法面包（需体力）。',
        pickDesc: '拾取',
        huntDesc: '干掉法师！',
        thingsDesc: '餐桌',
        pickDesc: '拾取',
        resource: {
            crystal: {
                name: '烤架',
                things: { magicBread: 1 },
                circle: 0.2,
                timeNeed: 0.5,
                action: '拿取',
                require: { ps: 5 },
                initAmount: 10
            },
        },
        things: {
            bread: 18,
            sandwich: 5,
            paper: 5,
            beer: 5,
        },
        mst: {
            fire: {
                balancedAmount: 100
            },
            fireSage: {
                balancedAmount: 5
            },
            fireMaster: {
                balancedAmount: 1
            },
        },
        event: {
            fireTownEvent: true,
            fireTownEvent_1: true,
            fireTownEvent_2: true,
            fireTownEvent_3: true,
            fireTownEvent_end: true,
        },
        timeNeed: 4,
        requireEvent: 'map_3'
    },
    ruins: {
        name: '古老的废墟',
        desc: '古老的废墟：零件/水；可狩猎机械士兵/神秘雕像。',
        resource: {
            ruins: {
                name: '废墟聚集处',
                things: { part: 6 },
                circle: 0.2,
                timeNeed: 4,
                action: '发掘',
                require: { ps: 10 },
                initAmount: 20
            },
            fountain: {
                name: '远古喷泉',
                things: { water: 8 },
                circle: 0.3,
                timeNeed: 0.2,
                action: '获取',
                require: { ps: 10 },
                initAmount: 20
            },
        },
        things: {
            iron: 20,
            part: 20,
            wood: 10,
            bone: 5,
            seed: 10,
        },
        mst: {
            machine: {
                balancedAmount: 3
            },
            idolum: {
                balancedAmount: 4
            },
        },
        event: {
            // blessingOverhang,
        },
        timeNeed: 4,
        requireEvent: 'map_3'
    },
    dragon: {
        name: '龙之峡谷',
        desc: '龙之峡谷：龙骨/干草；可狩猎幼龙/光龙/暗龙/龙王（龙王掉龙鳞与龙王之首）。',
        resource: {
            // fountain:{
            //     name:'山阴',
            //     things:{water:3},
            //     circle:0.5,
            //     timeNeed:0.2,
            //     action:'获取',
            //     require:{ps:10},
            //     initAmount:20
            // },
        },
        things: {
            hay: 20,
            dragonBone: 20,
            humanMeat: 2,
            bone: 5,
        },
        mst: {
            dragon: {
                balancedAmount: 20
            },
            lightDragon: {
                balancedAmount: 5
            },
            darkDragon: {
                balancedAmount: 5
            },
            dragonKing: {
                balancedAmount: 1
            },
        },
        event: {
            // blessingOverhang,
        },
        timeNeed: 4,
        requireEvent: 'dragonQuestGet'
    },
    gulf: {
        name: '藏宝湾',
        desc: '藏宝湾：钓鱼/水母；可狩猎海盗/海妖/海蛇，接水手任务。',
        resource: {
            fish: {
                name: '鱼',
                things: { fish: 1 },
                circle: 0.2,
                timeNeed: 0.2,
                action: '抓',
                require: { ps: 2 },
                initAmount: 10
            },
            jellyfish: {
                name: '水母',
                things: { jellyfish: 1 },
                circle: 0.1,
                timeNeed: 0.5,
                action: '抓',
                require: { ps: 2, hp: 2 },
                initAmount: 10
            },
        },
        things: {
            gold: 20,
            gem: 4,
            bone: 20,
            beer: 10,
            fruitAlco: 5,
        },
        mst: {
            pirate: {
                balancedAmount: 10,
            },
            siren: {
                balancedAmount: 10,
            },
            seaSnake: {
                balancedAmount: 10,
            },
        },
        event: {
        },
        timeNeed: 4,
        requireEvent: 'dragonQuest'
    },
    dunguen: {
        name: '地牢入口',
        desc: '地牢入口：进入地牢（每步 2 小时，下楼消耗钥匙）；第 32 层可通关，深处可遇转生之石/魔王。',
        things: {
            bone: 20,
        },
        resource: {},
        timeNeed: 5,
        requireEvent: 'map_4',
        entry: 'dungeon',
        event: {
            'giveScroll': true,
            'boss': true,
            'reincarnation': true,
        }
    },
}

var myDate = new Date();
if ((myDate.getDate() == 24 || myDate.getDate() == 25) && (myDate.getMonth() == 11)) {
    PLACE_DATA.town.event.santa = true;
    var SANTA_GIFT = ({
        1: {
            security: 20,
        },
        2: {
            seafood: 10,
            boilEgg: 2,
        },
        3: {
            energyBall: 2,
            durableBall: 2,
        },
        4: {
            hotFlowerTea: 2,
            meatSoap: 4,
        },
        5: {
            vodka: 4,
            cocktail: 4,
        },
        6: {
            fruitBread: 4,
            seedBread: 4,
        },
        7: {
            fullFamilyTong: 1,
            bigHamburger: 2,
            boneMeat: 2,
        },
        8: {
            shit: 100,
        },
        9: {
            flowerBunch: 10,
        },
        10: {
            magicHat: 1,
            magicGlove: 1,
        },
        11: {
            hotFlowerTea: 5,
            hotCoffee: 5,
        },
    })[Math.ceil(Math.random() * 11)];
}
