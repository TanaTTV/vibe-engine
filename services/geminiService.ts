import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ColorParams, DEFAULT_PARAMS } from '../types';

// Define the response schema for Gemini
const colorParamsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    lift: {
      type: Type.OBJECT,
      properties: {
        r: { type: Type.NUMBER, description: "Shadow red offset (-0.2 to 0.2)" },
        g: { type: Type.NUMBER, description: "Shadow green offset (-0.2 to 0.2)" },
        b: { type: Type.NUMBER, description: "Shadow blue offset (-0.2 to 0.2)" }
      },
      required: ["r", "g", "b"]
    },
    gamma: {
      type: Type.OBJECT,
      properties: {
        r: { type: Type.NUMBER, description: "Midtone red power (0.5 to 2.0)" },
        g: { type: Type.NUMBER, description: "Midtone green power (0.5 to 2.0)" },
        b: { type: Type.NUMBER, description: "Midtone blue power (0.5 to 2.0)" }
      },
      required: ["r", "g", "b"]
    },
    gain: {
      type: Type.OBJECT,
      properties: {
        r: { type: Type.NUMBER, description: "Highlight red mult (0.5 to 2.0)" },
        g: { type: Type.NUMBER, description: "Highlight green mult (0.5 to 2.0)" },
        b: { type: Type.NUMBER, description: "Highlight blue mult (0.5 to 2.0)" }
      },
      required: ["r", "g", "b"]
    },
    saturation: { type: Type.NUMBER, description: "Saturation multiplier (0.0 to 2.0)" },
    temperature: { type: Type.NUMBER, description: "Color temp shift (-1.0 cool to 1.0 warm)" },
    tint: { type: Type.NUMBER, description: "Tint shift (-1.0 green to 1.0 magenta)" },
    contrast: { type: Type.NUMBER, description: "Contrast (0.5 to 1.5)" },
  },
  required: ["lift", "gamma", "gain", "saturation", "temperature", "tint", "contrast"]
};

export const generateParamsFromVibe = async (vibe: string): Promise<ColorParams> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a professional Hollywood Colorist.
      Translate the user's "vibe" description into mathematical color grading parameters (ASC-CDL based).
      
      User Vibe: "${vibe}"
      
      Rules:
      1. For "Vintage" or "Film" looks, often lift shadows slightly (Lift > 0) and push warmth.
      2. For "Sci-Fi" or "Matrix", push Green in Gain/Gamma.
      3. For "Bleach Bypass", high contrast, low saturation.
      4. Ensure values are subtle. Do not break the image.
      5. Lift ranges are small (approx -0.1 to 0.1).
      6. Gamma/Gain centered at 1.0.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: colorParamsSchema,
        temperature: 0.4, // Lower temperature for more consistent/safe results
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const data = JSON.parse(jsonText);
    
    // Merge with default to ensure contrastPivot exists (AI doesn't predict pivot usually)
    return {
      ...DEFAULT_PARAMS,
      ...data,
      contrastPivot: 0.435 
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
