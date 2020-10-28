import {STREAM_STARTED, STREAM_STARTING, STREAM_STOPPED, STREAM_STOPPING} from "./StreamStatuses";

let L_INPUT;
let L_OUTPUT;

let currentKey = null;
let previewKey = null;

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
        if (note >= 81 && note <= 88) {
            this._obs.selectPreviewScene(`1.${note % 10}.`);
        } else if (note >= 71 && note <= 78) {
            this._obs.selectPreviewScene(`2.${note % 10}.`);
        } else if (note >= 61 && note <= 68) {
            this._obs.selectPreviewScene(`3.${note % 10}.`);
        } else if (note >= 51 && note <= 58) {
            this._obs.selectPreviewScene(`4.${note % 10}.`);
        } else if (note >= 41 && note <= 48) {
            this._obs.selectPreviewScene(`5.${note % 10}.`);
        } else if (note >= 31 && note <= 38) {
            this._obs.selectPreviewScene(`6.${note % 10}.`);
        } else if (note >= 21 && note <= 28) {
            this._obs.selectPreviewScene(`7.${note % 10}.`);
        } else if (note >= 11 && note <= 18) {
            this._obs.selectPreviewScene(`8.${note % 10}.`);
        } else if (note === 111) {
            this._obs.startStopStreaming();
        } else if (note === 49) {
            this._obs.switchSceneWithTransition("1.");
        } else if (note === 39) {
            this._obs.switchSceneWithTransition("2.");
        } else if (note === 29) {
            this._obs.switchSceneWithTransition("3.");
        } else if (note === 19) {
            this._obs.switchSceneWithTransition("4.");
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
