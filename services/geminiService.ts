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
    contrastPivot: { type: Type.NUMBER, description: "Contrast pivot (usually 0.435)" },
    skinProtect: { type: Type.NUMBER, description: "Skin protection strength (0.0 to 1.0)" }
  },
  required: ["lift", "gamma", "gain", "saturation", "temperature", "tint", "contrast", "contrastPivot", "skinProtect"]
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
      contents: `
      ROLE: Senior Hollywood Color Scientist (v2.1 Pro).
      TASK: Translate "User Vibe" into signal-safe ASC-CDL JSON.
      RULES:
      1. HARMONY: "Teal & Orange" -> Lift Cyan (-R, +B), Gain Orange (+R, -B). "Cyberpunk" -> Gain Magenta/Green.
      2. SAFETY: Lift [-0.15, 0.15], Gamma [0.8, 1.2], Gain [0.5, 1.8].
      3. FEATURES: If look is heavy/tinted, set 'skinProtect' to 0.5+. Default 'contrastPivot' to 0.435.
      OUTPUT: JSON object { lift, gamma, gain, saturation, temperature, tint, contrast, contrastPivot, skinProtect }.
      
      User Vibe: "${vibe}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: colorParamsSchema,
        temperature: 0.4,
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    const data = JSON.parse(jsonText);
    
    return {
      ...DEFAULT_PARAMS,
      ...data
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
