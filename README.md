# Vibe Engine v2.1 Pro Beta

**AI-Powered Color Grading Engine for Filmmakers**

Vibe Engine allows you to generate professional film looks using AI and export them as 3D LUTs for use in DaVinci Resolve, Premiere Pro, and other NLEs.

## Features

- **AI Color Science**: Translate text prompts (e.g., "Matrix green sci-fi", "Vintage 70s Kodak") into precise color grading parameters.
- **Signal Safety (ASC-CDL)**: Ensures all generated looks stay within broadcast-safe limits using industry-standard ASC-CDL math.
- **3D LUT Export**: Direct export of high-quality .CUBE files compatible with all major editing software.
- **Smart Skin Protection**: Automatically isolates and preserves skin tones while grading.
- **Auto White Balance**: One-click Grey World Assumption white balance.

## Usage Guide

1. **Import Image**: Click "Import Image" to load a reference still from your footage.
2. **Describe Your Look**: Type a description into the AI Vibe Generator (e.g., "Moody cyberpunk night", "Wes Anderson pastel").
3. **Generate**: Click "Generate Look" and wait for the AI to analyze and apply the grade.
4. **Refine**: Use the manual controls (Lift, Gamma, Gain, Temperature, Tint) to fine-tune the result.
5. **Export**:
   - **Download .CUBE**: Get a standard LUT file.
   - **Export to Resolve**: Get a tailored blueprint and LUT for DaVinci Resolve workflow.

## CRITICAL WORKFLOW: DaVinci Resolve

To ensure the look matches what you see in the engine, follow these rules based on your node tree:

### Option A: Using a Color Space Transform (CST) [RECOMMENDED]
If you place the LUT node **after** a CST node that converts your Log footage to Rec.709:
- **TURN OFF 'Log Footage'** in Vibe Engine.
- The engine expects standard Rec.709 input.

### Option B: Grading Raw Log Footage
If you are applying the LUT directly to Log footage (e.g., S-Log3, V-Log) without a prior transform:
- **TURN ON 'Log Footage'** in Vibe Engine.
- This tells the engine to linearize the Log signal before processing, ensuring correct math application.

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **AI**: Gemini Flash 2.0
- **Language**: TypeScript

---

*v2.1.0-beta | Built for professional colorists.*
