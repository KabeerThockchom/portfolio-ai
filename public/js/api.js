// Fetch the RapidAPI key from the server
async function fetchApiKeys() {
    try {
        const response = await fetch('/api-keys');
        const data = await response.json();
        rapidApiKey = data.rapidApiKey; // rapidApiKey is defined in config.js
        console.log('API keys loaded');
    } catch (error) {
        console.error('Failed to load API keys:', error);
    }
}

// Tool functions the AI can call
const fns = {
    // Financial data functions
    getStockChart: async ({ symbol, region, lang, comparisons, useYfid, period1, events, period2, range, interval, includePrePost }) => {
        try {
            // Show loading indicator (showLoading is defined in ui.js)
            showLoading();

            // Parse comparisons if needed (ensure it\'s properly formatted for the API)
            let formattedComparisons = comparisons;
            if (Array.isArray(comparisons)) {
                formattedComparisons = comparisons.join(',');
                // debugLog is defined in config.js
                debugLog(`Formatted comparisons array to string: ${formattedComparisons}`);
            }

            // Log the request parameters
            debugLog(`GetStockChart request:`, {
                symbol,
                region,
                lang,
                comparisons: formattedComparisons,
                useYfid,
                period1,
                events,
                period2,
                range,
                interval,
                includePrePost
            });

            // Build query parameters
            const params = new URLSearchParams();
            params.append('symbol', symbol);
            if (region) params.append('region', region);
            if (lang) params.append('lang', lang);
            if (formattedComparisons) params.append('comparisons', formattedComparisons);
            if (useYfid !== undefined) params.append('useYfid', useYfid);
            if (period1) params.append('period1', period1);
            if (events) params.append('events', events || 'div,split,earn');
            if (period2) params.append('period2', period2);
            if (range) params.append('range', range || '1mo');
            if (interval) params.append('interval', interval || '1d');
            if (includePrePost !== undefined) params.append('includePrePost', includePrePost);
            params.append('includeAdjustedClose', 'true');

            const url = `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-chart?${params.toString()}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': rapidApiKey, // rapidApiKey is defined in config.js
                    'x-rapidapi-host': 'yahoo-finance-real-time1.p.rapidapi.com'
                }
            };

            debugLog(`Fetching stock data from URL: ${url}`);
            const response = await fetch(url, options);
            const result = await response.json();

            // Log the entire response for debugging
            debugLog(`API Response for ${symbol}:`, result);

            // Check for API errors
            if (result.error) {
                console.error(`API Error for ${symbol}:`, result.error);
                debugLog(`API Error:`, result.error);
                hideLoading(); // hideLoading is defined in ui.js
                return {
                    success: false,
                    error: result.error
                };
            }

            // Check if main data structure is valid
            if (!result.chart || !result.chart.result || result.chart.result.length === 0) {
                console.error(`Invalid response structure for ${symbol}`);
                debugLog(`Invalid response structure:`, result);
                hideLoading(); // hideLoading is defined in ui.js
                return {
                    success: false,
                    error: "Invalid response structure"
                };
            }

            // Check if comparison data is valid (if requested)
            if (formattedComparisons && result.chart.result[0].comparisons) {
                const comparisonData = result.chart.result[0].comparisons;
                debugLog(`Validating comparison data for: ${formattedComparisons}`, comparisonData);

                debugLog(`Number of comparison stocks in response: ${comparisonData.length}`);

                // Check each comparison stock for critical data
                comparisonData.forEach(comp => {
                    debugLog(`Validating data for comparison stock: ${comp.symbol}`);

                    if (!comp.close || comp.close.length === 0) {
                        console.warn(`Missing close data for comparison stock: ${comp.symbol}`);
                        debugLog(`Missing close data for comparison stock: ${comp.symbol}`);
                    }

                    if (comp.previousClose === undefined || comp.previousClose === null) {
                        console.warn(`Missing previousClose for comparison stock: ${comp.symbol}`);
                        debugLog(`Missing previousClose for comparison stock: ${comp.symbol}`);

                        // Try to fix missing previousClose using first value in close array
                        if (comp.close && comp.close.length > 0) {
                            const firstValidClose = comp.close.find(val => val !== null && val !== undefined);
                            if (firstValidClose !== undefined) {
                                debugLog(`Setting missing previousClose for ${comp.symbol} to first valid close: ${firstValidClose}`);
                                comp.previousClose = firstValidClose;
                            }
                        }
                    }
                });

                // Check if expected comparisons match actual comparisons
                if (formattedComparisons && formattedComparisons.length > 0) {
                    const expectedSymbols = formattedComparisons.split(',').map(s => s.trim().toUpperCase());
                    const actualSymbols = comparisonData.map(comp => comp.symbol.toUpperCase());

                    debugLog(`Expected comparison symbols: ${expectedSymbols.join(', ')}`);
                    debugLog(`Actual comparison symbols: ${actualSymbols.join(', ')}`);

                    // Check for missing symbols
                    const missingSymbols = expectedSymbols.filter(symbol => !actualSymbols.includes(symbol));
                    if (missingSymbols.length > 0) {
                        console.warn(`Some requested comparison symbols are missing from the response: ${missingSymbols.join(', ')}`);
                        debugLog(`Missing comparison symbols: ${missingSymbols.join(', ')}`);
                    }
                }
            }

            // Render chart with the data
            // renderStockChart is defined in chart.js
            renderStockChart(result, symbol);

            // Process the chart data to provide a summary
            let summary = '';
            if (result.chart && result.chart.result && result.chart.result.length > 0) {
                const chartData = result.chart.result[0];
                const meta = chartData.meta;

                summary = `Chart data for ${meta.shortName || symbol} (${symbol}): \\n`;
                summary += `Current price: $${meta.regularMarketPrice}\\n`;
                summary += `Day range: $${meta.regularMarketDayLow} - $${meta.regularMarketDayHigh}\\n`;
                summary += `52 week range: $${meta.fiftyTwoWeekLow} - $${meta.fiftyTwoWeekHigh}\\n`;
                summary += `Volume: ${meta.regularMarketVolume.toLocaleString()}\\n`;

                // Calculate change
                const change = meta.regularMarketPrice - meta.chartPreviousClose;
                const changePercent = (change / meta.chartPreviousClose) * 100;
                summary += `Change: ${change > 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)\\n`;

                // Add time range details
                summary += `Time Range: ${meta.range || 'N/A'}\\n`;

                // Add exchange information
                summary += `Exchange: ${meta.exchangeName || 'N/A'}\\n`;

                // Add timezone information
                summary += `Timezone: ${meta.timezone || 'N/A'}\\n`;

                // Add market state
                if (meta.currentTradingPeriod) {
                    const now = Math.floor(Date.now() / 1000);
                    const regular = meta.currentTradingPeriod.regular;
                    let marketState = 'Closed';

                    if (now >= regular.start && now < regular.end) {
                        marketState = 'Regular Trading';
                    } else if (meta.currentTradingPeriod.pre && now >= meta.currentTradingPeriod.pre.start && now < meta.currentTradingPeriod.pre.end) {
                        marketState = 'Pre-market';
                    } else if (meta.currentTradingPeriod.post && now >= meta.currentTradingPeriod.post.start && now < meta.currentTradingPeriod.post.end) {
                        marketState = 'After Hours';
                    }

                    summary += `Market State: ${marketState}\\n`;
                }

                // Add comparison data if available
                if (chartData.comparisons && chartData.comparisons.length > 0) {
                    summary += `\\nComparison Stocks (${chartData.comparisons.length}):\\n`;
                    chartData.comparisons.forEach(comp => {
                        const compLastClose = comp.close[comp.close.length-1];
                        const compPrevClose = comp.previousClose;

                        // Check for valid data
                        if (compLastClose !== undefined && compPrevClose !== undefined &&
                            !isNaN(compLastClose) && !isNaN(compPrevClose) && compPrevClose !== 0) {

                            const compChange = compLastClose - compPrevClose;
                            const compChangePercent = (compChange / compPrevClose) * 100;

                            summary += `- ${comp.symbol}: $${compLastClose.toFixed(2)} (${compChange > 0 ? '+' : ''}${compChangePercent.toFixed(2)}%)\\n`;
                        } else {
                            // Fallback for invalid data
                            summary += `- ${comp.symbol}: $${compLastClose?.toFixed(2) || 'N/A'}\\n`;
                        }
                    });
                }

                // Add events information if available
                if (chartData.events) {
                    if (chartData.events.dividends) {
                        const latestDividend = Object.values(chartData.events.dividends).sort((a, b) => b.date - a.date)[0];
                        if (latestDividend) {
                            const dividendDate = new Date(latestDividend.date * 1000).toLocaleDateString();
                            summary += `\\nLatest Dividend: $${latestDividend.amount} on ${dividendDate}\\n`;
                        }
                    }

                    if (chartData.events.splits) {
                        const latestSplit = Object.values(chartData.events.splits).sort((a, b) => b.date - a.date)[0];
                        if (latestSplit) {
                            const splitDate = new Date(latestSplit.date * 1000).toLocaleDateString();
                            summary += `Latest Split: ${latestSplit.numerator}:${latestSplit.denominator} on ${splitDate}\\n`;
                        }
                    }
                }

                // Add view mode information
                summary += `\\nAvailable Chart Views: Price, Percent Change, Relative Performance\\n`;
                summary += `You can compare stocks and switch between them to see individual statistics.\\n`;
            }

            return {
                success: true,
                chartData: result,
                summary
            };
        } catch (error) {
            console.error('Error fetching stock chart:', error);
            debugLog(`Error fetching stock chart:`, error); // debugLog is defined in config.js
            hideLoading(); // hideLoading is defined in ui.js
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
                    'x-rapidapi-key': rapidApiKey, // rapidApiKey is defined in config.js
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
                    'x-rapidapi-key': rapidApiKey, // rapidApiKey is defined in config.js
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
                    'x-rapidapi-key': rapidApiKey, // rapidApiKey is defined in config.js
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
                    'x-rapidapi-key': rapidApiKey, // rapidApiKey is defined in config.js
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