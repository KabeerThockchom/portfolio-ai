// Chart objects
let stockChart = null; // This will be instance of ApexCharts

// Store the current chart data and settings
// These variables are used by multiple functions and might need to be managed
// in a shared scope or passed around if not using global scope.
// For simplicity in this initial breakdown, they are kept here.
// Consider a more robust state management approach for a larger application.
let currentChartData = null;
let currentSymbol = '';
let comparisonSymbols = [];
let currentChartView = 'price';
let activeSeries = []; // Track which series are active/visible


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

// Change the chart view (price, percent, relative)
function changeChartView() {
    const viewSelect = document.getElementById('chartView');
    currentChartView = viewSelect.value;

    // debugLog is defined in config.js
    debugLog(`Chart view changed to: ${currentChartView}`);

    if (currentChartData) {
        // Re-render the chart with the new view
        renderChartWithCurrentData();
    }
}

// Add annotations to chart for events
function addEventAnnotations(chart, chartData) {
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) return;

    const result = chartData.chart.result[0];

    // Check if there are events to annotate
    if (!result.events) return;

    // debugLog is defined in config.js
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

// Render chart with current data and selected view
function renderChartWithCurrentData() {
    if (!currentChartData) return;

    // debugLog is defined in config.js
    debugLog(`Rendering chart with current data and view mode: ${currentChartView}`);

    // processChartData is defined in dataProcessing.js
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
        debugLog(`Invalid change values detected:`, { // debugLog from config.js
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

    // Update custom legend (updateCustomLegend is defined in ui.js)
    updateCustomLegend(series);
}


// Render chart with data
function renderStockChart(chartData, symbol) {
    if (!chartData || !chartData.chart || !chartData.chart.result || chartData.chart.result.length === 0) {
        console.error('Invalid chart data');
        // debugLog is defined in config.js
        debugLog(`Invalid chart data received for ${symbol}`);
        hideLoading(); // hideLoading is defined in ui.js
        return;
    }

    // Store the data for later use with different views
    currentChartData = chartData;
    currentSymbol = symbol;

    debugLog(`Chart data received for ${symbol}:`, chartData); // debugLog from config.js

    // Get comparison symbols if any
    comparisonSymbols = [];
    const result = chartData.chart.result[0];
    if (result.comparisons && result.comparisons.length > 0) {
        comparisonSymbols = result.comparisons.map(comp => comp.symbol);
        debugLog(`Comparison symbols: ${comparisonSymbols.join(', ')} `); // debugLog from config.js

        // Log detailed comparison data for debugging
        result.comparisons.forEach(comp => {
            debugLog(`Detailed comparison data for ${comp.symbol}:`, { // debugLog from config.js
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
    // selectedStock is defined in ui.js (or needs to be managed globally)
    if (!selectedStock || selectedStock === '') {
        selectedStock = symbol;
    }

    // Create stock selector tabs (createStockSelectorTabs is defined in ui.js)
    createStockSelectorTabs(symbol, comparisonSymbols);

    // Show the chart container (showChart is defined in ui.js)
    showChart();

    // Update info panel with data for the selected stock
    // updateInfoPanel is defined in ui.js
    updateInfoPanel(chartData, selectedStock);

    // Render the chart with the current view mode
    renderChartWithCurrentData();

    // Hide loading indicator (hideLoading is defined in ui.js)
    hideLoading();
} 