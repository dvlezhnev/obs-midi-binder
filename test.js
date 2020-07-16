// testing functionality

const midiStatusElement = document.getElementById("midi-status");

if (navigator.requestMIDIAccess) {
    midiStatusElement.innerText = "Browser supports MIDI!";
    showMidiDevices();
}
else {
    midiStatusElement.innerText = "Browser NOT supports MIDI!";
}

function showMidiDevices() {
    const midiDevicesListElement = document.getElementById("midi-devices");
    let text = document.createElement("div");
    text.innerText = "Devices: ";
    let list = document.createElement("ui");

    midiDevicesListElement.appendChild(text);
    midiDevicesListElement.appendChild(list);

    navigator.requestMIDIAccess()
        .then((midi) => {
            midi.onstatechange = function(e) {

                // Print information about the (dis)connected MIDI controller
                console.log(e.port);
            };
            for (let input of midi.inputs.values()) {
                let el = document.createElement("li");
                el.innerText = `${input.name}`;
                list.appendChild(el);
            }
        }, () => {
            console.error('No access to your midi devices.')
        });
}

