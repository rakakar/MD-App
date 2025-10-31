
import { GoogleGenAI, Type } from "@google/genai";

// IMPORTANT: In a production app, this API key should not be exposed on the client side.
// This service should be a client for a secure backend (e.g., Google Cloud Function)
// that manages the API key and makes calls to the Gemini API.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. AI features will be disabled. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const summarizeText = async (text: string): Promise<string> => {
  if (!API_KEY) return "AI features are disabled. API key is missing.";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following discussion thread body in three concise bullet points:\n\n---\n\n${text}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing text:", error);
    return "Could not generate summary.";
  }
};

export const generateTags = async (text: string): Promise<string[]> => {
  if (!API_KEY) return ["AI Disabled"];
  try {
     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Based on the following text, generate up to 5 relevant topic tags. The text is from a discussion about Madhyasth Darshan philosophy. Examples of tags could be 'Jeevan Vidya', 'Coexistence', 'Consciousness', 'Family', 'Education'.\n\n---\n\n${text}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    tags: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING
                        }
                    }
                }
            }
        }
     });

    const jsonString = response.text;
    const result = JSON.parse(jsonString);
    return result.tags || [];
  } catch (error) {
    console.error("Error generating tags:", error);
    return ["Error"];
  }
};
