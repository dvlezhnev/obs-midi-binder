import {STREAM_STARTED, STREAM_STARTING, STREAM_STOPPED, STREAM_STOPPING} from "./StreamStatuses";

let L_INPUT;
let L_OUTPUT;

let currentKey = null;
let previewKey = null;
const TRANSITIONS_MAP = new Map();
const AUDIO_MAP = new Map();

export class LaunchpadConnector {
    /**
     * @param {ObsConnector} obsConnector
     */
    constructor(obsConnector) {
        this._obs = obsConnector;

        this._bindObs();
        this._onMidiAccess = this._onMidiAccess.bind(this);
        this._onMidiMessage = this._onMidiMessage.bind(this);

        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess()
                .then(this._onMidiAccess, () => {console.error('No access to your midi devices.')});
        }
    }

    _bindObs() {
        this._obs.onCurrentSceneChanged = (prev, curr) => {
            console.log("onCurrentSceneChanged", prev, curr);
            clearScene(prev);
            setPreviewScene(previewKey);
            setCurrentScene(curr);
        }
        this._obs.onPreviewSceneChanged = (prev, curr) => {
            console.log("onPreviewSceneChanged", prev, curr);
            clearScene(prev);
            setPreviewScene(curr);
            setCurrentScene(currentKey);
        }
        this._obs.onScenesListChanged = (data) => {
            clearAllScenes();
            loadScenes(data);
        }
        this._obs.onStreamStatusChanged = (status) => {
            switch (status) {
                case STREAM_STARTING:
                    L_OUTPUT.send([0xb1, 111, 122]);
                    break;
                case STREAM_STARTED:
                    L_OUTPUT.send([0xb0, 111, 122]);
                    break;
                case STREAM_STOPPING:
                    L_OUTPUT.send([0xb1, 111, 5]);
                    break;
                case STREAM_STOPPED:
                    L_OUTPUT.send([0xb0, 111, 5]);
                    break;
            }
        }
        this._obs.onTransitionListLoaded = (data) => {
            clearAllTransitions();
            loadTransitions(data);
        };

        this._obs.onAudioListLoaded = (data) => {
            clearAllAudio();
            loadAudioKeys(data);
        };

        this._obs.onAudioMuteChange = (key, state) => {
            setAudioMuteState(key, state);
        };
    }

    _onMidiAccess(MIDIAccess) {
        MIDIAccess.onstatechange = (event) => {
            this._onMidiAccessStateChange(event);
        }
        for (let input of MIDIAccess.inputs.values()) {
            if (/Launchpad/.test(input.name)) {
                console.log(1);
                L_INPUT = input;
                input.onmidimessage = this._onMidiMessage;
            }
        }
        for (let output of MIDIAccess.outputs.values()) {
            if (/Launchpad/.test(output.name)) {
                L_OUTPUT = output;
            }
        }
    }

    _onMidiAccessStateChange(data) {
        console.log(data.port);
    }

    _onMidiMessage(event) {
        const data = event.data;
        const note = data[1];
        const velocity = data[2];
        if (velocity !== 0) {
            return;
        }
        console.log(data);
        switch (true) {
            case note >= 81 && note <= 88:
                this._obs.selectPreviewScene(`1.${note % 10}.`);
                break;
            case note >= 71 && note <= 78:
                this._obs.selectPreviewScene(`2.${note % 10}.`);
                break;
            case note >= 61 && note <= 68:
                this._obs.selectPreviewScene(`3.${note % 10}.`);
                break;
            case note >= 51 && note <= 58:
                this._obs.selectPreviewScene(`4.${note % 10}.`);
                break;
            case note >= 41 && note <= 48:
                this._obs.selectPreviewScene(`5.${note % 10}.`);
                break;
            case note >= 31 && note <= 38:
                this._obs.selectPreviewScene(`6.${note % 10}.`);
                break;
            case note >= 21 && note <= 28:
                this._obs.selectPreviewScene(`7.${note % 10}.`);
                break;
            case note >= 11 && note <= 18:
                this._obs.selectPreviewScene(`8.${note % 10}.`);
                break;
            case note === 111:
                this._obs.startStopStreaming();
                break;
            case note === 49:
            case note === 39:
            case note === 29:
            case note === 19:
                if (TRANSITIONS_MAP.has(note)) {
                    this._obs.switchSceneWithTransition(TRANSITIONS_MAP.get(note));
                }
                break;
            case note === 89:
            case note === 79:
            case note === 69:
            case note === 59:
                console.log(AUDIO_MAP);
                if (AUDIO_MAP.has(note)) {
                    this._obs.muteUnmuteAudio(AUDIO_MAP.get(note));
                }
                break;

        }
    }
}

