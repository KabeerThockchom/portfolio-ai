// Store the RapidAPI key
let rapidApiKey = '';

// Chart objects
let stockChart = null;

// Store the current chart data and settings
let currentChartData = null;
let currentSymbol = '';
let comparisonSymbols = [];
let currentChartView = 'price';
let selectedStock = ''; // Currently selected stock for the info panel
let activeSeries = []; // Track which series are active/visible

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

function startAssistant() {
    console.log('Starting portfolio assistant...');
    // Initialize WebRTC connection when user clicks the button
    setupWebRTC();
}

// Initialize empty chart
function initEmptyChart() {
    const options = {
        series: [{
            name: 'Stock Price',
            data: []
        }],
        chart: {
            type: 'area',
            height: 350,
            fontFamily: 'Segoe UI, sans-serif',
            toolbar: {
                show: true,
                tools: {
                    download: true,
                    selection: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    pan: true,
                    reset: true
                }
            },
            zoom: {
                enabled: true
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        colors: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'],
        grid: {
            borderColor: '#f1f1f1',
            row: {
                colors: ['transparent', 'transparent'],
                opacity: 0.2
            }
        },
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false,
                style: {
                    fontSize: '12px',
                    fontFamily: 'Segoe UI, sans-serif'
                }
            },
            axisBorder: {
                show: true,
                color: '#e0e0e0'
            },
            axisTicks: {
                show: true,
                color: '#e0e0e0'
            }
        },
        yaxis: {
            labels: {
                formatter: function (val) {
                    return '$' + val.toFixed(2);
                },
                style: {
                    fontSize: '12px',
                    fontFamily: 'Segoe UI, sans-serif'
                }
            },
            tickAmount: 5
        },
        tooltip: {
            x: {
                format: 'MMM dd, yyyy'
            },
            y: {
                formatter: function(val) {
                    return '$' + val.toFixed(2);
                }
            },
            theme: 'light',
            shared: true,
            intersect: false,
            style: {
                fontSize: '12px',
                fontFamily: 'Segoe UI, sans-serif'
            }
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            fontSize: '14px',
            fontFamily: 'Segoe UI, sans-serif',
            offsetY: -15,
            markers: {
                width: 10,
                height: 10,
                radius: 6
            }
        },
        title: {
            text: 'Stock Price Chart',
            align: 'center',
            style: {
                fontSize: '18px',
                fontFamily: 'Segoe UI, sans-serif',
                fontWeight: 600,
                color: '#2c3e50'
            }
        },
        subtitle: {
            text: 'Enter a stock symbol to see data',
            align: 'center',
            style: {
                fontSize: '14px',
                fontFamily: 'Segoe UI, sans-serif',
                color: '#7f8c8d'
            }
        },
        markers: {
            size: 0,
            hover: {
                size: 5
            }
        },
        noData: {
            text: 'No data available',
            align: 'center',
            verticalAlign: 'middle',
            offsetY: 0,
            style: {
                color: '#999',
                fontSize: '14px',
                fontFamily: 'Segoe UI, sans-serif'
            }
        }
    };

    stockChart = new ApexCharts(document.querySelector("#stockChart"), options);
    stockChart.render();
}

// Call initEmptyChart when the page loads
document.addEventListener('DOMContentLoaded', initEmptyChart);

// Change the chart view (price, percent, relative)
function changeChartView() {
    const viewSelect = document.getElementById('chartView');
    currentChartView = viewSelect.value;
    
    debugLog(`Chart view changed to: ${currentChartView}`);
    
    if (currentChartData) {
        // Re-render the chart with the new view
        renderChartWithCurrentData();
    }
}

// Switch the selected stock for info display
function selectStock(symbol) {
    selectedStock = symbol;
    
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
    if (currentChartData) {
        updateInfoPanel(currentChartData, symbol);
    }
}

