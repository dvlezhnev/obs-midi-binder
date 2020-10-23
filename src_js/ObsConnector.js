const KEY_TO_SCENE_MAP = new Map();
const SCENE_TO_KEY_MAP = new Map();
let TRANSITIONS = [];

export class ObsConnector {
    constructor() {
        this._connected = false;
        this.obs = new OBSWebSocket();
        this.__selfBind();
        this.__bindObsEvents()
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
            "with-transition": {name: TRANSITIONS[transitionIndex]}
        });
    }

    _tryConnect() {
        this.obs.connect({
            address: 'localhost:4444'
        }).then(this.__onObsConnected)
            .catch(this._tryConnect)
    }

    __unbindEvents() {

    }

    __selfBind() {
        this.__onErrorHandler = this.__onErrorHandler.bind(this);
        this.__onSceneListLoaded = this.__onSceneListLoaded.bind(this);
        this.__onObsConnected = this.__onObsConnected.bind(this);
        this.__onScenesChanged = this.__onScenesChanged.bind(this);
        this.__onSwitchScenes = this.__onSwitchScenes.bind(this);
        this.__onTransitionListLoaded = this.__onTransitionListLoaded.bind(this);
        this._tryConnect = this._tryConnect.bind(this);
    }

    __bindObsEvents() {
        this.obs.on('error', this.__onErrorHandler)
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
        this.obs.on('PreviewSceneChanged', console.log);
        this.obs.on('StudioModeSwitched', console.log);

    }

    __onErrorHandler(error) {
        console.error(error);
    }

    __onSceneListLoaded(scenesData) {
        KEY_TO_SCENE_MAP.clear();
        SCENE_TO_KEY_MAP.clear();
        console.log("current-scene", scenesData["current-scene"]);
        console.log("scenes", scenesData.scenes);
        scenesData.scenes.forEach(scene => {
            this.__registerScene(scene.name);
        })
    }

    __onTransitionListLoaded(transitionsData) {
        TRANSITIONS = transitionsData.transitions.map(t => t.name);
    }

    __onSwitchScenes(data) {
        console.log(data);
        this.__onCurrentSceneChanged(data.sceneName);
    }

    __onScenesChanged(event) {
        console.log(event);
        this.__reloadScenes()
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

    __onObsConnected() {
        this._connected = true;
        this.__reloadScenes();
        this.__reloadTransitions();
    }

    __reloadScenes() {
        this.obs.send("GetSceneList")
            .then(this.__onSceneListLoaded)
            .catch(this.__onErrorHandler);
    }

    __reloadTransitions() {
        this.obs.send("GetTransitionList")
            .then(this.__onTransitionListLoaded)
            .catch(this.__onErrorHandler);
    }

    __onCurrentSceneChanged(newSceneName) {
        console.log(newSceneName);
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
