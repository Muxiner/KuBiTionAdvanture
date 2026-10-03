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
    refreshLocalSaves: function () {
        this.setState({ localSaves: this.context.getLocalSaves() });
    },
    slotName: function (slot) {
        return slot == LOCAL_SAVE_AUTO_SLOT ? '自动存档' : ('第' + slot + '号');
    },
    handleLocalSave: function (slot) {
        //不使用原生 confirm，避免浏览器弹窗节流导致无法重复保存
        if (this.context.saveLocal(slot)) {
            this.refreshLocalSaves();
            this.setState({ saveMsg: this.slotName(slot) + '保存成功' });
        } else {
            this.setState({ saveMsg: this.slotName(slot) + '保存失败' });
        }
    },
    handleLocalLoad: function (slot) {
        var saves = this.context.getLocalSaves();
        if (!saves[slot]) {
            this.setState({ saveMsg: '该存档位是空的...' });
            return;
        }
        this.context.loadLocal(slot);
    },
    handleLocalDelete: function (slot) {
        if (confirm('确定删除' + this.slotName(slot) + '存档吗？')) {
            this.context.deleteLocal(slot);
            this.refreshLocalSaves();
            this.setState({ saveMsg: this.slotName(slot) + '已删除' });
        }
    },
    upload: function () {
        this.context.upload();
    },
    download: function () {
        this.context.download();
    },
    handleChange: function (type, sender) {
        var obj = sender.nativeEvent.srcElement ? sender.nativeEvent.srcElement : sender.nativeEvent.target;
        var value = (obj.value);
        var settings = this.context.settings;
        settings['save_' + type] = value;
        this.context.setStateFromChildren({ settings: settings });
    },
    handleAuto: function () {
        var settings = this.context.settings;
        settings['autoSave'] = !settings['autoSave'];
        this.context.setStateFromChildren({ settings: settings });
    },
    willUpload: function () {
        //不使用原生 confirm，避免浏览器弹窗节流导致无法重复保存
        this.context.upload(true, function (ok, reason) {
            this.setState({ saveMsg: ok ? '账号保存成功' : ('账号保存失败' + (reason ? '（' + reason + '）' : '')) });
        }.bind(this));
    },
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
                    if (this.context.currentScene != 'home') warns.push('在家才能保存哦。。。');
                    if (getLength(this.context.mstState) != 0) warns.push('战斗中不能保存哦。。。');
                    if (this.context.robberSaveData.robber) warns.push('你正处于危险之中。。。');
                    if (warns.length == 0) return null;
                    return <div className='settingsRow settingsWarn'>
                        {warns.map(function (w, i) { return <span key={i}>{w}</span> })}
                    </div>;
                }.bind(this)()}
                <div className='settingsRow'>
                    <BtnComponent disabled={!canSaveRemote} handleClick={this.willUpload}>保存</BtnComponent>
                    <BtnComponent handleClick={this.download}>读取</BtnComponent>
                </div>
                <div className='settingsRow settingsStatus'>{this.state.saveMsg}</div>
                <div className='settingsRow settingsTitle'>自动存档</div>
                {function () {
                    var self = this;
                    var canSave = canSaveRemote;
                    var localSaves = this.state.localSaves || this.context.getLocalSaves();
                    var seasonName = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
                    function makeRow(slot, label) {
                        var save = localSaves[slot];
                        var desc = save
                            ? ((save.generation ? '轮回' + save.generation + ' ' : '') + (seasonName[save.season] || '') + '第' + save.day + '日')
                            : '空存档';
                        return (
                            <div key={'localSave' + slot} className='settingsRow localSaveRow'>
                                <span className='localSaveDesc'>{label + ' ' + desc}</span>
                                <BtnComponent disabled={!canSave} handleClick={self.handleLocalSave.bind(self, slot)}>保存</BtnComponent>
                                <BtnComponent disabled={!save} handleClick={self.handleLocalLoad.bind(self, slot)}>读取</BtnComponent>
                                <BtnComponent disabled={!save} handleClick={self.handleLocalDelete.bind(self, slot)}>删除</BtnComponent>
                            </div>
                        );
                    }
                    var rows = [makeRow(LOCAL_SAVE_AUTO_SLOT, '')];
                    rows.push(<div key='manualTitle' className='settingsRow settingsTitle'>本地存档</div>);
                    for (var i = 1; i <= LOCAL_SAVE_SLOTS; i++) {
                        rows.push(makeRow(i, i + '.'));
                    }
                    return rows;
                }.bind(this)()}
                <label className='settingsRow settingsCheckbox' htmlFor="autoSave">
                    <input checked={this.context.settings.autoSave} onChange={this.handleAuto} id="autoSave" type="checkbox" />
                    <span>出门时保存</span>
                </label>
                <div className='settingsRow'>
                    <BtnComponent handleClick={this.context.setVolume}>声音：{this.context.AudioEngine.on ? '开' : '关'}</BtnComponent>
                    <BtnComponent handleClick={this.setSort}>自动整理背包：{this.context.settings.sort ? '开' : '关'}</BtnComponent>
                </div>
                <div className='settingsRow'>
                    <a target="blank" href="http://1.maou.sinaapp.com/?page_id=47">作者的小站</a>
                </div>
            </div>
        )
    }
});
