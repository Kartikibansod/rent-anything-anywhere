const { env } = require("../config/env");

const systemPrompt = `You are an expert Indian marketplace pricing analyst for student hostel items.
Estimate resale and rental value based on:
- Indian pricing (Amazon, Flipkart, OLX)
- student budget sensitivity
- depreciation

Return ONLY JSON:
{
  "sellPrice":{"min":number,"max":number,"recommended":number},
  "rentPerDay":{"min":number,"max":number,"recommended":number},
  "reasoning":string,
  "confidence":string
}`;

function grokConfigured() {
  return Boolean(env.grok.apiKey);
}

async function callGrok(messages) {
  if (!grokConfigured()) {
    const error = new Error("AI estimator not configured");
    error.statusCode = 503;
    throw error;
  }

  // xAI Grok exposes an OpenAI-compatible chat completions API.
  const response = await fetch(`${env.grok.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.grok.apiKey}`
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      temperature: 0.2,
      messages
    })
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Grok request failed: ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
}

async function estimatePrice({ category, title, item, condition, itemAge, age, description }) {
  const text = `Estimate resale/rental value of: ${title || item}
Category: ${category}
Condition: ${condition}
Age: ${itemAge || age}
Description: ${description}
Consider Indian market prices (Amazon, Flipkart, OLX), student budgets, and depreciation.
Return ONLY valid JSON with sellPrice, rentPerDay, reasoning, and confidence.`;

  return callGrok([
    { role: "system", content: systemPrompt },
    { role: "user", content: text }
  ]);
}

async function scoreCondition() {
  const error = new Error("Condition image scoring requires GROK vision support and is not enabled for this endpoint");
  error.statusCode = 503;
  throw error;
}

module.exports = { estimatePrice, grokConfigured, scoreCondition };
