# Vibe Engine User Guide

Welcome to **Vibe Engine**, the AI-powered color grading assistant. This tool allows you to generate professional film looks using natural language and export them for use in your editing software.

## 1. Getting Started

### Launching the App
1. Ensure you have Node.js installed.
2. Open a terminal in the project folder.
3. Run `npm run dev`.
4. Open the URL shown (usually `http://localhost:5173`) in your browser.

## 2. The Interface

### Input Source
- **Import Image**: Click the large blue button to upload a still frame from your footage.
  - *Tip:* Use a high-quality JPEG or PNG export from your timeline for the best accuracy.
- **Log Footage Toggle**: 
  - **OFF (Default)**: Use this if your image is already converted to Rec.709 (standard web/monitor colors). **Recommended workflow.**
  - **ON**: Use this only if you are uploading a raw, washed-out Log image (e.g., S-Log3, V-Log).
- **Auto White Balance**: Analyzes the image and attempts to neutralize color casts using a "Grey World" algorithm.

### AI Vibe Generator
1. Type a description of the look you want into the text box.
   - *Examples:* "Matrix green sci-fi", "Warm golden hour nostalgia", "Cold blue thriller", "Wes Anderson pastel".
2. Click **Generate Look**.
3. The engine will analyze your prompt and animate the color sliders to match the requested "vibe".

### Manual Controls
You can fine-tune the AI's result or grade from scratch using the sliders:

- **Lift (Shadows)**: Controls the darkest parts of the image.
- **Gamma (Midtones)**: Controls the middle brightness values.
- **Gain (Highlights)**: Controls the brightest parts of the image.
- **Contrast**: Expands or contracts the tonal range.
- **Saturation**: Increases or decreases color intensity.
- **Temp**: Adjusts the color temperature (Blue ↔ Orange).
- **Tint**: Adjusts the green/magenta balance.

### Advanced Features
- **Smart Skin Protect**: 
  - This slider isolates skin tones (hues between 35°-50°) and blends them back to their original state.
  - Use this if a strong grade is making people look unnatural.
- **Signal Safe Mode**:
  - When **Enabled**, the engine applies a "rolloff" to highlights to prevent them from clipping (turning pure white).
  - This mimics the behavior of high-end film emulation.

## 3. Exporting

### Download .CUBE
- Creates a standard 3D LUT file.
- Compatible with Premiere Pro, DaVinci Resolve, Final Cut, OBS, and more.

### Export to Resolve (Bridge)
- Downloads two files:
  1. A `.cube` LUT file.
  2. A `.json` "Blueprint" file.
- This is for the **automated workflow** described in the [Resolve Integration Guide](./RESOLVE_WORKFLOW.md).

