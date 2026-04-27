const OpenAI = require("openai");
const { env } = require("../config/env");

const client = env.openai.apiKey ? new OpenAI({ apiKey: env.openai.apiKey }) : null;

async function estimatePrice({ category, item, condition, age }) {
  if (!client) throw new Error("OpenAI is not configured");
  const prompt = `You are a marketplace pricing expert for Indian college students. Estimate the resale/rental value of: ${item} in ${condition} condition, ${age} old. Category: ${category}. Consider Indian market prices, student budget range, and depreciation. Return JSON: {sellPrice: number, rentPerDay: number, reasoning: string}`;
  const response = await client.responses.create({ model: "gpt-4o-mini", input: prompt });
  const text = response.output_text || "{}";
  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
}

async function scoreCondition(imageUrl) {
  if (!client) throw new Error("OpenAI is not configured");
  const response = await client.responses.create({
    model: "gpt-4o",
    input: [{ role: "user", content: [
      { type: "input_text", text: "Score this item condition from 1-10 and explain briefly. Return JSON {score:number, reasoning:string}" },
      { type: "input_image", image_url: imageUrl }
    ]}]
  });
  const text = response.output_text || "{}";
  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
}

module.exports = { estimatePrice, scoreCondition };
