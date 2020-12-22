import {STREAM_STARTED, STREAM_STARTING, STREAM_STOPPED, STREAM_STOPPING} from "./StreamStatuses";

const KEY_TO_SCENE_MAP = new Map();
const SCENE_TO_KEY_MAP = new Map();
const TRANSITIONS = new Map();
const AUDIO_SOURCES = new Map();
let CURRENT_SCENE_KEY = null;
let CURRENT_PREVIEW_SCENE_KEY = null;

let STREAM_STATUS = STREAM_STOPPED;

/**
 * class ObsConnector
 */
export class ObsConnector {
    constructor() {
        this._connected = false;
        this.obs = new OBSWebSocket();
        this.__selfBind();
        this.__bindObsEvents()
        this.onScenesListChanged = () => {};
        this.onPreviewSceneChanged = () => {};
        this.onCurrentSceneChanged = () => {};
        this.onStreamStatusChanged = () => {};
        this.onTransitionListLoaded = () => {};
        this.onAudioListLoaded = () => {};
        this.onAudioMuteChange = () => {};
    }

    start() {
        this._tryConnect()
    }

    stop() {
        this.obs.disconnect();
    }

    selectPreviewScene(key) {
        if (KEY_TO_SCENE_MAP.has(key)) {
            this.obs.send("SetPreviewScene", {
                "scene-name": KEY_TO_SCENE_MAP.get(key)
            });
        }
    }

    switchSceneWithTransition(transitionIndex) {
        this.obs.send("TransitionToProgram", {
            "with-transition": {name: TRANSITIONS.get(transitionIndex)}
        });
    }

    muteUnmuteAudio(audioId) {
        console.log(audioId);
        if (AUDIO_SOURCES.has(audioId)) {
            console.log(AUDIO_SOURCES);
            this.obs.send("ToggleMute", {
                "source": AUDIO_SOURCES.get(audioId)
            });
        }
    }

    startStopStreaming() {
        this.obs.send("StartStopStreaming");
    }

    _tryConnect() {
        this.obs.connect({
            address: 'localhost:4444'
        }).then(this.__onObsConnected)
            .catch(this.__onErrorHandler)
    }

    __unbindEvents() {

    }

    _fireStreamStatus() {
        console.log(STREAM_STATUS);
        this.onStreamStatusChanged(STREAM_STATUS);
    }

    __selfBind() {
        this.__onErrorHandler = this.__onErrorHandler.bind(this);
        this.__onSceneListLoaded = this.__onSceneListLoaded.bind(this);
        this.__onObsConnected = this.__onObsConnected.bind(this);
        this.__onScenesChanged = this.__onScenesChanged.bind(this);
        this.__onSwitchScenes = this.__onSwitchScenes.bind(this);
        this.__onTransitionListLoaded = this.__onTransitionListLoaded.bind(this);
        this.__onPreviewSceneInfoLoaded = this.__onPreviewSceneInfoLoaded.bind(this);
        this.__loadPreviewScene = this.__loadPreviewScene.bind(this);
        this.__onPreviewSceneChanged = this.__onPreviewSceneChanged.bind(this);
        this.__onTransitionListChanged = this.__onTransitionListChanged.bind(this);
        this._tryConnect = this._tryConnect.bind(this);

        this.__onStreamStarting = this.__onStreamStarting.bind(this);
        this.__onStreamStarted = this.__onStreamStarted.bind(this);
        this.__onStreamStopping = this.__onStreamStopping.bind(this);
        this.__onStreamStopped = this.__onStreamStopped.bind(this);

        this.__sourcesListLoaded = this.__sourcesListLoaded.bind(this);
        this.__onSourceMuteStateChanged = this.__onSourceMuteStateChanged.bind(this);
        this.__onSourceRenamed = this.__onSourceRenamed.bind(this);
    }

