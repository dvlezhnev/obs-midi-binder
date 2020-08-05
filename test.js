// testing functionality

const midiStatusElement = document.getElementById("midi-status");
const sendButton = document.getElementById("button-send");
const stopButton = document.getElementById("button-stop");
const channelSelector = document.getElementById("channel-selector");
const velocitySelector = document.getElementById("velocity-selector");

if (navigator.requestMIDIAccess) {
    midiStatusElement.innerText = "Browser supports MIDI!";
    showMidiDevices();
}
else {
    midiStatusElement.innerText = "Browser NOT supports MIDI!";
}

function showMidiDevices() {
    const midiDevicesListInputElement = document.getElementById("midi-devices-input");
    let textInput = document.createElement("div");
    textInput.innerText = "Devices: Input";
    let listInput = document.createElement("ui");

    midiDevicesListInputElement.appendChild(textInput);
    midiDevicesListInputElement.appendChild(listInput);

    const midiDevicesListOutputElement = document.getElementById("midi-devices-output");
    let textOutput = document.createElement("div");
    textOutput.innerText = "Devices: Output";
    let listOutput = document.createElement("ui");

    midiDevicesListOutputElement.appendChild(textOutput);
    midiDevicesListOutputElement.appendChild(listOutput);

    navigator.requestMIDIAccess()
        .then((MIDIAccess) => {
            MIDIAccess.onstatechange = function(e) {

                // Print information about the (dis)connected MIDI controller
                console.log(e.port);
            };
            for (let input of MIDIAccess.inputs.values()) {
                let el = document.createElement("li");
                el.innerText = `${input.name}`;
                listInput.appendChild(el);
                input.onmidimessage = onMidiMessage;
            }
            for (let output of MIDIAccess.outputs.values()) {
                let el = document.createElement("li");
                el.innerText = `${output.name}`;
                listOutput.appendChild(el);
                // ou.onmidimessage = function(event) {
                //     console.log(event.data);
                // };
                window.OUTPUT = output;
            }
        }, () => {
            console.error('No access to your midi devices.')
        });
}

for (let i = 1; i < 17; i++) {
    let el = document.createElement("option");
    el.value = i.toString();
    el.text = i.toString();
    channelSelector.appendChild(el);
}

for (let i = 1; i < 128; i++) {
    let el = document.createElement("option");
    el.value = i.toString();
    el.text = i.toString();
    velocitySelector.appendChild(el);
}

sendButton.addEventListener("click", (e) => {
    let selectedChannel = parseInt(channelSelector.options[channelSelector.selectedIndex].value, 10);
    let selectedVelocity = parseInt(velocitySelector.options[velocitySelector.selectedIndex].value, 10);

    stopAll(OUTPUT);
    sendToAllButtons(OUTPUT, selectedChannel, selectedVelocity);
})

stopButton.addEventListener("click", () => {
    stopAll(OUTPUT);
})

channelSelector.addEventListener("change", () => {
    let selectedChannel = parseInt(channelSelector.options[channelSelector.selectedIndex].value, 10);
    let selectedVelocity = parseInt(velocitySelector.options[velocitySelector.selectedIndex].value, 10);

    stopAll(OUTPUT);
    sendToAllButtons(OUTPUT, selectedChannel, selectedVelocity);
})

velocitySelector.addEventListener("change", () => {
    let selectedChannel = parseInt(channelSelector.options[channelSelector.selectedIndex].value, 10);
    let selectedVelocity = parseInt(velocitySelector.options[velocitySelector.selectedIndex].value, 10);
    stopAll(OUTPUT);
    sendToAllButtons(OUTPUT, selectedChannel, selectedVelocity);
})

function sendToAllButtons(output, channel, velocity) {
    for (let j = 11; j <= 89; j++) {
        output.send([0x90 + channel, j, velocity]);
    }
    for (let i = 104; i <= 111; i++) {
        output.send([0xb0 + channel, i, velocity]);
    }
}

function stopAll(output) {
    for (let i = 0; i < 17; i++) {
        for (let j = 11; j <= 111; j++) {
            output.send([0x90 + i, j, 0]);
        }
        for (let k = 104; k <= 111; k++) {
            output.send([0xb0, k, 0]);
        }
    }
}

const buttonsTable = document.getElementById("buttons-table");
const firstRow = document.getElementById("first-row");

for (let i = 104; i < 112; i++) {
    let td = document.createElement("td");
    firstRow.appendChild(td);
    let button = document.createElement("button");
    button.innerText = i.toString(10);
    button.classList.add("midi-button");
    td.appendChild(button);
    button.id = `midi-button-${i}`;
    button.dataset.note = i.toString(10);
    button.onmousedown = onMouseDown;
    button.onmouseup = onMouseUp;
}
firstRow.appendChild(document.createElement("td"));

for (let i = 0; i < 8; i++) {
    let tr = document.createElement("tr");
    buttonsTable.appendChild(tr);
    for (let j = 81 - 10 * i; j < 90 - 10 * i; j++) {
        let td = document.createElement("td");
        tr.appendChild(td);
        let button = document.createElement("button");
        button.innerText = j.toString(10);
        button.classList.add("midi-button");
        td.appendChild(button);
        button.id = `midi-button-${j}`;
        button.dataset.note = j.toString(10);
        button.onmousedown = onMouseDown;
        button.onmouseup = onMouseUp;
    }
}

function onMidiMessage(event) {
    const data = event.data;
    const note = data[1];
    const velocity = data[2];
    const button = document.getElementById(`midi-button-${note}`);
    if (button) {
        if (velocity > 0) {
            button.classList.add("pressed");
        } else {
            button.classList.remove("pressed");
        }
    }
    OUTPUT.send([data[0], data[1], (Math.random() * data[2]) | 0]);
}

function onMouseDown(event) {
    const button = event.target;
    const note = button.dataset.note;
    OUTPUT.send([0x90, parseInt(note, 10), (Math.random() * 128) | 0])
}

function onMouseUp(event) {
    const button = event.target;
    const note = button.dataset.note;
    OUTPUT.send([0x90, parseInt(note, 10), 0])
}
