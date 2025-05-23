<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure OpenAI Realtime Session</title>
</head>
<body>
    <h1>Azure OpenAI Realtime Session</h1>
    <p>WARNING: Don't use this code sample in production with the API key hardcoded. Use a protected backend service to call the sessions API and generate the ephemeral key. Then return the ephemeral key to the client.</p>
    <button onclick="StartSession()">Start Session</button>

    <!-- Log container for API messages -->
    <div id="logContainer"></div> 

    <script>

        // Make sure the WebRTC URL region matches the region of your Azure OpenAI resource.
        // For example, if your Azure OpenAI resource is in the swedencentral region,
        // the WebRTC URL should be https://swedencentral.realtimeapi-preview.ai.azure.com/v1/realtimertc.
        // If your Azure OpenAI resource is in the eastus2 region, the WebRTC URL should be https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc.
        const WEBRTC_URL= "https://eastus2.realtimeapi-preview.ai.azure.com/v1/realtimertc"

        // The SESSIONS_URL includes the Azure OpenAI resource URL,
        // deployment name, the /realtime/sessions path, and the API version.
        // The Azure OpenAI resource region isn't part of the SESSIONS_URL.
        const SESSIONS_URL="https://voiceaistudio9329552017.cognitiveservices.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview"

        // The API key of the Azure OpenAI resource.
        const API_KEY = "b6c1b8dfa9994e3792cc66b6a4a7d9a6"; 

        // The deployment name might not be the same as the model name.
        const DEPLOYMENT = "gpt-4o-mini-realtime-preview"
		    const VOICE = "verse"

        async function StartSession() {
            try {

                // WARNING: Don't use this code sample in production
                // with the API key hardcoded. 
                // Use a protected backend service to call the 
                // sessions API and generate the ephemeral key.
                // Then return the ephemeral key to the client.

                const response = await fetch(SESSIONS_URL, {
                    method: "POST",
                    headers: {
                        // The Authorization header is commented out because
                        // currently it isn't supported with the sessions API. 
                        //"Authorization": `Bearer ${ACCESS_TOKEN}`,
                        "api-key": API_KEY,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        model: DEPLOYMENT,
                        voice: VOICE
                    })
                });

                if (!response.ok) {
                    throw new Error(`API request failed`);
                }

                const data = await response.json();

        				const sessionId = data.id;
        				const ephemeralKey = data.client_secret?.value; 
        				console.error("Ephemeral key:", ephemeralKey);

                // Mask the ephemeral key in the log message.
                logMessage("Ephemeral Key Received: " + "***");
		            logMessage("WebRTC Session Id = " + sessionId );

                // Set up the WebRTC connection using the ephemeral key.
                init(ephemeralKey); 

            } catch (error) {
                console.error("Error fetching ephemeral key:", error);
                logMessage("Error fetching ephemeral key: " + error.message);
            }
        }

        async function init(ephemeralKey) {

            let peerConnection = new RTCPeerConnection();

            // Set up to play remote audio from the model.
            const audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            document.body.appendChild(audioElement);

            peerConnection.ontrack = (event) => {
                audioElement.srcObject = event.streams[0];
            };

            // Set up data channel for sending and receiving events
            const clientMedia = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = clientMedia.getAudioTracks()[0];
            peerConnection.addTrack(audioTrack);

            const dataChannel = peerConnection.createDataChannel('realtime-channel');

            dataChannel.addEventListener('open', () => {
                logMessage('Data channel is open');
                updateSession(dataChannel);
            });

            dataChannel.addEventListener('message', (event) => {
                const realtimeEvent = JSON.parse(event.data); 
                console.log(realtimeEvent); 
                logMessage("Received server event: " + JSON.stringify(realtimeEvent, null, 2));
                if (realtimeEvent.type === "session.update") {
                    const instructions = realtimeEvent.session.instructions;
                    logMessage("Instructions: " + instructions);
                } else if (realtimeEvent.type === "session.error") {
                    logMessage("Error: " + realtimeEvent.error.message);
                } else if (realtimeEvent.type === "session.end") {
                    logMessage("Session ended.");
                }
            });

            dataChannel.addEventListener('close', () => {
                logMessage('Data channel is closed');
            });

	          // Start the session using the Session Description Protocol (SDP)
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            const sdpResponse = await fetch(`${WEBRTC_URL}?model=${DEPLOYMENT}`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${ephemeralKey}`,
                    "Content-Type": "application/sdp",
                },
            });

            const answer = { type: "answer", sdp: await sdpResponse.text() };
            await peerConnection.setRemoteDescription(answer);

            const button = document.createElement('button');
            button.innerText = 'Close Session';
            button.onclick = stopSession;
            document.body.appendChild(button);

            // Send a client event to update the session
            function updateSession(dataChannel) {
                const event = {
                    type: "session.update",
                    session: {
                        instructions: "You are a helpful AI assistant responding in natural, engaging language."
                    }
                };
                dataChannel.send(JSON.stringify(event));
                logMessage("Sent client event: " + JSON.stringify(event, null, 2));
            }

            function stopSession() {
                if (dataChannel) dataChannel.close();
                if (peerConnection) peerConnection.close();
                peerConnection = null;
                logMessage("Session closed.");
            }

        }

        function logMessage(message) {
            const logContainer = document.getElementById("logContainer");
            const p = document.createElement("p");
            p.textContent = message;
            logContainer.appendChild(p);
        }
    </script>
</body>
</html>