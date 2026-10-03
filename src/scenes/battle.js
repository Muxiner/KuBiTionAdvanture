/**
 * src/scenes/battle.js —— 战斗系统
 * 战斗角色、选择、战斗选项与战斗主组件。
 */

var BattleCharactorComponent = React.createClass({
    getDefaultProps:function(){
        return{
            name:'',
            maxHp:100,
            currentHp:null,
            placeName:null,
            prefix:{},
        }
    },
    getPrefix:function(){
        var prefix = this.props.prefix;
        var result = [];
        for(var attr in prefix){
            result.push(<span key = {attr}>{PREFIX_DATA[attr].name}</span>);
        }
        return result;
    },
    render:function(){
        var name = this.props.name;
        var currentHp = this.props.currentHp;
        var maxHp = this.props.maxHp;
        return  <div className = "battleCharactor you">
                    <ProgressComponent addClass = 'hpProgress' addClassIn = 'hpProgressIn' current = {Math.ceil(currentHp)} max = {Math.ceil(maxHp)}/>
                    <p>{Math.ceil(currentHp)}/{Math.ceil(maxHp)}</p>
                    <p>{this.getPrefix()}{this.props.name}</p>
                </div>
    }
});
var SelectComponent = React.createClass({
    getDefaultProps:function(){
        return{
            index:0,
            handleChange:null,
            defaultV:null,
        }
    },
    handleChange:function(sender){
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        var value = obj.value;
        this.props.handleChange(this.props.index,value);
    },
    render:function(){
        return <select className = "selectpicker"  value = {ITEM_DATA[this.props.defaultV].name} onChange = {this.handleChange}>{this.props.children}</select>
    }
})
var BattleChoiceComponent = React.createClass({
    timer:null,
    contextTypes:{
        useTime             :React.PropTypes.func.isRequired,
        boxSaveData         :React.PropTypes.object.isRequired,
        defaultWeapon       :React.PropTypes.array.isRequired,
        currentEquip        :React.PropTypes.object.isRequired,
        setStateFromChildren:React.PropTypes.func.isRequired,
        playerStateUse      :React.PropTypes.func.isRequired,
        playerState         :React.PropTypes.object.isRequired,
        checkHaveResourceAll:React.PropTypes.func.isRequired,
    },
    componentWillMount:function(){
        var defaultWeapon = this.context.defaultWeapon;
        var weapons = this.getAllWeaponsInBag();
        for (var i = 0; i < 2; i++) {
            if(!weapons[defaultWeapon[i]]){
                defaultWeapon[i] = this.getFirstWeapon();
            };
        };
    },
    componentWillUnmount:function(){
        clearInterval(this.timer);
    },
    getDefaultProps:function(){
        return{
            getDamage   :null,
            mstDmg      :0,
            handleAttack:null,
            handleRun   :null,
            mst         :null,
            getChance   :null,
            getRunChance:null,
            getRequire  :null,
        }
    },
    getAllWeaponsInBag:function(){
        // 背包 + 装备栏中的武器
        var result = {};
        var bagThings = this.context.boxSaveData.bag.things;
        result['noWeapon'] = true;
        for(var attr in bagThings){
            if(ITEM_DATA[attr].type == 'weapon'){
                result[attr] = true;
            }
        }
        var currentEquip = this.context.currentEquip;
        for(var slot in currentEquip){
            var eq = currentEquip[slot];
            if(eq && ITEM_DATA[eq] && ITEM_DATA[eq].type == 'weapon'){
                result[eq] = true;
            }
        }
        return result;
    },
    getInitialState:function(){
        return {
            intervalIndex    :null,
        }
    },
    getFirstWeapon:function(){
        var allWeapon = this.getAllWeaponsInBag();
        for(var attr in allWeapon){
            var firstWeapon = attr;
            break;
        }
        return firstWeapon;
    },
    handleChange:function(index,weaponName){
        for(var attr in ITEM_DATA){
            if(ITEM_DATA[attr].name == weaponName)break;
        }
        var defaultWeapon = this.context.defaultWeapon;
        defaultWeapon[index] = attr;
        this.context.setStateFromChildren({defaultWeapon:defaultWeapon});
    },
    checkWeaponDisabled:function(selectedWeapon){
        var data = ITEM_DATA[selectedWeapon];
        var bullet = data.bullet;
        var require = data.require;
        var bag = this.context.boxSaveData.bag.things;
        if(bullet&&!bag[bullet]){
            return true;
        }
        if(require&&!this.context.checkHaveResourceAll(require)){
            return true;
        }
        return false;
    },
    getWeapon:function(index){
        var defaultWeapon = this.context.defaultWeapon;
        var weapons = this.getAllWeaponsInBag();
        var selectedWeapon = (weapons[defaultWeapon[index]] && defaultWeapon[index])||this.getFirstWeapon();
        return selectedWeapon;
    },
    handleInterval:function(index){
        if(index == this.state.intervalIndex){
            clearInterval(this.timer);
            this.setState({intervalIndex:null});
        }else{
            if(this.state.intervalIndex != null){
                clearInterval(this.timer);
            }
            this.setState({intervalIndex:index});
            this.timer = setInterval(function(){
                var selectedWeapon = this.getWeapon(this.state.intervalIndex);
                ((this.context.playerState.hp.amount > this.props.mstDmg) && (this.state.intervalIndex != null) && !this.checkWeaponDisabled(selectedWeapon))?(this.props.handleAttack(selectedWeapon)):null;
            }.bind(this),500);
        }
    },
    render:function(){
        var defaultWeapon = this.context.defaultWeapon;
        var weapons = this.getAllWeaponsInBag();
        var boxSaveData = this.context.boxSaveData;
        function getOptions(index){
            var result = [];
            for(var attr in weapons){
                result.push(<option key = {index+'_'+attr}>{ITEM_DATA[attr].name}</option>)
            }
            return result;
        }
        function getWeaponRow(index){
            var result = [];
            for (var index = 0; index < 2; index++) {
                var selectedWeapon = this.getWeapon(index);
                var chance = this.props.getChance(selectedWeapon);
                //武器类型
                var type = ITEM_DATA[selectedWeapon].weaponType;
                var typeDesc = {
                    melee:'攻击',
                    shoot:'射击',
                    magic:'施放',
                }
                //武器使用费用
                var require = this.props.getRequire(selectedWeapon);

                result.push(<tr key = {index}>
                                <td><SelectComponent defaultV = {selectedWeapon} handleChange = {this.handleChange} index = {index}>{getOptions(index)}</SelectComponent></td>
                                <td>射程优势(<span style = {{color:chance>0?COLOR.GREEN:COLOR.RED}}>{Math.ceil(chance*100)}%</span>)</td>
                                <td><RequireComponent requireList = {require}/></td>
                                <td><span className = 'damage'>{this.props.getDamage(selectedWeapon)}</span> vs <span className = 'damage'>{this.props.mstDmg}</span></td>
                                <td><BtnComponent desc = {typeDesc[type]||'攻击'} disabled = {this.checkWeaponDisabled.bind(this,selectedWeapon)()} handleRightClick = {this.handleInterval.bind(null,index)} handleClick = {this.props.handleAttack.bind(null,selectedWeapon)}/></td>
                            </tr>);
            };
            return  result;
        }
        function getRunRow(index){
                return  <tr>
                            <td></td>
                            <td colSpan = {1}>成功几率({(Math.round(this.props.getRunChance()*100))}%)</td>
                            <td></td>
                            <td><span className = 'damage'>0</span> vs <span className = 'damage'>{this.props.mstDmg}</span></td>
                            <td><BtnComponent desc = '跑路' handleClick = {this.props.handleRun}/></td>
                        </tr>
        }
        return <div>
                    <div className = "tableOuter">
                    <table className = "battleTable table table-condensed table-hover">
                        <tbody>
                        {getWeaponRow.bind(this)()}
                        {getRunRow.bind(this)()}
                        </tbody>
                    </table>
                    </div>
                </div>
    }
});
// ===== 3) 玩法模块 · 战斗 =====
// 战斗：按射程分为近战/远程/魔法，处理选择、命中、追击、掉落与胜负
var BattleComponent = React.createClass({
    //战斗的整体场景
    step:0,
    battleTurnTime : 0,
    contextTypes:{
        playerStateChange   :React.PropTypes.func.isRequired,
        playerState         :React.PropTypes.object.isRequired,
        mstStateChange      :React.PropTypes.func.isRequired,
        mstState            :React.PropTypes.object.isRequired,
        placeSaveData       :React.PropTypes.object.isRequired,
        setStateFromChildren:React.PropTypes.func.isRequired,
        useTime             :React.PropTypes.func.isRequired,
        useItem             :React.PropTypes.func.isRequired,
        callWindow          :React.PropTypes.func.isRequired,
        playerStateUse      :React.PropTypes.func.isRequired,
        showMsg             :React.PropTypes.func.isRequired,
        msgList             :React.PropTypes.array.isRequired,
        skill               :React.PropTypes.object.isRequired,
        menuHint            :React.PropTypes.number.isRequired,
        boxSaveData         :React.PropTypes.object.isRequired,
        currentEquip        :React.PropTypes.object.isRequired,
        durableSaveData     :React.PropTypes.object.isRequired,
        getMaxState         :React.PropTypes.func.isRequired,
        generation          :React.PropTypes.number.isRequired,
    },
    getDefaultProps:function(){
        return {
            mst:null,
            mstState:null,
            prefix:{},
            onWin:null,
            winScene:null,
        }
    },
    getChance:function(weapon){
        //工具攻击范围获得命中率
        var skill = this.context.skill;
        var level = (skill['agile']||0)
        var chance = 0;

        //获得装备加成
        var buff = 0;
        var currentEquip = this.context.currentEquip;
        for(var attr in currentEquip){
            var equip = currentEquip[attr];
            if(!equip)continue;
            buff += ITEM_DATA[equip].agileInc || 0;
        }

        var playerRange = ITEM_DATA[weapon].range + level*(SKILL_DATA['agile']['buff'] || 0)  + buff;
        var mstRange = this.context.mstState.range;

        //前缀加成
        var prefix = this.props.prefix;
        if(prefix.agile){
            mstRange *= 1 + PREFIX_DATA.agile.buff;
        }

        var gap = Math.abs(playerRange - mstRange);
        var chance = gap/(20+gap);
        chance = chance * (playerRange > mstRange?1:-1);
        return chance;
    },
    componentWillMount:function(){
        this.step = 0;
        if(this.context.mstState.hp!=undefined)return;
        var mst = clone(MST_DATA[this.props.mst]);

        //前缀加成
        var prefix = this.props.prefix;
        if(prefix.fat){
            mst.maxHp = Math.ceil((1 + PREFIX_DATA.fat.buff)*mst.maxHp);
        }
        for(var attr in this.props.mstState){
            mst[attr] = this.props.mstState[attr];
        }
        mst.hp = mst.hp || mst.maxHp;

        this.context.setStateFromChildren({'mstState':mst});
    },
    componentWillUnmount:function(){
        this.context.setStateFromChildren({'mstState':{}});
    },
    getRunChance:function(){
        var mst = this.props.mst;
        var chaseChance = MST_DATA[mst].chaseChance;
        if(!chaseChance)return 1;
        var currentEquip = this.context.currentEquip;
        var equipBuff = 1;
        for(var attr in currentEquip){
            if(!currentEquip[attr])continue;
            equipBuff *= (ITEM_DATA[currentEquip[attr]].runChanceMul || 1);
        }
        var result = 1 - (chaseChance * equipBuff);
        if(result < 0)result = 0;
        return result;
    },
    getDamageBuffType:function(weapon){
        var bullet = ITEM_DATA[weapon].bullet;
        return  ITEM_DATA[weapon].weaponType || (bullet?'shoot':'melee');
    },
    getPlayerDamage:function(selectedWeapon){
        var mstState = this.context.mstState;
        //获得技能加成以及装备加成
        var skill = this.context.skill;
        var type = ITEM_DATA[selectedWeapon].weaponType;
        var bullet = ITEM_DATA[selectedWeapon].bullet;
        var currentEquip = this.context.currentEquip;
        var playerState = this.context.playerState;
        var equipBuff = 0;
                var generation = this.context.generation;
        for(var attr in currentEquip){
            var equip = currentEquip[attr];
            if(!equip)continue;
            equipBuff += ITEM_DATA[equip][type + 'Mul']||0;

            //你已损失的每1%的生命值将为你增加伤害
            if(ITEM_DATA[equip]['hpTo_'+type]){
                var hp = playerState.hp.amount;
                equipBuff += ITEM_DATA[equip]['hpTo_'+type] * (1 - hp/this.context.getMaxState('hp'));
            }


            //你的每次轮回将为你增加伤害
            if(ITEM_DATA[equip]['reiToAtk']){
                equipBuff += ITEM_DATA[equip]['reiToAtk'] * (generation);
            }

        }

        //获得技能加成
        var buffType = this.getDamageBuffType(selectedWeapon);
        var skillBuff = SKILL_DATA[buffType].buff * (skill[buffType]||0);

        //获得前缀加成
        var prefix = this.props.prefix;
        var preBuff = 0;
        if(prefix.magic && ITEM_DATA[selectedWeapon].weaponType == 'magic'){
            preBuff -= PREFIX_DATA.magic.buff;
        }
        if(prefix.def && ITEM_DATA[selectedWeapon].weaponType == 'melee'){
            preBuff -= PREFIX_DATA.def.buff;
        }

        var dmg  = ITEM_DATA[selectedWeapon].damage;
        //特殊武器加成
        if(ITEM_DATA[selectedWeapon].curse){
            dmg += mstState.maxHp * ITEM_DATA[selectedWeapon].curse;
        }
        if(ITEM_DATA[selectedWeapon].reiToDmg){
            dmg += ITEM_DATA[selectedWeapon].reiToDmg * generation;
        }

        switch(selectedWeapon){
            case 'knifeStaff':
            var bag = this.context.boxSaveData.bag.things;
            var amount = 0;
            for(var attr in bag){
                amount += bag[attr] * ((attr == 'flyKnife')?1:0);
                // amount += bag[attr] * ((ITEM_DATA[attr].type == 'weapon' && ITEM_DATA[attr].weaponType == 'melee')?0.5:0);
            }
            dmg += amount>1000?1000:amount;
            break;
            case 'deadStaff':
            var bag = this.context.boxSaveData.bag.things;
            var amount = 0;
            for(var attr in bag){
                amount += bag[attr] * ((attr == 'humanMeat')?2:0);
                // amount += bag[attr] * ((ITEM_DATA[attr].type == 'weapon' && ITEM_DATA[attr].weaponType == 'melee')?0.5:0);
            }
            dmg += amount;
            break;
        }
        dmg *= (1 + skillBuff) * (1 + equipBuff) * (1 + preBuff) * (1/(mstState.hpMul || 1));
        var playerState = this.context.playerState;
        var san = playerState.san.amount / this.context.getMaxState('san');
        dmg *= Math.pow(san,0.3);

        //  龙骨剑随着耐久下降攻击也下降
        if(ITEM_DATA[selectedWeapon].durableDec){
            var durableSaveData = this.context.durableSaveData;
            var mul = durableSaveData[selectedWeapon]/ITEM_DATA[selectedWeapon].durable;
            dmg *= 1 + mul;
        }

        //天赋技能
        dmg *= (skill.fighter || 0) * SKILL_DATA.fighter.buff +1
        return Math.ceil(dmg);
    },
    getMstDamage:function(damage){
        if(this.props.mstState && this.props.mstState.dmg){
            damage = this.props.mstState.dmg;
        }
        var skill = this.context.skill;
        var level = (skill['def'])||0;
        var equipBuff = 1;
        var currentEquip = this.context.currentEquip;
        for(var attr in currentEquip){
            //防具
            var equip = currentEquip[attr];
            if(!equip)continue;

            equipBuff *= (ITEM_DATA[equip].dmgMul||1);

            //你的每1%的体力值将为你增加0.5%的防御。
            var add = 0;
            if(ITEM_DATA[equip].psToDef){
                var ps = this.context.playerState.ps.amount;
                add += ITEM_DATA[equip].psToDef * (ps)/this.context.getMaxState('ps');
            }
            equipBuff *= 1 - add;

            //轮回增加的防御。
            if(ITEM_DATA[equip].reiToDef){
                var lunhui = this.context.generation;
                equipBuff *= Math.pow((1 - ITEM_DATA[equip].reiToDef),lunhui);
            }

        }

        //前缀加成
        var prefix = this.props.prefix;
        if(prefix.atk){
            var preBuff = PREFIX_DATA.atk.buff;
        }else{
            var preBuff = 0;
        }

        var skillDecMul = Math.pow(SKILL_DATA.def.buff,level) * 0.95 + 0.05 * (10/(10 + level));
        
        var dmg  = damage * skillDecMul * (equipBuff) *(1 + preBuff);
        return Math.ceil(dmg);
    },
    getRequire:function(weapon){
        var require = clone(ITEM_DATA[weapon].require);
        var currentEquip = this.context.currentEquip;
        var buff = 1;
        for(var attr in currentEquip){
            var equip = currentEquip[attr];
            if(!equip)continue;

            if(ITEM_DATA[equip].magicCostDec && ITEM_DATA[weapon].weaponType == 'magic'){
                buff *= 1 - ITEM_DATA[equip].magicCostDec;
            }
            if(ITEM_DATA[equip].meleeCostDec && ITEM_DATA[weapon].weaponType == 'melee'){
                buff *= 1 - ITEM_DATA[equip].meleeCostDec;
            }
            if(ITEM_DATA[equip].shootCostDec && ITEM_DATA[weapon].weaponType == 'shoot'){
                buff *= 1 - ITEM_DATA[equip].shootCostDec;
            }
        }
        for(var attr in require){
            require[attr] = Math.round( (buff) * require[attr] );
        }
        return require;
    },
    handleAttack:function(weapon){
        var maxHp = this.context.mstState.maxHp;
        this.step ++ ;
        var mst = this.props.mst;
        var playerDmg = this.getPlayerDamage(weapon);
        var enermyDmg = this.getMstDamage(MST_DATA[mst].damage);
        var currentEquip = this.context.currentEquip;
        var skill = this.context.skill;
        var weaponType = ITEM_DATA[weapon].weaponType;
        var frozenArm = 0;
        for(var attr in currentEquip){
            var equip = currentEquip[attr];
            if(!equip)continue;
            frozenArm += ITEM_DATA[equip].frozenArm || 0;
        }

        var chance = this.getChance(weapon);

        var playerSuccess = Math.random() > -chance;

        var itemData = ITEM_DATA[weapon];
        var mst_feared = itemData.fear?(playerSuccess && (Math.random() < itemData.fear)):false;
        var mst_frozon = (playerSuccess &&  (itemData.frozen?(Math.random() < itemData.frozen):false))||(Math.random() < frozenArm);
        var mst_blocked = !playerSuccess && (itemData.block?(Math.random() < itemData.block):false);

        var mstSuccess = Math.random() > chance &&!(mst_frozon||mst_feared||mst_blocked);

        var timeNeed = this.battleTurnTime;
        var require = this.getRequire(weapon);

        if(playerSuccess){
            //吸取类装备效果
            var rec = {};
            var amount = playerDmg;
            var check = function(o){
                var tar = o.target;
                var buff = o.buff * amount;
                //吸取修正 12/9
                // buff = Math.pow(buff,0.5);
                rec[tar] = (rec[tar] || 0) + buff;
            }
            if(ITEM_DATA[weapon].dmgTo){
                check(ITEM_DATA[weapon].dmgTo);
            }
            for(var attr in currentEquip){
                var equip = currentEquip[attr];
                if(!equip)continue;
                if(ITEM_DATA[equip].dmgTo)check(ITEM_DATA[equip].dmgTo);
            }
            this.context.playerStateUse(rec,true);
        }

        switch(weapon){
            case 'fireStaff':
            var playerState = this.context.playerState;
            playerState.temp.amount += 10;
            if(playerState.temp.amount > 50){
                playerState.temp.amount = 50;
            }
            this.context.setStateFromChildren({playerState:playerState});
            break;
        }
        callBack.bind(this)();


        function getMstDo(){
            if(mst_feared)return <span>害怕地动弹不得！</span>;
            if(mst_frozon)return <span>被冻住了！</span>;
            if(mst_blocked)return <span>的攻击被格挡了！</span>;
            return <span>打歪了！</span>;
        }
        function getRec(){
            var result = [];
            for(var attr in rec){
                result.push(<span>你回复了<span style = {{color:COLOR.GREEN}}>{Math.round(rec[attr])}</span>点{STATE_DATA[attr].name}。</span>);
            }
            return <span key = {'rec_'+attr+this.step}>
                        {result}
                    </span>
        }
        function callBack(){
            if(require)this.context.playerStateUse(require);
            this.context.playerStateUse(o(weapon,1));
            playerSuccess?this.context.mstStateChange({hp:-playerDmg}):null;
            var show = [];
            show.push(playerSuccess?<span key = {'p_atk_'+this.step}>你造成了<span style = {{color:COLOR.GREEN}}>{playerDmg}</span>点伤害！</span>:<span key = {'p_atk_'+this.step} style = {{color:COLOR.RED}}>你打歪了！</span>);
            if(this.context.mstState.hp > 0){
                show.push(mstSuccess?<span key = {'m_atk_'+this.step}>你受到了<span style = {{color:COLOR.RED}}>{enermyDmg}</span>点伤害！</span>:<span key = {'m_atk_'+this.step} style = {{color:COLOR.GREEN}}>{MST_DATA[this.props.mst].name}{getMstDo()}</span>);
                show.push(getRec.bind(this)());
                mstSuccess?this.context.playerStateChange({hp:-enermyDmg}):null;
            }else{
                var skill = this.context.skill;
                if(skill.blood){
                    // var tar =  SKILL_DATA.blood.target;
                    var buff = SKILL_DATA.blood.buff * this.context.getMaxState('hp');
                    this.context.playerStateChange({hp:buff});
                }
                if(skill.absorb){
                    // var tar =  SKILL_DATA.absorb.target;
                    var buff = SKILL_DATA.absorb.buff * this.context.getMaxState('san');
                    this.context.playerStateChange({san:buff});
                }
                this.handleReward();
            }
            this.context.showMsg(<p key = {'atk_'+this.step}>{show}</p>);

            //弹药使用
            var bullet = ITEM_DATA[weapon].bullet;
            if(bullet)this.context.useItem(o(bullet,1));
        }
    },
    handleRun:function(){
        // this.context.setStateFromChildren({msgList:[]});
        this.step ++ ;
        var mst = this.props.mst;
        var enermyDmg = this.getMstDamage(MST_DATA[mst].damage);
        var timeNeed = this.battleTurnTime;
        this.context.useTime(callBack.bind(this),timeNeed);
        function callBack(){
            var chance = this.getRunChance();
            if(Math.random() < chance){
                this.context.callWindow(null);
            }else{
                this.context.playerStateChange({hp:-enermyDmg});
                var show = <p key = {'run_'+this.step}>逃跑失败！你收到了<span style = {{color:COLOR.RED}}>{enermyDmg}</span>点伤害！</p>;
                this.context.showMsg(show);
            }
        }
    },
    handleReward:function(){
        var skill = this.context.skill;
        var maxHp = MST_DATA[this.props.mst].maxHp;


        var luckyLevel = (skill.lucky||0)*SKILL_DATA.lucky.buff;

        // this.context.setStateFromChildren({msgList:[]});
        //处理怪物掉落
        var placeName = this.props.placeName;
        if(placeName){
            var saveData = this.context.placeSaveData;
            saveData[placeName].mst[this.props.mst].amount --;
            this.context.setStateFromChildren({placeSaveData:saveData});
        }
        //获得宝物
        var rewardList = cloneMul(MST_DATA[this.props.mst].reward,luckyLevel + 1);

        //前缀对掉宝的加成
        var prefix = this.props.prefix;
        var mul = 1 + 0.45 * getLength(prefix);
        for(var attr in rewardList){
            rewardList[attr] = Math.round(rewardList[attr] * mul);
        }

        //一定几率得到的宝物
        var chanceGet = MST_DATA[this.props.mst].chanceGet;
        for(var attr in chanceGet){
            var chance = chanceGet[attr];
            if(Math.random()<chance){
                if(rewardList[attr]){
                    rewardList[attr] += 1;
                }else{
                    rewardList[attr] = 1;
                }
            }
        }

        var wind = this.props.winScene?this.props.winScene:(
                <div>
                    <RegisterComponent willUnmount = {this.props.onWin} itemList = {rewardList}/>
                </div>
                );

        //没有奖励的情况
        // if(getLength(rewardList) == 0){
            // this.props.onWin?this.props.onWin():null;

        // }
        this.context.callWindow(wind);
    },
    render:function(){
        var mstName = this.props.mst;
        var playerHp = this.context.playerState['hp'].amount;
        var mst = this.context.mstState;
        return  <div className = "battleField">
                    <BattleCharactorComponent name = '你' maxHp = {this.context.getMaxState('hp')} currentHp = {playerHp}/>
                    &nbsp;<span className="vs">vs</span>&nbsp;
                    <BattleCharactorComponent  name = {mst.name} maxHp = {mst.maxHp} currentHp = {mst.hp} prefix = {this.props.prefix}/>
                    <BattleChoiceComponent getRequire = {this.getRequire} getRunChance = {this.getRunChance} getChance = {this.getChance} handleAttack = {this.handleAttack} handleRun = {this.handleRun} getDamage = {this.getPlayerDamage} mstDmg = {this.getMstDamage(this.context.mstState.damage)}/>
                    <MsgBox/>
                </div>
    }
});
