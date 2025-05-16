// Initialize robot hand functionality
const hand = new Hand();

// Store the RapidAPI key
let rapidApiKey = '';

// Chart objects
let stockChart = null;

// Fetch the RapidAPI key from the server
async function fetchApiKeys() {
    try {
        const response = await fetch('/api-keys');
        const data = await response.json();
        rapidApiKey = data.rapidApiKey;
        console.log('API keys loaded');
    } catch (error) {
        console.error('Failed to load API keys:', error);
    }
}

// Call fetchApiKeys when the page loads
fetchApiKeys();

function talkToTheHand() {
    hand
        .connect()
        .then(() => console.log('Hand is ready'))
        .catch((err) => console.error(err));
}

// Initialize empty chart
function initEmptyChart() {
    const options = {
        series: [{
            name: 'Stock Price',
            data: []
        }],
        chart: {
            type: 'line',
            height: 350,
            toolbar: {
                show: true
            },
            zoom: {
                enabled: true
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'straight',
            width: 2
        },
        grid: {
            row: {
                colors: ['#f3f3f3', 'transparent'],
                opacity: 0.5
            },
        },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false
            }
        },
        yaxis: {
            labels: {
                formatter: function (val) {
                    return '$' + val.toFixed(2);
                }
            }
        },
        tooltip: {
            x: {
                format: 'MMM dd, yyyy'
            }
        },
        title: {
            text: 'Stock Price Chart',
            align: 'center'
        },
        noData: {
            text: 'No data available',
            align: 'center',
            verticalAlign: 'middle',
            offsetY: 0,
            style: {
                color: '#999',
                fontSize: '14px',
                fontFamily: 'Segoe UI'
            }
        }
    };

    stockChart = new ApexCharts(document.querySelector("#stockChart"), options);
    stockChart.render();
}

// Call initEmptyChart when the page loads
document.addEventListener('DOMContentLoaded', initEmptyChart);

