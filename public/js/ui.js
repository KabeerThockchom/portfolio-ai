// Store the currently selected stock for the info panel
// This might need to be managed in a shared scope (e.g., in chart.js or a new state.js)
// if other modules need to react to its changes directly.
let selectedStock = '';

// Switch the selected stock for info display
function selectStock(symbol) {
    selectedStock = symbol;

    // debugLog is defined in config.js
    debugLog(`Selected stock changed to: ${symbol}`);

    // Update active tab UI
    const tabs = document.querySelectorAll('.stock-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('data-symbol') === symbol) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update info panel with selected stock data
    // currentChartData is defined in chart.js
    if (currentChartData) {
        updateInfoPanel(currentChartData, symbol);
    }
}

// Create stock selector tabs
function createStockSelectorTabs(mainSymbol, compSymbols = []) {
    const stockSelector = document.getElementById('stockSelector');
    stockSelector.innerHTML = ''; // Clear existing tabs

    const allSymbols = [mainSymbol, ...compSymbols];

    // debugLog is defined in config.js
    debugLog(`Creating stock selector tabs for: ${allSymbols.join(', ')} `);

    // No need to show tabs if there's only one stock
    if (allSymbols.length <= 1) {
        stockSelector.style.display = 'none';
        return;
    }

    stockSelector.style.display = 'flex';

    // Create tabs for each stock
    allSymbols.forEach(symbol => {
        const tab = document.createElement('div');
        tab.className = `stock-tab ${symbol === selectedStock ? 'active' : ''}`;
        tab.setAttribute('data-symbol', symbol);
        tab.textContent = symbol;
        tab.onclick = () => selectStock(symbol);
        stockSelector.appendChild(tab);
    });
}

// Show loading indicator
function showLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.add('visible');
}

// Hide loading indicator
function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.classList.remove('visible');
}

// Show chart container
function showChart() {
    const chartContainer = document.getElementById('chartContainer');
    chartContainer.classList.add('visible');
}

