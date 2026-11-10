/**
 * src/ui/menu/settingsPanel.js —— 设置面板
 * 账号存档、本地多槽存档的保存/读取/删除、自动存档与声音/整理等选项。
 * 从 NormalMenuComponent 拆出。
 */
var SettingsPanelComponent = React.createClass({
    contextTypes: {
        setStateFromChildren: React.PropTypes.func.isRequired,
        settings: React.PropTypes.object.isRequired,
        upload: React.PropTypes.func.isRequired,
        download: React.PropTypes.func.isRequired,
        saveLocal: React.PropTypes.func.isRequired,
        loadLocal: React.PropTypes.func.isRequired,
        deleteLocal: React.PropTypes.func.isRequired,
        getLocalSaves: React.PropTypes.func.isRequired,
        setVolume: React.PropTypes.func.isRequired,
        AudioEngine: React.PropTypes.object.isRequired,
        currentScene: React.PropTypes.string.isRequired,
        mstState: React.PropTypes.object.isRequired,
        robberSaveData: React.PropTypes.object.isRequired,
    },
    getInitialState: function () {
        return {
            localSaves: null,
            saveMsg: '',
        }
    },
    componentDidMount: function () {
        this.refreshLocalSaves();
    },
    // 读取全部本地存档槽信息（用于渲染列表）
    refreshLocalSaves: function () {
        this.setState({ localSaves: this.context.getLocalSaves() });
    },
    // 槽位显示名（自动存档 / 存档槽 N）
    slotName: function (slot) {
        return slot == LOCAL_SAVE_AUTO_SLOT ? '自动存档' : ('存档槽 ' + slot);
    },
    // 存档时间：06:00 / 春季（显示用）
    formatClock: function (hour) {
        var h = Math.floor(hour || 0);
        var m = Math.round((hour - h) * 60) || 0;
        return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    },
    seasonFullName: function (season) {
        return { spring: '春季', summer: '夏季', autumn: '秋季', winter: '冬季' }[season] || '';
    },
    // 存档槽完整说明：存档槽 1 · 春季 第 132 日 06:00
    slotDetail: function (slot, save) {
        if (!save) return this.slotName(slot) + ' · 空';
        var gen = save.generation ? ('轮回 ' + fmtNum(save.generation) + ' · ') : '';
        return this.slotName(slot) + ' · ' + gen + this.seasonFullName(save.season) + ' 第 ' + fmtNum(save.day) + ' 日 ' + this.formatClock(save.hour);
    },
    // 本地存档：写入指定槽位并刷新列表、回显结果
    handleLocalSave: function (slot) {
        //不使用原生 confirm，避免浏览器弹窗节流导致无法重复保存
        if (this.context.saveLocal(slot)) {
            this.refreshLocalSaves();
            this.setState({ saveMsg: '已保存到「' + this.slotName(slot) + '」：' + this.slotDetail(slot, this.context.getLocalSaves()[slot]) });
        } else {
            this.setState({ saveMsg: '「' + this.slotName(slot) + '」保存失败：浏览器存储不可用或空间已满，请清理其他存档槽后重试。' });
        }
    },
    // 本地读档：槽位为空则提示
    handleLocalLoad: function (slot) {
        var saves = this.context.getLocalSaves();
        if (!saves[slot]) {
            this.setState({ saveMsg: '「' + this.slotName(slot) + '」是空的……请先点「保存」写入，或选择其他存档槽。' });
            return;
        }
        this.context.loadLocal(slot);
    },
    // 本地删档：二次确认后删除并刷新
    handleLocalDelete: function (slot) {
        var saves = this.context.getLocalSaves();
        if (confirm('确定删除「' + this.slotName(slot) + '」吗？\n' + this.slotDetail(slot, saves[slot]) + '\n删除后无法恢复。')) {
            this.context.deleteLocal(slot);
            this.refreshLocalSaves();
            this.setState({ saveMsg: '已删除「' + this.slotName(slot) + '」' });
        }
    },
    upload: function () {
        this.context.upload();
    },
    download: function () {
        this.context.download();
    },
    // 更新账号/密码等设置项
    handleChange: function (type, sender) {
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        var value = (obj.value);
        var settings = this.context.settings;
        settings['save_' + type] = value;
        this.context.setStateFromChildren({ settings: settings });
    },
    // 切换「出门时自动保存」
    handleAuto: function () {
        var settings = this.context.settings;
        settings['autoSave'] = !settings['autoSave'];
        this.context.setStateFromChildren({ settings: settings });
    },
    // “保存”按钮被禁用的原因（避免点了没反应）
    getRemoteSaveReason: function () {
        if (this.context.currentScene != 'home') return '只能在家保存';
        if (getLength(this.context.mstState) != 0) return '战斗中不能保存';
        if (this.context.robberSaveData.robber) return '盗贼入侵中，暂时无法保存';
        return '条件不满足，暂时无法保存';
    },
    // 本地存档按钮被禁用的原因
    getLocalSaveReason: function () {
        if (this.context.currentScene != 'home') return '只能在家保存';
        if (getLength(this.context.mstState) != 0) return '战斗中不能保存';
        if (this.context.robberSaveData.robber) return '盗贼入侵中，暂时无法保存';
        return '条件不满足，暂时无法保存';
    },
    // 保存到账号（服务端），并回显成功/失败结果
    willUpload: function () {
        //不使用原生 confirm，避免浏览器弹窗节流导致无法重复保存
        this.context.upload(true, function (ok, reason) {
            this.setState({
                saveMsg: ok
                    ? '账号存档保存成功：已写入服务器（换设备登录同一账号即可读取）。'
                    : ('账号存档保存失败：' + (reason || '网络或服务器异常') + '。请检查账号密码与网络后重试。')
            });
        }.bind(this));
    },
    // 切换背包自动整理
    setSort: function () {
        var settings = this.context.settings;
        settings.sort = !settings.sort;
        this.context.setStateFromChildren({ settings: settings });
    },
    render: function () {
        var settings = this.context.settings;
        var canSaveRemote = this.context.currentScene == 'home' && (getLength(this.context.mstState) == 0) && !this.context.robberSaveData.robber;
        return (
            <div className='skillMenu settingsMenu'>
                <p className='ux-saveHelp'>
                    账号存档：跨设备（需要网络与存档服务器）｜本地存档：仅本浏览器｜自动存档：出门时自动保存
                </p>
                <div className='settingsRow settingsTitle ux-saveSection'>账号存档（跨设备，需填写账号密码）</div>
                <div className='settingsRow'>
                    <div className='settingsField'>
                        <label htmlFor="account">账号</label>
                        <input onChange={this.handleChange.bind(this, 'account')} type="text" className="form-control settingsInput" id="account" value={settings.save_account}></input>
                    </div>
                    <div className='settingsField'>
                        <label htmlFor="pass">密码</label>
                        <input onChange={this.handleChange.bind(this, 'pass')} type="password" className="form-control settingsInput" id="pass" value={settings.save_pass}></input>
                    </div>
                </div>
                {function () {
                    var warns = [];
                    if (this.context.currentScene != 'home') warns.push('当前不在家：回家后才能保存/读档');
                    if (getLength(this.context.mstState) != 0) warns.push('战斗中不能保存');
                    if (this.context.robberSaveData.robber) warns.push('盗贼入侵中：暂时无法保存');
                    if (warns.length == 0) return null;
                    return <div className='settingsRow settingsWarn'>
                        {warns.map(function (w, i) { return <span key={i}>{w}</span> })}
                    </div>;
                }.bind(this)()}
                <div className='settingsRow'>
                    <BtnComponent disabled={!canSaveRemote} disabledReason={this.getRemoteSaveReason()}
                        title='保存到账号存档：跨设备可读取；需在家且不在战斗中'
                        handleClick={this.willUpload}>保存</BtnComponent>
                    <BtnComponent handleClick={this.download}
                        title='从账号存档读取：会覆盖当前进度；请先填写账号与密码'>读取</BtnComponent>
                </div>
                <div className='settingsRow settingsStatus' role='status' aria-live='polite'>{this.state.saveMsg}</div>
                <div className='settingsRow settingsTitle ux-saveSection'>自动存档（出门时自动保存）</div>
                {function () {
                    var self = this;
                    var canSave = canSaveRemote;
                    var localSaves = this.state.localSaves || this.context.getLocalSaves();
                    var seasonName = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
                    function makeRow(slot, label) {
                        var save = localSaves[slot];
                        // 兼容旧存档的“1. 春第132日”紧凑前缀（verify 脚本依赖），后面补时间和季节
                        var compact = save
                            ? ((save.generation ? '轮回' + save.generation + ' ' : '') + (seasonName[save.season] || '') + '第' + save.day + '日')
                            : '空存档';
                        var meta = save
                            ? ('· ' + self.seasonFullName(save.season) + ' ' + self.formatClock(save.hour))
                            : '· 空（点「保存」写入当前进度）';
                        var rowTitle = save
                            ? (self.slotDetail(slot, save) + '（保存于 ' + new Date(save.savedAt || Date.now()).toLocaleString() + '）')
                            : (self.slotName(slot) + ' · 空的存档位，点「保存」写入当前进度');
                        var slotNameForTitle = self.slotName(slot);
                        return (
                            <div key={'localSave' + slot} className='settingsRow localSaveRow'>
                                <span className='localSaveDesc' title={rowTitle}>{label + ' ' + compact}</span>
                                <span className='localSaveMeta'>{meta}</span>
                                <BtnComponent disabled={!canSave} disabledReason={self.getLocalSaveReason()}
                                    title={'覆盖「' + slotNameForTitle + '」中已有进度（把当前进度写入该槽）'}
                                    handleClick={self.handleLocalSave.bind(self, slot)}>保存</BtnComponent>
                                <BtnComponent disabled={!save} disabledReason='该存档位是空的'
                                    title={'读取「' + slotNameForTitle + '」：用存档覆盖当前进度（未保存进度会丢失）'}
                                    handleClick={self.handleLocalLoad.bind(self, slot)}>读取</BtnComponent>
                                <BtnComponent disabled={!save} disabledReason='该存档位是空的'
                                    title={'删除「' + slotNameForTitle + '」：永久删除，操作前会再次确认'}
                                    handleClick={self.handleLocalDelete.bind(self, slot)}>删除</BtnComponent>
                            </div>
                        );
                    }
                    var rows = [makeRow(LOCAL_SAVE_AUTO_SLOT, '')];
                    rows.push(<div key='manualTitle' className='settingsRow settingsTitle ux-saveSection'>本地存档（仅本浏览器）</div>);
                    for (var i = 1; i <= LOCAL_SAVE_SLOTS; i++) {
                        rows.push(makeRow(i, i + '.'));
                    }
                    return rows;
                }.bind(this)()}
                <label className='settingsRow settingsCheckbox' htmlFor="autoSave" title='开启后，每次出门会自动写入「自动存档」槽'>
                    <input checked={this.context.settings.autoSave} onChange={this.handleAuto} id="autoSave" type="checkbox" />
                    <span>出门时保存</span>
                </label>
                <div className='settingsRow'>
                    <BtnComponent handleClick={this.context.setVolume} title='切换游戏音效开关'>声音：{this.context.AudioEngine.on ? '开' : '关'}</BtnComponent>
                    <BtnComponent handleClick={this.setSort} title='开启后，背包在获得物品时自动按类型整理'>自动整理背包：{this.context.settings.sort ? '开' : '关'}</BtnComponent>
                </div>
                <div className='settingsRow'>
                    <a target="blank" href="http://1.maou.sinaapp.com/?page_id=47">作者的小站</a>
                </div>
            </div>
        )
    }
});
