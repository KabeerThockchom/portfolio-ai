// Process chart data based on the selected view mode
function processChartData(chartData, symbol, viewMode = 'price') {
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
        // debugLog is defined in config.js
        debugLog(`Invalid chart data for processing`);
        return null;
    }

    const result = chartData.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0] || {};
    const closes = quotes.close || [];
    const metadata = result.meta || {};

    // debugLog is defined in config.js
    debugLog(`Processing chart data for ${symbol} with view mode: ${viewMode}`, {
        timestampsLength: timestamps.length,
        closesLength: closes.length,
        hasComparisons: result.comparisons ? true : false,
        comparisonCount: result.comparisons ? result.comparisons.length : 0
    });

    // Main series data
    let mainSeriesData;
    const seriesName = symbol;

    if (viewMode === 'price') {
        // Standard price view
        mainSeriesData = timestamps.map((timestamp, index) => {
            if (closes[index] === null || closes[index] === undefined) return null;
            return [timestamp * 1000, closes[index]];
        }).filter(point => point !== null);
    }
    else if (viewMode === 'percent') {
        // Percent change view
        const firstClose = closes.find(val => val !== null && val !== undefined);
        if (firstClose) {
            mainSeriesData = timestamps.map((timestamp, index) => {
                if (closes[index] === null || closes[index] === undefined) return null;
                const percentChange = ((closes[index] - firstClose) / firstClose) * 100;
                return [timestamp * 1000, percentChange];
            }).filter(point => point !== null);
        }
    }
    else if (viewMode === 'relative') {
        // Relative to the starting point (normalized to 100)
        const firstClose = closes.find(val => val !== null && val !== undefined);
        if (firstClose) {
            mainSeriesData = timestamps.map((timestamp, index) => {
                if (closes[index] === null || closes[index] === undefined) return null;
                const relativeValue = (closes[index] / firstClose) * 100;
                return [timestamp * 1000, relativeValue];
            }).filter(point => point !== null);
        }
    }

    // debugLog is defined in config.js
    debugLog(`Main series data points: ${mainSeriesData ? mainSeriesData.length : 0}`);

    const series = [{
        name: seriesName,
        data: mainSeriesData || []
    }];

    // Process comparison data if available
    if (result.comparisons && result.comparisons.length > 0) {
        // debugLog is defined in config.js
        debugLog(`Processing ${result.comparisons.length} comparison stock(s)`);

        const comparisonSeries = result.comparisons.map(comparison => {
            const compSymbol = comparison.symbol;
            const compClose = comparison.close || [];

            // debugLog is defined in config.js
            debugLog(`Comparison data for ${compSymbol}:`, {
                closeDataPoints: compClose.length,
                previousClose: comparison.previousClose,
                chartPreviousClose: comparison.chartPreviousClose,
                firstFewCloseValues: compClose.slice(0, 5),
                lastFewCloseValues: compClose.slice(-5)
            });

            let compData;

            if (viewMode === 'price') {
                // Standard price view
                compData = timestamps.map((timestamp, index) => {
                    if (compClose[index] === null || compClose[index] === undefined) return null;
                    return [timestamp * 1000, compClose[index]];
                }).filter(point => point !== null);
            }
            else if (viewMode === 'percent') {
                // Percent change view
                const firstCompClose = compClose.find(val => val !== null && val !== undefined);
                if (firstCompClose) {
                    compData = timestamps.map((timestamp, index) => {
                        if (compClose[index] === null || compClose[index] === undefined) return null;
                        const percentChange = ((compClose[index] - firstCompClose) / firstCompClose) * 100;
                        return [timestamp * 1000, percentChange];
                    }).filter(point => point !== null);
                }
            }
            else if (viewMode === 'relative') {
                // Relative to the starting point (normalized to 100)
                const firstCompClose = compClose.find(val => val !== null && val !== undefined);
                if (firstCompClose) {
                    compData = timestamps.map((timestamp, index) => {
                        if (compClose[index] === null || compClose[index] === undefined) return null;
                        const relativeValue = (compClose[index] / firstCompClose) * 100;
                        return [timestamp * 1000, relativeValue];
                    }).filter(point => point !== null);
                }
            }

            // debugLog is defined in config.js
            debugLog(`Processed ${compData ? compData.length : 0} data points for ${compSymbol}`);

            return {
                name: compSymbol,
                data: compData || []
            };
        });

        series.push(...comparisonSeries);
    }

    return {
        series,
        metadata,
        viewMode
    };
}