// Create stock selector tabs
function createStockSelectorTabs(mainSymbol, compSymbols = []) {
    const stockSelector = document.getElementById('stockSelector');
    stockSelector.innerHTML = ''; // Clear existing tabs
    
    const allSymbols = [mainSymbol, ...compSymbols];
    
    debugLog(`Creating stock selector tabs for: ${allSymbols.join(', ')}`);
    
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
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) return;
    
    const stockInfoPanel = document.getElementById('stockInfoPanel');
    stockInfoPanel.innerHTML = ''; // Clear existing cards
    
    // If we're showing the main stock
    if (stockSymbol === currentSymbol) {
        const result = chartData.chart.result[0];
        const meta = result.meta || {};
        
        debugLog(`Updating info panel for main stock: ${stockSymbol}`, meta);
        
        // Current Price card
        createInfoCard(stockInfoPanel, 'Current Price', `$${meta.regularMarketPrice?.toFixed(2) || 'N/A'}`);
        
        // Price Change card
        const change = meta.regularMarketPrice - meta.chartPreviousClose;
        const changePercent = (change / meta.chartPreviousClose) * 100;
        
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
            debugLog(`No comparison data found for: ${stockSymbol}`);
            return;
        }
        
        debugLog(`Updating info panel for comparison stock: ${stockSymbol}`, comparisonData);
        
        // Current Price card
        const currentPrice = comparisonData.close[comparisonData.close.length - 1];
        createInfoCard(stockInfoPanel, 'Current Price', `$${currentPrice?.toFixed(2) || 'N/A'}`);
        
        // Change card
        const prevClose = comparisonData.previousClose || comparisonData.chartPreviousClose;
        
        // Log the values we're working with
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
            
            debugLog(`Calculated comparison change:`, {
                change: change,
                changePercent: changePercent,
                formattedText: changeText
            });
        } else {
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
                debugLog(`Not enough valid high/low values for comparison stock`);
                createInfoCard(stockInfoPanel, 'Period High', 'N/A');
                createInfoCard(stockInfoPanel, 'Period Low', 'N/A');
            }
        } else {
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

// Add annotations to chart for events
function addEventAnnotations(chart, chartData) {
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) return;
    
    const result = chartData.chart.result[0];
    
    // Check if there are events to annotate
    if (!result.events) return;
    
    debugLog(`Processing event annotations`, result.events);
    
    const annotations = {
        xaxis: []
    };
    
    // Add dividend annotations
    if (result.events.dividends) {
        Object.values(result.events.dividends).forEach(dividend => {
            annotations.xaxis.push({
                x: new Date(dividend.date * 1000).getTime(),
                borderColor: '#27ae60',
                label: {
                    borderColor: '#27ae60',
                    style: {
                        color: '#fff',
                        background: '#27ae60'
                    },
                    text: `Dividend: $${dividend.amount}`
                }
            });
        });
    }
    
    // Add split annotations
    if (result.events.splits) {
        Object.values(result.events.splits).forEach(split => {
            annotations.xaxis.push({
                x: new Date(split.date * 1000).getTime(),
                borderColor: '#9b59b6',
                label: {
                    borderColor: '#9b59b6',
                    style: {
                        color: '#fff',
                        background: '#9b59b6'
                    },
                    text: `Split: ${split.numerator}:${split.denominator}`
                }
            });
        });
    }
    
    // Add earnings annotations
    if (result.events.earnings) {
        Object.values(result.events.earnings).forEach(earning => {
            annotations.xaxis.push({
                x: new Date(earning.date * 1000).getTime(),
                borderColor: '#f39c12',
                label: {
                    borderColor: '#f39c12',
                    style: {
                        color: '#fff',
                        background: '#f39c12'
                    },
                    text: 'Earnings'
                }
            });
        });
    }
    
    if (annotations.xaxis.length > 0) {
        debugLog(`Adding ${annotations.xaxis.length} event annotations to chart`);
        chart.updateOptions({
            annotations: annotations
        });
    }
}

