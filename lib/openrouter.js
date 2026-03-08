// OpenRouter API Integration for MIGA
// Handles all AI model calls

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const FAST_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-lite-001';

function getAiRoutes() {
  const primaryKey = process.env.OPENROUTER_API_KEY;
  const backupKey = process.env.OPENROUTER_API_KEY_BACKUP;

  const routes = [];
  if (primaryKey) routes.push({ apiKey: primaryKey, model: FAST_MODEL, label: 'primary' });
  if (backupKey) routes.push({ apiKey: backupKey, model: FAST_MODEL, label: 'backup' });
  return routes;
}

async function chat(messages, options = {}) {
  const routes = getAiRoutes();
  if (!routes.length) throw new Error('OPENROUTER_API_KEY not configured');

  let lastError = null;
  for (const route of routes) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${route.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mindgains.in',
          'X-Title': 'MIGA Education AI'
        },
        body: JSON.stringify({
          model: route.model,
          messages: messages,
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
        })
      });

      if (!response.ok) {
        const error = await response.text();
        lastError = new Error(`OpenRouter API error: ${response.status}`);
        console.error(`OpenRouter ${route.label} route failed:`, error);
        continue;
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      lastError = error;
      console.error(`OpenRouter ${route.label} exception:`, error.message);
    }
  }

  throw lastError || new Error('All AI routes failed');
}

// Chat with MIGA personality
async function chatWithMiga(systemPrompt, userMessage, conversationHistory = []) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  return await chat(messages);
}

// Analyze image (for snap & solve feature)
async function analyzeImage(systemPrompt, imageUrl, userMessage = "Please solve this question and explain step by step.") {
  const routes = getAiRoutes();
  if (!routes.length) throw new Error('OPENROUTER_API_KEY not configured');

  const messages = [
    { role: 'system', content: systemPrompt },
    { 
      role: 'user', 
      content: [
        { type: 'text', text: userMessage },
        { type: 'image_url', image_url: { url: imageUrl } }
      ]
    }
  ];

  let lastError = null;
  for (const route of routes) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${route.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://mindgains.in',
          'X-Title': 'MIGA Education AI'
        },
        body: JSON.stringify({
          model: route.model,
          messages: messages,
          max_tokens: 2048,
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const error = await response.text();
        lastError = new Error(`OpenRouter Vision API error: ${response.status}`);
        console.error(`OpenRouter vision ${route.label} failed:`, error);
        continue;
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      lastError = error;
      console.error(`OpenRouter vision ${route.label} exception:`, error.message);
    }
  }

  throw lastError || new Error('All vision AI routes failed');
}

module.exports = {
  chat,
  chatWithMiga,
  analyzeImage
};