    __bindObsEvents() {
        this.obs.on('ConnectionClosed', () => console.log('ConnectionClosed'));
        this.obs.on('ConnectionOpened', () => console.log('ConnectionOpened'));
        this.obs.on('error', this.__onErrorHandler);
        this.obs.on('ScenesChanged', this.__onScenesChanged);
        this.obs.on('SwitchScenes', this.__onSwitchScenes);
        this.obs.on('SceneCollectionChanged', console.log);
        this.obs.on('SceneCollectionListChanged', console.log);
        ///////////////////////////////////////////////////////
        this.obs.on('SourceOrderChanged', console.log);
        this.obs.on('SceneItemAdded', console.log);
        this.obs.on('SceneItemRemoved', console.log);
        this.obs.on('SceneItemSelected', console.log);
        this.obs.on('SceneItemDeselected', console.log);
        //////////////////////////////////////////////////////////
        this.obs.on('PreviewSceneChanged', this.__onPreviewSceneChanged);
        this.obs.on('StudioModeSwitched', console.log);
        //////////////////////////////////////////////////////////
        this.obs.on('TransitionListChanged', this.__onTransitionListChanged);
        //////////////////////////////////////////////////////////
        this.obs.on('StreamStarting', this.__onStreamStarting);
        this.obs.on('StreamStarted', this.__onStreamStarted);
        this.obs.on('StreamStopping', this.__onStreamStopping);
        this.obs.on('StreamStopped', this.__onStreamStopped);

        this.obs.on('SourceMuteStateChanged', this.__onSourceMuteStateChanged);
        this.obs.on('SourceRenamed', this.__onSourceRenamed);
    }

    __onSourceMuteStateChanged(data) {
        const audioSourceId = getAudioSourceId(data.sourceName);
        if (audioSourceId) {
            this.onAudioMuteChange(audioSourceId, data.muted);
        }
    }

    __onSourceRenamed(data) {
        const newAudioSourceId = getAudioSourceId(data.newName);
        const prevAudioSourceId = getAudioSourceId(data.previousName);
        if (newAudioSourceId || prevAudioSourceId) {
            this.__reloadAudioSources();
        }
    }

    __onStreamStarting() {
        STREAM_STATUS = STREAM_STARTING;
        this._fireStreamStatus()
    }

    __onStreamStarted() {
        STREAM_STATUS = STREAM_STARTED;
        this._fireStreamStatus()
    }

    __onStreamStopping() {
        STREAM_STATUS = STREAM_STOPPING;
        this._fireStreamStatus()
    }

    __onStreamStopped() {
        STREAM_STATUS = STREAM_STOPPED;
        this._fireStreamStatus()
    }

    __onErrorHandler(error) {
        console.error(error);
    }

    __onSceneListLoaded(scenesData) {
        KEY_TO_SCENE_MAP.clear();
        SCENE_TO_KEY_MAP.clear();
        scenesData.scenes.forEach(scene => {
            this.__registerScene(scene.name);
        });
        this.onScenesListChanged(Array.from(KEY_TO_SCENE_MAP.keys()));
        this.__onCurrentSceneChanged(scenesData.currentScene);
    }

    __onTransitionListLoaded(transitionsData) {
        TRANSITIONS.clear();
        transitionsData.transitions.forEach(t => {
            this.__registerTransition(t.name);
        });
        this.onTransitionListLoaded(Array.from(TRANSITIONS.keys()));
    }

    __onSwitchScenes(data) {
        this.__onCurrentSceneChanged(data.sceneName);
    }

    __onScenesChanged(event) {
        this.__reloadScenes()
    }

    __onTransitionListChanged(event) {
        this.__reloadTransitions();
    }

    /**
     *
     * @param {string} sceneName
     * @private
     */
    __registerScene(sceneName) {
        const sceneId = getSceneId(sceneName);
        if (sceneId) {
            KEY_TO_SCENE_MAP.set(sceneId, sceneName);
            SCENE_TO_KEY_MAP.set(sceneName, sceneId);
            console.log("Scene registered", sceneId, sceneName);
        }
    }