// Process chart data based on the selected view mode
function processChartData(chartData, symbol, viewMode = 'price') {
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
        debugLog(`Invalid chart data for processing`);
        return null;
    }

    const result = chartData.chart.result[0];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators.quote[0] || {};
    const closes = quotes.close || [];
    const metadata = result.meta || {};
    
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
    
    debugLog(`Main series data points: ${mainSeriesData ? mainSeriesData.length : 0}`);
    
    const series = [{
        name: seriesName,
        data: mainSeriesData || []
    }];
    
    // Process comparison data if available
    if (result.comparisons && result.comparisons.length > 0) {
        debugLog(`Processing ${result.comparisons.length} comparison stock(s)`);
        
        const comparisonSeries = result.comparisons.map(comparison => {
            const compSymbol = comparison.symbol;
            const compClose = comparison.close || [];
            
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

// Render chart with current data and selected view
function renderChartWithCurrentData() {
    if (!currentChartData) return;
    
    debugLog(`Rendering chart with current data and view mode: ${currentChartView}`);
    
    const processedData = processChartData(currentChartData, currentSymbol, currentChartView);
    if (!processedData) {
        debugLog(`Failed to process chart data`);
        return;
    }
    
    const { series, metadata, viewMode } = processedData;
    
    // Update activeSeries if needed
    if (activeSeries.length === 0) {
        // Initial setup - all series are active
        activeSeries = series.map(s => s.name);
    } else {
        // Make sure any new series are added to active list
        series.forEach(s => {
            if (!activeSeries.includes(s.name) && !activeSeries.includes(`hide_${s.name}`)) {
                activeSeries.push(s.name);
            }
        });
    }
    
    // Filter series based on active status
    const visibleSeries = series.map(s => {
        // If series is hidden (marked with hide_ prefix), keep the data but set it to hidden
        if (activeSeries.includes(`hide_${s.name}`)) {
            return {
                ...s,
                visible: false
            };
        }
        return s;
    });
    
    // Update chart options based on view mode
    let yaxisFormatter;
    let tooltipYFormatter;
    let chartTitle;
    
    if (viewMode === 'price') {
        yaxisFormatter = function(val) { return '$' + val.toFixed(2); };
        tooltipYFormatter = function(val) { return '$' + val.toFixed(2); };
        chartTitle = `${metadata.shortName || currentSymbol} (${currentSymbol}) Stock Price`;
    } 
    else if (viewMode === 'percent') {
        yaxisFormatter = function(val) { return val.toFixed(2) + '%'; };
        tooltipYFormatter = function(val) { return val.toFixed(2) + '%'; };
        chartTitle = `${metadata.shortName || currentSymbol} (${currentSymbol}) Percent Change`;
    }
    else if (viewMode === 'relative') {
        yaxisFormatter = function(val) { return val.toFixed(2); };
        tooltipYFormatter = function(val) { return val.toFixed(2); };
        chartTitle = `${metadata.shortName || currentSymbol} (${currentSymbol}) Relative Performance`;
    }
    
    // Format subtitle with current price and change
    const change = metadata.regularMarketPrice - metadata.chartPreviousClose;
    const changePercent = (change / metadata.chartPreviousClose) * 100;
    
    // Check for valid values before formatting
    let subtitleText = '';
    let changeColor = '#666';
    
    if (!isNaN(metadata.regularMarketPrice) && !isNaN(change) && !isNaN(changePercent)) {
        const changeSign = change >= 0 ? '+' : '';
        changeColor = change >= 0 ? '#27ae60' : '#e74c3c';
        subtitleText = `Current: $${metadata.regularMarketPrice?.toFixed(2)} | ${changeSign}$${change.toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%)`;
    } else {
        subtitleText = `Current: $${metadata.regularMarketPrice?.toFixed(2) || 'N/A'}`;
        debugLog(`Invalid change values detected:`, {
            regularMarketPrice: metadata.regularMarketPrice,
            chartPreviousClose: metadata.chartPreviousClose,
            calculatedChange: change,
            calculatedChangePercent: changePercent
        });
    }
    
    // Update chart
    stockChart.updateOptions({
        series: visibleSeries,
        title: {
            text: chartTitle,
        },
        subtitle: {
            text: subtitleText,
            style: {
                fontSize: '14px',
                color: changeColor
            }
        },
        yaxis: {
            labels: {
                formatter: yaxisFormatter
            }
        },
        tooltip: {
            x: {
                format: metadata.range === '1d' ? 'HH:mm' : 'MMM dd, yyyy'
            },
            y: {
                formatter: tooltipYFormatter
            }
        }
    });
    
    // Add annotations for events (dividends, splits, earnings)
    if (viewMode === 'price') {
        addEventAnnotations(stockChart, currentChartData);
    } else {
        // Remove annotations for non-price views as they may not align properly
        stockChart.updateOptions({
            annotations: {
                xaxis: []
            }
        });
    }
    
    // Update custom legend
    updateCustomLegend(series);
}

// Create custom legend for the chart to handle multiple stocks
function updateCustomLegend(series) {
    const legendContainer = document.querySelector('.legend-container');
    if (!legendContainer) return;
    
    // Clear existing legend items
    legendContainer.innerHTML = '';
    
    // Define chart colors (same as in chart options)
    const colors = ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6'];
    
    // Create legend items
    series.forEach((seriesItem, index) => {
        const color = colors[index % colors.length];
        const isActive = !activeSeries.includes(`hide_${seriesItem.name}`);
        
        const legendItem = document.createElement('div');
        legendItem.className = `legend-item ${isActive ? '' : 'inactive'}`;
        legendItem.setAttribute('data-series', seriesItem.name);
        legendItem.onclick = () => toggleSeries(seriesItem.name);
        
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

// Render chart with data
function renderStockChart(chartData, symbol) {
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
        console.error('Invalid chart data');
        debugLog(`Invalid chart data received for ${symbol}`);
        hideLoading();
        return;
    }

    // Store the data for later use with different views
    currentChartData = chartData;
    currentSymbol = symbol;
    
    debugLog(`Chart data received for ${symbol}:`, chartData);
    
    // Get comparison symbols if any
    comparisonSymbols = [];
    const result = chartData.chart.result[0];
    if (result.comparisons && result.comparisons.length > 0) {
        comparisonSymbols = result.comparisons.map(comp => comp.symbol);
        debugLog(`Comparison symbols: ${comparisonSymbols.join(', ')}`);
        
        // Log detailed comparison data for debugging
        result.comparisons.forEach(comp => {
            debugLog(`Detailed comparison data for ${comp.symbol}:`, {
                previousClose: comp.previousClose,
                chartPreviousClose: comp.chartPreviousClose,
                closeDataPointsCount: comp.close.length,
                sampleCloseValues: comp.close.slice(0, 5),
                hasHighValues: comp.high ? true : false,
                hasLowValues: comp.low ? true : false
            });
        });
    }
    
    // If this is the first load or no stock is selected, select the main symbol
    if (!selectedStock || selectedStock === '') {
        selectedStock = symbol;
    }
    
    // Create stock selector tabs
    createStockSelectorTabs(symbol, comparisonSymbols);
    
    // Show the chart container
    showChart();
    
    // Update info panel with data for the selected stock
    updateInfoPanel(chartData, selectedStock);
    
    // Render the chart with the current view mode
    renderChartWithCurrentData();
    
    // Hide loading indicator
    hideLoading();
}

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
}

function configureData() {
    console.log('Configuring data channel');
    const event = {
        type: 'session.update',
        session: {
            modalities: ['text', 'audio'],
            // Provide the tools. Note they match the keys in the `fns` object above
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

// Tool functions the AI can call
const fns = {
    // Financial data functions
    getStockChart: async ({ symbol, region, lang, comparisons, useYfid, period1, events, period2, range, interval, includePrePost }) => {
        try {
            // Show loading indicator
            showLoading();
            
            // Parse comparisons if needed (ensure it's properly formatted for the API)
            let formattedComparisons = comparisons;
            if (Array.isArray(comparisons)) {
                formattedComparisons = comparisons.join(',');
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
                    'x-rapidapi-key': rapidApiKey,
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
                hideLoading();
                return { 
                    success: false, 
                    error: result.error 
                };
            }
            
            // Check if main data structure is valid
            if (!result.chart || !result.chart.result || result.chart.result.length === 0) {
                console.error(`Invalid response structure for ${symbol}`);
                debugLog(`Invalid response structure:`, result);
                hideLoading();
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
                
                // Add exchange information
                summary += `Exchange: ${meta.exchangeName || 'N/A'}\n`;
                
                // Add timezone information
                summary += `Timezone: ${meta.timezone || 'N/A'}\n`;
                
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
                    
                    summary += `Market State: ${marketState}\n`;
                }
                
                // Add comparison data if available
                if (chartData.comparisons && chartData.comparisons.length > 0) {
                    summary += `\nComparison Stocks (${chartData.comparisons.length}):\n`;
                    chartData.comparisons.forEach(comp => {
                        const compLastClose = comp.close[comp.close.length-1];
                        const compPrevClose = comp.previousClose;
                        
                        // Check for valid data
                        if (compLastClose !== undefined && compPrevClose !== undefined && 
                            !isNaN(compLastClose) && !isNaN(compPrevClose) && compPrevClose !== 0) {
                            
                            const compChange = compLastClose - compPrevClose;
                            const compChangePercent = (compChange / compPrevClose) * 100;
                            
                            summary += `- ${comp.symbol}: $${compLastClose.toFixed(2)} (${compChange > 0 ? '+' : ''}${compChangePercent.toFixed(2)}%)\n`;
                        } else {
                            // Fallback for invalid data
                            summary += `- ${comp.symbol}: $${compLastClose?.toFixed(2) || 'N/A'}\n`;
                        }
                    });
                }
                
                // Add events information if available
                if (chartData.events) {
                    if (chartData.events.dividends) {
                        const latestDividend = Object.values(chartData.events.dividends).sort((a, b) => b.date - a.date)[0];
                        if (latestDividend) {
                            const dividendDate = new Date(latestDividend.date * 1000).toLocaleDateString();
                            summary += `\nLatest Dividend: $${latestDividend.amount} on ${dividendDate}\n`;
                        }
                    }
                    
                    if (chartData.events.splits) {
                        const latestSplit = Object.values(chartData.events.splits).sort((a, b) => b.date - a.date)[0];
                        if (latestSplit) {
                            const splitDate = new Date(latestSplit.date * 1000).toLocaleDateString();
                            summary += `Latest Split: ${latestSplit.numerator}:${latestSplit.denominator} on ${splitDate}\n`;
                        }
                    }
                }
                
                // Add view mode information
                summary += `\nAvailable Chart Views: Price, Percent Change, Relative Performance\n`;
                summary += `You can compare stocks and switch between them to see individual statistics.\n`;
            }
            
            return { 
                success: true, 
                chartData: result,
                summary
            };
        } catch (error) {
            console.error('Error fetching stock chart:', error);
            debugLog(`Error fetching stock chart:`, error);
            hideLoading();
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