// Create info cards for stock data based on the selected stock
function updateInfoPanel(chartData, stockSymbol) {
    // currentChartData, currentSymbol are defined in chart.js
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) return;

    const stockInfoPanel = document.getElementById('stockInfoPanel');
    stockInfoPanel.innerHTML = ''; // Clear existing cards

    // If we're showing the main stock
    if (stockSymbol === currentSymbol) {
        const result = chartData.chart.result[0];
        const meta = result.meta || {};

        // debugLog is defined in config.js
        debugLog(`Updating info panel for main stock: ${stockSymbol}`, meta);

        // Current Price card
        createInfoCard(stockInfoPanel, 'Current Price', `$${meta.regularMarketPrice?.toFixed(2) || 'N/A'}`);

        // Price Change card
        const change = meta.regularMarketPrice - meta.chartPreviousClose;
        const changePercent = (change / meta.chartPreviousClose) * 100;

        // debugLog is defined in config.js
        debugLog(`Main stock change calculation:`, {
            regularMarketPrice: meta.regularMarketPrice,
            chartPreviousClose: meta.chartPreviousClose,
            change: change,
            changePercent: changePercent
        });

        const cssClass = change >= 0 ? 'positive' : 'negative';
        const changeSign = change >= 0 ? '+' : '';

        // Check for NaN values and provide fallbacks
        const changeText = !isNaN(change) ?
            `${changeSign}$${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)` :
            'N/A';

        createInfoCard(
            stockInfoPanel,
            'Change',
            changeText,
            cssClass
        );

        // Day Range card
        createInfoCard(stockInfoPanel, 'Day Range', `$${meta.regularMarketDayLow?.toFixed(2) || 'N/A'} - $${meta.regularMarketDayHigh?.toFixed(2) || 'N/A'}`);

        // 52-Week Range card
        createInfoCard(stockInfoPanel, '52 Week Range', `$${meta.fiftyTwoWeekLow?.toFixed(2) || 'N/A'} - $${meta.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}`);

        // Volume card
        createInfoCard(stockInfoPanel, 'Volume', `${meta.regularMarketVolume?.toLocaleString() || 'N/A'}`);

        // Previous Close card
        createInfoCard(stockInfoPanel, 'Previous Close', `$${meta.chartPreviousClose?.toFixed(2) || 'N/A'}`);

        // Exchange card
        createInfoCard(stockInfoPanel, 'Exchange', meta.exchangeName || 'N/A');
    }
    // If we're showing a comparison stock
    else {
        const result = chartData.chart.result[0];

        // Find the comparison stock data
        const comparisonData = result.comparisons.find(comp => comp.symbol === stockSymbol);

        if (!comparisonData) {
            // debugLog is defined in config.js
            debugLog(`No comparison data found for: ${stockSymbol}`);
            return;
        }

        // debugLog is defined in config.js
        debugLog(`Updating info panel for comparison stock: ${stockSymbol}`, comparisonData);

        // Current Price card
        const currentPrice = comparisonData.close[comparisonData.close.length - 1];
        createInfoCard(stockInfoPanel, 'Current Price', `$${currentPrice?.toFixed(2) || 'N/A'}`);

        // Change card
        const prevClose = comparisonData.previousClose || comparisonData.chartPreviousClose;

        // Log the values we're working with
        // debugLog is defined in config.js
        debugLog(`Comparison stock change calculation:`, {
            symbol: stockSymbol,
            currentPrice: currentPrice,
            previousClose: prevClose,
            rawPreviousClose: comparisonData.previousClose,
            rawChartPreviousClose: comparisonData.chartPreviousClose,
            closeArrayLength: comparisonData.close.length,
            lastFewCloseValues: comparisonData.close.slice(-5)
        });

        // Only calculate if we have valid values
        let changeText = 'N/A';
        let cssClass = '';

        if (currentPrice !== undefined && currentPrice !== null &&
            prevClose !== undefined && prevClose !== null &&
            !isNaN(currentPrice) && !isNaN(prevClose) && prevClose !== 0) {

            const change = currentPrice - prevClose;
            const changePercent = (change / prevClose) * 100;
            cssClass = change >= 0 ? 'positive' : 'negative';
            const changeSign = change >= 0 ? '+' : '';
            changeText = `${changeSign}$${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;

            // debugLog is defined in config.js
            debugLog(`Calculated comparison change:`, {
                change: change,
                changePercent: changePercent,
                formattedText: changeText
            });
        } else {
            // debugLog is defined in config.js
            debugLog(`Unable to calculate comparison change due to invalid values`);
        }

        createInfoCard(
            stockInfoPanel,
            'Change',
            changeText,
            cssClass
        );

        // Previous Close card
        createInfoCard(stockInfoPanel, 'Previous Close', `$${prevClose?.toFixed(2) || 'N/A'}`);

        // Min/Max During Period
        if (comparisonData.high && comparisonData.high.length && comparisonData.low && comparisonData.low.length) {
            // Filter out null/undefined values
            const highValues = comparisonData.high.filter(val => val !== null && val !== undefined && !isNaN(val));
            const lowValues = comparisonData.low.filter(val => val !== null && val !== undefined && !isNaN(val));

            // debugLog is defined in config.js
            debugLog(`Comparison high/low values:`, {
                highValues: highValues.length > 10 ?
                    `${highValues.length} values, first few: ${highValues.slice(0, 5)}` :
                    highValues,
                lowValues: lowValues.length > 10 ?
                    `${lowValues.length} values, first few: ${lowValues.slice(0, 5)}` :
                    lowValues
            });

            if (highValues.length && lowValues.length) {
                const maxPrice = Math.max(...highValues);
                const minPrice = Math.min(...lowValues);

                createInfoCard(stockInfoPanel, 'Period High', `$${maxPrice.toFixed(2)}`);
                createInfoCard(stockInfoPanel, 'Period Low', `$${minPrice.toFixed(2)}`);
            } else {
                // debugLog is defined in config.js
                debugLog(`Not enough valid high/low values for comparison stock`);
                createInfoCard(stockInfoPanel, 'Period High', 'N/A');
                createInfoCard(stockInfoPanel, 'Period Low', 'N/A');
            }
        } else {
            // debugLog is defined in config.js
            debugLog(`Missing high/low data for comparison stock`);
            createInfoCard(stockInfoPanel, 'Period High', 'N/A');
            createInfoCard(stockInfoPanel, 'Period Low', 'N/A');
        }

        // Symbol card
        createInfoCard(stockInfoPanel, 'Symbol', stockSymbol);

        // Chart Period card
        createInfoCard(stockInfoPanel, 'Chart Period', result.meta.range || 'N/A');
    }
}

// Helper function to create info card
function createInfoCard(container, title, value, cssClass = '') {
    const card = document.createElement('div');
    card.className = `info-card ${cssClass}`;

    const titleElement = document.createElement('h3');
    titleElement.textContent = title;

    const valueElement = document.createElement('p');
    valueElement.textContent = value;

    card.appendChild(titleElement);
    card.appendChild(valueElement);
    container.appendChild(card);
}


// Create custom legend for the chart to handle multiple stocks
function updateCustomLegend(series) {
    const legendContainer = document.querySelector('.legend-container');
    if (!legendContainer) return;

    // Clear existing legend items
    legendContainer.innerHTML = '';

    // Define chart colors (same as in chart options in chart.js)
    const colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];

    // Create legend items
    // activeSeries is defined in chart.js
    series.forEach((seriesItem, index) => {
        const color = colors[index % colors.length];
        const isActive = !activeSeries.includes(`hide_${seriesItem.name}`);

        const legendItem = document.createElement('div');
        legendItem.className = `legend-item ${isActive ? '' : 'inactive'}`;
        legendItem.setAttribute('data-series', seriesItem.name);
        legendItem.onclick = () => toggleSeries(seriesItem.name); // toggleSeries is below

        const colorBox = document.createElement('span');
        colorBox.className = 'legend-color';
        colorBox.style.backgroundColor = color;

        const textSpan = document.createElement('span');
        textSpan.textContent = seriesItem.name;

        legendItem.appendChild(colorBox);
        legendItem.appendChild(textSpan);
        legendContainer.appendChild(legendItem);
    });
}

// Toggle series visibility
function toggleSeries(seriesName) {
    // debugLog is defined in config.js
    // activeSeries and renderChartWithCurrentData are defined in chart.js
    debugLog(`Toggling visibility for series: ${seriesName}`);

    // Find the index in activeSeries
    const hideKey = `hide_${seriesName}`;
    const isCurrentlyActive = !activeSeries.includes(hideKey);

    // Toggle the active state
    if (isCurrentlyActive) {
        // Currently active, hide it
        activeSeries = activeSeries.filter(s => s !== seriesName);
        activeSeries.push(hideKey);
    } else {
        // Currently hidden, show it
        activeSeries = activeSeries.filter(s => s !== hideKey);
        activeSeries.push(seriesName);
    }

    // Update the legend UI
    const legendItem = document.querySelector(`.legend-item[data-series="${seriesName}"]`);
    if (legendItem) {
        if (isCurrentlyActive) {
            legendItem.classList.add('inactive');
        } else {
            legendItem.classList.remove('inactive');
        }
    }

    // Re-render the chart
    renderChartWithCurrentData();
} 