    /**
     *
     * @param {string} transitionName
     * @private
     */
    __registerTransition(transitionName) {
        let transitionId = getTransitionId(transitionName);
        if (transitionId) {
            TRANSITIONS.set(transitionId, transitionName);
            console.log("Transition registered", transitionId, transitionName);
        } else if (transitionName.toLowerCase() === "обрезка" || transitionName.toLowerCase() === "cut") {
            TRANSITIONS.set("1", transitionName);
        }
    }

    __onObsConnected() {
        this._connected = true;
        this.__reloadScenes();
        this.__reloadTransitions();
        this.__loadPreviewScene();
        this.__enableStudioMode();
        this.__reloadAudioSources();
        this.onStreamStatusChanged(STREAM_STATUS);
    }

    __reloadScenes() {
        this.obs.send("GetSceneList")
            .then(this.__onSceneListLoaded)
            .catch(this.__onErrorHandler);
    }

    __enableStudioMode() {
        this.obs.send("EnableStudioMode").catch(e => this.__onErrorHandler(e));
    }

    __reloadTransitions() {
        this.obs.send("GetTransitionList")
            .then(this.__onTransitionListLoaded)
            .catch(this.__onErrorHandler);
    }

    __reloadAudioSources() {
        this.obs.send("GetSourcesList")
            .then(this.__sourcesListLoaded)
            .catch(this.__onErrorHandler);
    }

    __sourcesListLoaded(data) {
        AUDIO_SOURCES.clear();
        data.sources.forEach(source => {
            this.__registerAudioSource(source.name);
        });
        this.onAudioListLoaded(Array.from(AUDIO_SOURCES.keys()));
    }

    /**
     *
     * @param {string} sourceName
     * @private
     */
    __registerAudioSource(sourceName) {
        let audioSourceId = getAudioSourceId(sourceName);
        if (audioSourceId) {
            AUDIO_SOURCES.set(audioSourceId, sourceName);
            console.log("Audio source registered", audioSourceId, sourceName);

            this.obs.sendCallback("GetMute", {source: sourceName}, (error, data) => {
                if (error) return;
                this.onAudioMuteChange(audioSourceId, data.muted);
            })
        }
    }

    __onCurrentSceneChanged(newSceneName) {
        const newSceneId = getSceneId(newSceneName);
        this.onCurrentSceneChanged(CURRENT_SCENE_KEY, newSceneId);
        CURRENT_SCENE_KEY = newSceneId;
    }

    __loadPreviewScene() {
        this.obs.send("GetPreviewScene")
            .then(this.__onPreviewSceneInfoLoaded)
            .catch(this.__onErrorHandler);
    }

    __onPreviewSceneInfoLoaded(data) {
        const newSceneId = getSceneId(data.name);
        this.onPreviewSceneChanged(CURRENT_PREVIEW_SCENE_KEY, newSceneId);
        CURRENT_PREVIEW_SCENE_KEY = newSceneId;
    }

    __onPreviewSceneChanged(data) {
        const newSceneId = getSceneId(data["scene-name"]);
        this.onPreviewSceneChanged(CURRENT_PREVIEW_SCENE_KEY, newSceneId);
        CURRENT_PREVIEW_SCENE_KEY = newSceneId;
    }
}

/**
 * @param {string} sceneName
 * @return {(string|null)}
 */
function getSceneId(sceneName) {
    let parseReg = /^(([1-8])\.([1-8])\.)(.*)/;
    if (parseReg.test(sceneName)) {
        return sceneName.match(parseReg)[1];
    }
    return null;
}

/**
 * @param {string} transitionName
 * @return {(string|null)}
 */
function getTransitionId(transitionName) {
    let parseReg = /^(([1-3])\.)(.*)/;
    if (parseReg.test(transitionName)) {
        return transitionName.match(parseReg)[1];
    }
    return null;
}

/**
 * @param {string} sourceName
 * @return {(string|null)}
 */
function getAudioSourceId(sourceName) {
    let parseReg = /^(([1-4])\.audio\.)(.*)/;
    if (parseReg.test(sourceName)) {
        return sourceName.match(parseReg)[1];
    }
    return null;
}
