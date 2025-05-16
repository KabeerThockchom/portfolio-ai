// WebRTC setup
let peerConnection;
let dataChannel;

function setupWebRTC() {
    // Create a WebRTC Agent
    peerConnection = new RTCPeerConnection();

    // On inbound audio add to page
    peerConnection.ontrack = (event) => {
        const el = document.createElement('audio');
        el.srcObject = event.streams[0];
        el.autoplay = el.controls = true;
        document.body.appendChild(el);
    };

    dataChannel = peerConnection.createDataChannel('oai-events');

    dataChannel.addEventListener('open', (ev) => {
        console.log('Opening data channel', ev);
        configureData();
    });

    dataChannel.addEventListener('message', async (ev) => {
        const msg = JSON.parse(ev.data);
        // Handle function calls
        // fns is defined in api.js
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
                dataChannel.send(JSON.stringify({ type: "response.create" }));
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
}

function configureData() {
    console.log('Configuring data channel');
    const event = {
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            // Provide the tools. Note they match the keys in the `fns` object above
            // fns is defined in api.js
            tools: [
                // Financial data tools
                {
                    type: 'function',
                    name: 'getStockChart',
                    description: 'Fetches chart data for a given stock symbol',
                    parameters: {
                        type: 'object',
                        properties: {
                            symbol: { type: 'string', description: 'Stock symbol (e.g., GOOG, AAPL)' },
                            region: { type: 'string', description: 'Region code (e.g., US)' },
                            lang: { type: 'string', description: 'Language code (e.g., en-US)' },
                            comparisons: { type: 'string', description: 'Comma-separated list of symbols for comparison (e.g., AAPL,MSFT)' },
                            useYfid: { type: 'boolean', description: 'Whether to use Yahoo Finance ID' },
                            period1: { type: 'string', description: 'Start date in YYYY-MM-DD format (cannot be used with range)' },
                            events: { type: 'string', description: 'Comma-separated list of events: capitalGain, div, split, earn, history' },
                            period2: { type: 'string', description: 'End date in YYYY-MM-DD format (cannot be used with range)' },
                            range: { type: 'string', description: 'Time range (e.g., 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd)' },
                            interval: { type: 'string', description: 'Time interval (e.g., 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)' },
                            includePrePost: { type: 'boolean', description: 'Whether to include pre/post market data' }
                        },
                        required: ['symbol']
                    }
                },
                {
                    type: 'function',
                    name: 'getStockProfile',
                    description: 'Fetches company profile information for a given stock symbol',
                    parameters: {
                        type: 'object',
                        properties: {
                            symbol: { type: 'string', description: 'Stock symbol (e.g., GOOG, AAPL)' },
                            region: { type: 'string', description: 'Region code (e.g., US)' }
                        },
                        required: ['symbol']
                    }
                },
                {
                    type: 'function',
                    name: 'getStockStatistics',
                    description: 'Fetches key statistics for a given stock symbol',
                    parameters: {
                        type: 'object',
                        properties: {
                            symbol: { type: 'string', description: 'Stock symbol (e.g., GOOG, AAPL)' },
                            region: { type: 'string', description: 'Region code (e.g., US)' }
                        },
                        required: ['symbol']
                    }
                },
                {
                    type: 'function',
                    name: 'getStockSummary',
                    description: 'Fetches summary information for a given stock symbol',
                    parameters: {
                        type: 'object',
                        properties: {
                            symbol: { type: 'string', description: 'Stock symbol (e.g., GOOG, AAPL)' },
                            region: { type: 'string', description: 'Region code (e.g., US)' }
                        },
                        required: ['symbol']
                    }
                },
                {
                    type: 'function',
                    name: 'getStockEarnings',
                    description: 'Fetches earnings information for a given stock symbol',
                    parameters: {
                        type: 'object',
                        properties: {
                            symbol: { type: 'string', description: 'Stock symbol (e.g., GOOG, AAPL)' },
                            region: { type: 'string', description: 'Region code (e.g., US)' }
                        },
                        required: ['symbol']
                    }
                }
            ],
        },
    };
    dataChannel.send(JSON.stringify(event));
} 