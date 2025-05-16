// Store the RapidAPI key
let rapidApiKey = '';

// Debug logging
let debugLogging = true;

// Debug log function
function debugLog(message, data) {
    if (!debugLogging) return;

    console.log(`🔍 DEBUG: ${message}`);
    if (data !== undefined) {
        if (typeof data === 'object') {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(data);
        }
    }
} 