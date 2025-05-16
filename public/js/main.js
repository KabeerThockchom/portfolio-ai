// Call fetchApiKeys when the page loads
// fetchApiKeys is defined in api.js
fetchApiKeys();

function startAssistant() {
    console.log('Starting portfolio assistant...');
    // Initialize WebRTC connection when user clicks the button
    // setupWebRTC is defined in webrtc.js
    setupWebRTC();
}

// Call initEmptyChart when the page loads
// initEmptyChart is defined in chart.js
document.addEventListener('DOMContentLoaded', initEmptyChart);

// Event listener for chartView select, if not handled by onchange in HTML
// changeChartView is defined in chart.js
// const chartViewSelect = document.getElementById('chartView');
// if (chartViewSelect) {
//    chartViewSelect.addEventListener('change', changeChartView);
// } 