/**
 * @param {string} key
 */
function clearScene(key) {
    if (!key) {
        return;
    }
    const k = key.split(".");
    const line = parseInt(k[0]);
    const column = parseInt(k[1]);
    const note = (8 - line + 1) * 10 + column;
    L_OUTPUT.send([0x90, note, 36]);
}

/**
 * @param {string} key
 */
function setPreviewScene(key) {
    if (!key) {
        return;
    }
    previewKey = key;
    const k = key.split(".");
    const line = parseInt(k[0]);
    const column = parseInt(k[1]);
    const note = (8 - line + 1) * 10 + column;
    L_OUTPUT.send([0x90, note, 122]);
}

/**
 * @param {string} key
 */
function setCurrentScene(key) {
    if (!key) {
        return;
    }
    currentKey = key;
    const k = key.split(".");
    const line = parseInt(k[0]);
    const column = parseInt(k[1]);
    const note = (8 - line + 1) * 10 + column;
    L_OUTPUT.send([0x90, note, 5]);
}

/**
 *
 * @param {Array<string>} data
 */
function loadScenes(data) {
    data.forEach(key => {
        const k = key.split(".");
        const line = parseInt(k[0]);
        const column = parseInt(k[1]);
        const note = (8 - line + 1) * 10 + column;
        L_OUTPUT.send([0x90, note, 36]);
    })
}

function clearAllScenes() {
    if (L_OUTPUT) {
        for (let i = 0; i < 17; i++) {
            for (let j = 1; j <= 8; j++) {
                for (let k = 1; k <= 8; k++) {
                    L_OUTPUT.send([0x90 + i, j * 10 + k, 0]);
                }
            }
        }
    }
}

function clearAllTransitions() {
    TRANSITIONS_MAP.clear();
    if (L_OUTPUT) {
        for (let i = 0; i < 4; i++) {
            L_OUTPUT.send([0x90, 19 + i * 10, 0]);
        }
    }
}

/**
 * @param {Array<string>} data
 */
function loadTransitions(data) {
    console.log(data);
    data.sort().slice(0, 4).forEach((key, i) => {
        let note = 19 + i * 10;
        if (!i) {
            L_OUTPUT.send([0x90, note, 36]);
        } else {
            L_OUTPUT.send([0x90, note, 100]);
        }
        TRANSITIONS_MAP.set(note, key);
    })
}

function clearAllAudio() {
    if (L_OUTPUT) {
        for (let i = 0; i < 4; i++) {
            L_OUTPUT.send([0x90, 59 + i * 10, 0]);
        }
    }
}

function setAudioMuteState(key, state) {
    const i = parseInt(key);
    if (i < 5) {
        const note = 49 + (5 - i) * 10;
        const velocity = state ? 5 : 122;
        L_OUTPUT.send([0x90, note, velocity]);
    }
}

/**
 * @param {Array<string>} data
 */
function loadAudioKeys(data) {
    console.log(data);
    data.sort().slice(0, 4).forEach((key, i) => {
        let note = 59 + (3 - i) * 10;
        AUDIO_MAP.set(note, key);
    })
}
