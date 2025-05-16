# Client Side Tool Calling with Azure OpenAI WebRTC Realtime API

This project is a [Cloudflare Workers](https://developers.cloudflare.com) application using [Hono](https://honojs.dev) that creates an interactive financial portfolio assistant. It demonstrates client-side tool calling by relaying the [Azure OpenAI Realtime API](https://platform.openai.com/docs/api-reference/realtime) over WebRTC.

## Features

- **Voice-Enabled AI Assistant**: Interact with the portfolio assistant using your voice through WebRTC
- **Real-Time Financial Data**: Get current stock prices, charts, and financial metrics
- **Interactive Stock Charts**: View and analyze stock performance with multiple visualization options:
  - Price view (standard price chart)
  - Percent change view (normalized to starting point)
  - Relative performance view (comparison between stocks)
- **Stock Comparison**: Compare multiple stocks simultaneously
- **Detailed Stock Information**: View key statistics like current price, change, day range, 52-week range, volume, and more
- **Event Annotations**: See dividends, splits, and earnings events directly on the chart

## How It Works

The application uses a client-side tool calling pattern where:

1. The user interacts with an AI assistant through voice using WebRTC
2. The assistant can call JavaScript functions directly in the browser
3. These functions fetch real-time financial data and visualize it
4. The assistant provides insights based on the data

This eliminates the need for a complex backend, as the Azure OpenAI Realtime API communicates directly with client-side JavaScript functions.

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

- `src/index.ts`: Main Worker code that handles session creation and API key provision
- `public/index.html`: Main HTML file for the web interface
- `public/script.js`: Client-side JavaScript with tool functions for the AI to call
- `public/styles.css`: Styling for the web interface

## License

This project is for demonstration purposes. See license details for more information.