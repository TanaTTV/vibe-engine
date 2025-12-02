import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ColorParams, DEFAULT_PARAMS } from '../types';

// Define the response schema for Gemini
const colorParamsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    aiThought: { type: Type.STRING, description: "Detailed reasoning for grading decisions, referencing film stocks and exposure." },
    aiPalette: { type: Type.STRING, description: "Short description of the color palette (e.g. 'Teal shadows, warm highlights')." },
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
  required: ["aiThought", "aiPalette", "lift", "gamma", "gain", "saturation", "temperature", "tint", "contrast", "contrastPivot", "skinProtect"]
};

export const generateParamsFromVibe = async (vibe: string, imageBase64?: string): Promise<ColorParams> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // Construct the prompt parts
    const promptText = `
      YOU ARE A MASTER HOLLYWOOD COLORIST (Senior DI Colorist).
      Your goal is to grade the provided image to match the user's requested "Vibe" using strictly ASC-CDL (Slope/Offset/Power) parameters.

      ### CORE PHILOSOPHY: SUBTRACTIVE COLOR & DENSITY
      - Digital color adds light. Film color subtracts light.
      - To make shadows Teal: Do NOT just add Blue. Instead, SUBTRACT Red. This creates "dense", rich blacks.
      - To make warm highlights: Do NOT just add Red. Subtract Blue. This creates creamy, filmic whites.
      - Density: Maintain saturation in midtones but roll it off in deep shadows and bright highlights.

      ### ANALYSIS PROTOCOL (Thinking Process)
      1. **EXPOSURE CHECK**: Look at the input image.
         - Is it dark? -> Lift shadows (Lift > 0).
         - Is it flat/foggy? -> Lower shadows (Lift < 0), Increase Contrast.
         - Is it bright? -> Protect highlights (Gain <= 1.0).
      2. **PALETTE SELECTION**:
         - "Oppenheimer" = Kodak 5222 (B&W) or 5219 (Color). Palette: Teal/Green Shadows, Dirty Golden Highlights. Desaturated but high contrast.
         - "Matrix" = Fuji Eterna + Green bias.
         - "Wes Anderson" = Pastel, low contrast, warm.
      3. **CDL MAPPING**:
         - **LIFT (Offset)**: Shadows. Use for color tinting the blacks (e.g. -Red for Teal).
         - **GAMMA (Power)**: Midtones. Use for overall brightness and mood.
         - **GAIN (Slope)**: Highlights. Use for white balance and paper-white tint.

      ### STYLE LIBRARY (Specific Recipes)
      1. **OPPENHEIMER / NOLAN**:
         - *Concept*: Bi-color palette. Cyan vs Orange.
         - *Shadows*: Heavy push to Teal (Lift R -0.04, G +0.01, B +0.02).
         - *Mids*: Lower Gamma slightly (0.95) for weight.
         - *Highs*: Warm/Golden (Gain R +0.1, G +0.05, B -0.1).
         - *Sat*: 0.85 (Desaturated).
         - *Contrast*: 1.2 (High).

      2. **BLADE RUNNER 2049**:
         - *Concept*: Monochromatic Orange or Blue.
         - *If "Orange Scene"*: Global warmth (Temp +0.5), Lift Red.
         - *If "Blue Scene"*: Global cool (Temp -0.5), Lift Blue.
         
      3. **VINTAGE KODAK (Portra 400)**:
         - *Concept*: Warmth, nostalgia.
         - *Highlights*: Soft Yellow.
         - *Shadows*: Lifted slightly (milky).

      ### SAFETY LIMITS
      - Lift: [-0.2, 0.2] (Do not break blacks)
      - Gamma: [0.6, 1.4]
      - Gain: [0.5, 2.0]
      - Saturation: [0.0, 2.0]

      ### OUTPUT REQUIREMENT
      Explain your reasoning in 'aiThought'. Be specific: "I see the image is dark, so I am lifting shadows by +0.05. For the Oppenheimer look, I am subtracting Red from the shadows to create a dense Cyan..."
      
      User Vibe: "${vibe}"
    `;

    const contents: any[] = [{ text: promptText }];

    // If we have an image, add it to the prompt
    if (imageBase64) {
      // Remove data URL prefix if present
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
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
