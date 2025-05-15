// Initialize robot hand functionality
const hand = new Hand();

function talkToTheHand() {
    hand
        .connect()
        .then(() => console.log('Hand is ready'))
        .catch((err) => console.error(err));
}

// Tool functions the AI can call
const fns = {
    getPageHTML: () => {
        return { success: true, html: document.documentElement.outerHTML };
    },
    changeBackgroundColor: ({ color }) => {
        document.body.style.backgroundColor = color;
        return { success: true, color };
    },
    changeTextColor: ({ color }) => {
        document.body.style.color = color;
        return { success: true, color };
    },
    showFingers: async ({ numberOfFingers }) => {
        await hand.sendCommand(numberOfFingers);
        return { success: true, numberOfFingers };
    },
};

// Create a WebRTC Agent
const peerConnection = new RTCPeerConnection();

// On inbound audio add to page
peerConnection.ontrack = (event) => {
    const el = document.createElement('audio');
    el.srcObject = event.streams[0];
    el.autoplay = el.controls = true;
    document.body.appendChild(el);
};

const dataChannel = peerConnection.createDataChannel('oai-events');

function configureData() {
    console.log('Configuring data channel');
    const event = {
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            // Provide the tools. Note they match the keys in the `fns` object above
            tools: [
                {
                    type: 'function',
                    name: 'changeBackgroundColor',
                    description: 'Changes the background color of a web page',
                    parameters: {
                        type: 'object',
                        properties: {
                            color: { type: 'string', description: 'A hex value of the color' },
                        },
                    },
                },
                {
                    type: 'function',
                    name: 'changeTextColor',
                    description: 'Changes the text color of a web page',
                    parameters: {
                        type: 'object',
                        properties: {
                            color: { type: 'string', description: 'A hex value of the color' },
                        },
                    },
                },
                {
                    type: 'function',
                    name: 'showFingers',
                    description: 'Controls a robot hand to show a specific number of fingers',
                    parameters: {
                        type: 'object',
                        properties: {
                            numberOfFingers: {
                                enum: [1, 2, 3, 4, 5],
                                description: 'Values 1 through 5 of the number of fingers to hold up' },
                        },
                    },
                },
                {
                    type: 'function',
                    name: 'getPageHTML',
                    description: 'Gets the HTML for the current page',
                },
            ],
        },
    };
    dataChannel.send(JSON.stringify(event));
}

dataChannel.addEventListener('open', (ev) => {
    console.log('Opening data channel', ev);
    configureData();
});

dataChannel.addEventListener('message', async (ev) => {
    const msg = JSON.parse(ev.data);
    // Handle function calls
    if (msg.type === 'response.function_call_arguments.done') {
        const fn = fns[msg.name];
        if (fn !== undefined) {
            console.log(`Calling local function ${msg.name} with ${msg.arguments}`);
            const args = JSON.parse(msg.arguments);
            const result = await fn(args);
            console.log('result', result);
            // Let Azure OpenAI know that the function has been called and share its output
            const event = {
                type: 'conversation.item.create',
                item: {
                    type: 'function_call_output',
                    call_id: msg.call_id, // call_id from the function_call message
                    output: JSON.stringify(result), // result of the function
                },
            };
            dataChannel.send(JSON.stringify(event));
            // Have assistant respond after getting the results
            dataChannel.send(JSON.stringify({type:"response.create"}));
        }
    }
});

// Capture microphone
navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    // Add microphone to PeerConnection
    stream.getTracks().forEach((track) => peerConnection.addTransceiver(track, { direction: 'sendrecv' }));

    peerConnection.createOffer().then((offer) => {
        peerConnection.setLocalDescription(offer);
        
        // Get session token from your backend
        fetch('/session')
            .then((tokenResponse) => tokenResponse.json())
            .then((data) => {
                const EPHEMERAL_KEY = data.result.client_secret.value;
                // Azure OpenAI Realtime endpoint
                const baseUrl = 'https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc';
                const model = 'gpt-4o-mini-realtime-preview';
                fetch(`${baseUrl}?model=${model}`, {
                    method: 'POST',
                    body: offer.sdp,
                    headers: {
                        Authorization: `Bearer ${EPHEMERAL_KEY}`,
                        'Content-Type': 'application/sdp',
                    },
                })
                .then((r) => r.text())
                .then((answer) => {
                    // Accept answer from Realtime WebRTC API
                    peerConnection.setRemoteDescription({
                        sdp: answer,
                        type: 'answer',
                    });
                });
            });
    });
});
