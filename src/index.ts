import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Define the environment variable interface
interface Env {
  OPENAI_API_KEY: string;
  RAPID_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();
app.use(cors());

const DEFAULT_INSTRUCTIONS = `You are a helpful and knowledgeable portfolio assistant.

You can provide financial insights, market data, and recommendations based on stock information.
Use the available tools to fetch real-time market data and explain the significance of the information to users.
Be customer-friendly, clear, and concise in your explanations of financial concepts and market trends.
`;

// Updated for Azure OpenAI
app.get('/session', async (c) => {
  const response = await fetch("https://voiceaistudio9329552017.cognitiveservices.azure.com/openai/realtimeapi/sessions?api-version=2025-04-01-preview", {
    method: "POST",
    headers: {
      "api-key": c.env.OPENAI_API_KEY, // Using the same env variable
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-realtime-preview",
      voice: "verse",
      instructions: DEFAULT_INSTRUCTIONS,
    }),
  });
  const result = await response.json();
  return c.json({result});
});

// Add endpoint to provide RapidAPI key to client
app.get('/api-keys', (c) => {
  return c.json({
    rapidApiKey: c.env.RAPID_API_KEY
  });
});

export default app;