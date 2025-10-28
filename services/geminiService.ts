import { GoogleGenAI } from "@google/genai";

export const suggestServerName = async (): Promise<string> => {
  try {
    // Fix: Initialize GoogleGenAI with API key directly from process.env and
    // remove unnecessary check as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Suggest a cool, futuristic, and creative name for an AI agent server or Multi-agent Computation Platform (MCP). The name should be a single word or a short two-word phrase. Provide only the name itself, with no extra text, quotes, or explanations.',
    });
    
    // Clean up the output to remove potential quotes or extra whitespace.
    const text = response.text.trim().replace(/["*]/g, '');
    return text || "Nexus Core"; // Fallback if Gemini returns an empty string
  } catch (error) {
    console.error("Error suggesting server name with Gemini API:", error);
    // Provide a generic fallback name on error
    return "Synapse Grid";
  }
};