import { GoogleGenAI, Type } from "@google/genai";
import { ExpenseCategory, AIParseResult } from "../types";

// Initialize the Gemini API client
// Note: In a real production app, ensure this key is guarded. 
// For this demo, we assume process.env.API_KEY is available.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Parses natural language text into a structured expense object using Gemini.
 */
export const parseExpenseWithAI = async (
  text: string, 
  memberNames: string[]
): Promise<AIParseResult | null> => {
  try {
    const prompt = `
      You are a helpful expense tracker assistant. 
      Parse the following expense description into structured data.
      
      Current Group Members: ${memberNames.join(", ")}.
      
      User Input: "${text}"
      
      Rules:
      1. Map names in input to the closest matching group member.
      2. If 'me' or 'I' is used, leave payerName as null (UI will handle it).
      3. Infer the category from the description.
      4. If everyone is involved, list all names.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            payerName: { type: Type.STRING, nullable: true },
            category: { type: Type.STRING, enum: Object.values(ExpenseCategory) },
            involvedNames: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["description", "amount", "category", "involvedNames"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AIParseResult;
    }
    return null;
  } catch (error) {
    console.error("Gemini parse error:", error);
    return null;
  }
};

/**
 * Generates a friendly settlement summary or insight using Gemini.
 */
export const generateSettlementInsight = async (
  settlements: { from: string; to: string; amount: number }[],
  memberMap: Record<string, string> // ID -> Name
): Promise<string> => {
  try {
    if (settlements.length === 0) return "All settled up! Nothing to analyze.";

    const settlementText = settlements.map(s => 
      `${memberMap[s.from]} owes ${memberMap[s.to]} ${s.amount.toFixed(2)}`
    ).join(", ");

    const prompt = `
      Analyze these debts: ${settlementText}.
      Provide a brief, fun, and encouraging summary of the financial situation for the group. 
      Keep it under 50 words.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || "Calculations complete.";
  } catch (error) {
    console.error("Gemini insight error:", error);
    return "Your debts are calculated below.";
  }
};
