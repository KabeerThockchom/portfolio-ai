# Client Side Tool Calling with Azure OpenAI WebRTC Realtime API

This project is a [Cloudflare Workers](https://developers.cloudflare.com) application using [Hono](https://honojs.dev) that creates an interactive financial portfolio assistant. It demonstrates client-side tool calling by relaying the [Azure OpenAI Realtime API](https://platform.openai.com/docs/api-reference/realtime) over WebRTC.

## Features

- **Voice-Enabled AI Assistant**: Interact with the portfolio assistant using your voice through WebRTC
- **Real-Time Financial Data**: Get current stock prices, charts, and financial metrics
- **Interactive Stock Charts**: View and analyze stock performance with multiple visualization options:
  - Price view (standard price chart)
  - Percent change view (normalized to starting point)
  - Relative performance view (comparison between stocks over time, normalized to 100 at the start)
- **Stock Comparison**: Compare multiple stocks simultaneously on the same chart.
- **Detailed Stock Information**: View key statistics for the selected stock, including:
  - Current price and change (value and percentage)
  - Day's high and low prices
  - 52-week high and low prices
  - Trading volume
  - Previous closing price
  - Exchange information
- **Event Annotations**: See dividends, stock splits, and earnings release dates directly on the price chart.
- **Dynamic UI**:
  - Loading indicators during data fetching.
  - Interactive legend to toggle series visibility on the chart.
  - Tabs to switch between detailed information for different stocks when multiple are charted.

## How It Works

The application uses a client-side tool calling pattern where:

1. The user interacts with an AI assistant through voice using WebRTC.
2. The AI assistant, powered by Azure OpenAI Realtime API, can request to call predefined JavaScript functions directly in the browser.
3. These client-side JavaScript functions fetch real-time financial data (e.g., stock charts, profiles, statistics) using the Yahoo Finance API (via RapidAPI).
4. The fetched data is processed, visualized in interactive charts using ApexCharts, and displayed in information panels.
5. The AI assistant receives a summary of the fetched data or the result of the function call, and provides insights or responds to user queries based on this information.

This architecture minimizes backend complexity by enabling the AI to leverage client-side capabilities for data retrieval and presentation.

## Architecture

- **Frontend**: HTML, CSS, JavaScript with ApexCharts for visualization
- **Backend**: Cloudflare Workers with Hono.js (minimal serverless backend)
- **APIs**:
  - Azure OpenAI Realtime API for AI assistant capabilities
  - Yahoo Finance API (via RapidAPI) for financial data

## Development

### Prerequisites

- Node.js and npm
- Cloudflare account (for Workers)
- Azure OpenAI API key
- RapidAPI key with access to Yahoo Finance API

### Setup

1. Clone the repository

```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

2. Install dependencies

```bash
npm install
```

3. Create a `.dev.vars` file in the root directory with your API keys:

```
OPENAI_API_KEY=your_azure_openai_api_key
RAPID_API_KEY=your_rapidapi_key
```

4. Run the development server

```bash
npm run dev
```

## Deployment

1. Set up your Cloudflare Worker secrets:

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put RAPID_API_KEY
```

2. Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Usage

1. Open the application in your browser
2. Click "Talk to your Assistant" to start the conversation
3. Ask about stocks (e.g., "Show me Apple's stock performance")
4. The assistant will fetch and display the requested information
5. You can ask follow-up questions about the data or request comparisons with other stocks

## Key Files

- `src/index.ts`: Main Cloudflare Worker code (Hono.js) that handles:
  - Serving the frontend static files.
  - Proxying requests to the Azure OpenAI Realtime API to create a session and obtain an ephemeral key.
  - Providing the RapidAPI key to the client securely.
- `public/index.html`: Main HTML file for the web interface, including the structure for charts, controls, and information panels.
- `public/js/`: Directory containing client-side JavaScript:
  - `main.js`: Entry point for client-side logic, initializes API key fetching and WebRTC setup.
  - `config.js`: Client-side configuration (e.g., debug logging).
  - `api.js`: Defines the JavaScript functions (tools) that the AI can call (e.g., `getStockChart`, `getStockProfile`). Handles communication with the Yahoo Finance API.
  - `ui.js`: Manages dynamic UI updates, including loading indicators, stock information panels, stock selection tabs, and custom chart legend.
  - `dataProcessing.js`: Processes raw financial data from the API into formats suitable for different chart views (price, percent change, relative performance).
  - `chart.js`: Handles all aspects of chart rendering and interaction using ApexCharts, including view changes, event annotations, and dynamic updates.
  - `webrtc.js`: Manages the WebRTC connection with the Azure OpenAI Realtime API, including offer/answer exchange, data channel communication for tool calls and responses.
- `public/css/`: Directory containing CSS files for styling the web interface (e.g., `base.css`, `layout.css`, `components.css`, `charts.css`, `responsive.css`).