// Render chart with data
function renderStockChart(chartData, symbol) {
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
        console.error('Invalid chart data');
        return;
    }

    const result = chartData.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0] || {};
    const closes = quotes.close || [];
    const metadata = result.meta || {};
    
    // Prepare data for the chart
    const seriesData = timestamps.map((timestamp, index) => {
        if (closes[index] === null || closes[index] === undefined) return null;
        return [timestamp * 1000, closes[index]]; // Convert timestamp to milliseconds
    }).filter(point => point !== null);

    // Update chart
    stockChart.updateOptions({
        series: [{
            name: symbol,
            data: seriesData
        }],
        title: {
            text: `${metadata.shortName || symbol} Stock Price`,
        },
        subtitle: {
            text: `Current: $${metadata.regularMarketPrice?.toFixed(2)} | Range: $${metadata.regularMarketDayLow?.toFixed(2)} - $${metadata.regularMarketDayHigh?.toFixed(2)}`,
            style: {
                fontSize: '12px',
                color: '#666'
            }
        }
    });

    // Add comparison series if available
    if (result.comparisons && result.comparisons.length > 0) {
        const comparisonSeries = result.comparisons.map(comparison => {
            const compSymbol = comparison.symbol;
            const compClose = comparison.close || [];
            
            const compData = timestamps.map((timestamp, index) => {
                if (compClose[index] === null || compClose[index] === undefined) return null;
                return [timestamp * 1000, compClose[index]];
            }).filter(point => point !== null);
            
            return {
                name: compSymbol,
                data: compData
            };
        });
        
        stockChart.updateOptions({
            series: [{
                name: symbol,
                data: seriesData
            }, ...comparisonSeries]
        });
    }
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
    // New financial data functions
    getStockChart: async ({ symbol, region, lang, comparisons, useYfid, period1, events, period2, range, interval, includePrePost }) => {
        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('symbol', symbol);
            if (region) params.append('region', region);
            if (lang) params.append('lang', lang);
            if (comparisons) params.append('comparisons', comparisons);
            if (useYfid !== undefined) params.append('useYfid', useYfid);
            if (period1) params.append('period1', period1);
            if (events) params.append('events', events);
            if (period2) params.append('period2', period2);
            if (range) params.append('range', range || '1mo');
            if (interval) params.append('interval', interval || '1d');
            if (includePrePost !== undefined) params.append('includePrePost', includePrePost);
            params.append('includeAdjustedClose', 'true');

            const url = `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-chart?${params.toString()}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com'
                }
            };

            const response = await fetch(url, options);
            const result = await response.json();
            
            // Render chart with the data
            renderStockChart(result, symbol);
            
            // Process the chart data to provide a summary
            let summary = '';
            if (result.chart && result.chart.result && result.chart.result.length > 0) {
                const chartData = result.chart.result[0];
                const meta = chartData.meta;
                
                summary = `Chart data for ${meta.shortName || symbol} (${symbol}): \n`;
                summary += `Current price: $${meta.regularMarketPrice}\n`;
                summary += `Day range: $${meta.regularMarketDayLow} - $${meta.regularMarketDayHigh}\n`;
                summary += `52 week range: $${meta.fiftyTwoWeekLow} - $${meta.fiftyTwoWeekHigh}\n`;
                summary += `Volume: ${meta.regularMarketVolume.toLocaleString()}\n`;
                
                // Calculate change
                const change = meta.regularMarketPrice - meta.chartPreviousClose;
                const changePercent = (change / meta.chartPreviousClose) * 100;
                summary += `Change: ${change > 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)\n`;
                
                // Add time range details
                summary += `Time Range: ${meta.range || 'N/A'}\n`;
                
                // Add comparison data if available
                if (chartData.comparisons && chartData.comparisons.length > 0) {
                    summary += `\nComparison Stocks:\n`;
                    chartData.comparisons.forEach(comp => {
                        summary += `- ${comp.symbol}: $${comp.close[comp.close.length-1]}\n`;
                    });
                }
            }
            
            return { 
                success: true, 
                chartData: result,
                summary
            };
        } catch (error) {
            console.error('Error fetching stock chart:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    },
    getStockProfile: async ({ symbol, region }) => {
        try {
            const params = new URLSearchParams();
            params.append('symbol', symbol);
            if (region) params.append('region', region);

            const url = `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-profile?${params.toString()}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com'
                }
            };

            const response = await fetch(url, options);
            const result = await response.json();
            
            return { success: true, profileData: result };
        } catch (error) {
            console.error('Error fetching stock profile:', error);
            return { success: false, error: error.message };
        }
    },
    getStockStatistics: async ({ symbol, region }) => {
        try {
            const params = new URLSearchParams();
            params.append('symbol', symbol);
            if (region) params.append('region', region);

            const url = `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-statistics?${params.toString()}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com'
                }
            };

            const response = await fetch(url, options);
            const result = await response.json();
            
            return { success: true, statisticsData: result };
        } catch (error) {
            console.error('Error fetching stock statistics:', error);
            return { success: false, error: error.message };
        }
    },
    getStockSummary: async ({ symbol, region }) => {
        try {
            const params = new URLSearchParams();
            params.append('symbol', symbol);
            if (region) params.append('region', region);

            const url = `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-summary?${params.toString()}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com'
                }
            };

            const response = await fetch(url, options);
            const result = await response.json();
            
            return { success: true, summaryData: result };
        } catch (error) {
            console.error('Error fetching stock summary:', error);
            return { success: false, error: error.message };
        }
    },
    getStockEarnings: async ({ symbol, region }) => {
        try {
            const params = new URLSearchParams();
            params.append('symbol', symbol);
            if (region) params.append('region', region);

            const url = `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-earnings?${params.toString()}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': rapidApiKey,
                    'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com'
                }
            };

            const response = await fetch(url, options);
            const result = await response.json();
            
            return { success: true, earningsData: result };
        } catch (error) {
            console.error('Error fetching stock earnings:', error);
            return { success: false, error: error.message };
        }
    }
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
                // New financial data tools
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
