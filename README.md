# Vibe Engine v2.1 Pro Beta

**AI-Powered Color Grading Engine for Filmmakers**

Vibe Engine allows you to generate professional film looks using AI and export them as 3D LUTs for use in DaVinci Resolve, Premiere Pro, and other NLEs.

![Vibe Engine Interface](https://via.placeholder.com/800x450.png?text=Vibe+Engine+Interface)

## 📚 Documentation

- **[User Guide](./docs/USER_GUIDE.md)**: How to use the web interface, AI generator, and manual controls.
- **[Resolve Integration Guide](./docs/RESOLVE_WORKFLOW.md)**: How to use the Python automation bridge to sync with DaVinci Resolve.
- **[Exporting CST Frames](./docs/EXPORT_CST.md)**: How to get the correct "base image" from DaVinci Resolve.

## 🚀 Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run the App**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Create a Look**:
   - Import a still frame.
   - Type a prompt (e.g., "Blade Runner 2049 orange").
   - Click **Generate Look**.

4. **Export**:
   - **Download .CUBE** for general use.
   - **Export to Resolve** for the automated studio workflow.

## ✨ Key Features

- **AI Color Science**: Translate text prompts into precise color grading parameters.
- **Signal Safety**: Internal processing uses ASC-CDL math to ensure broadcast-safe results.
- **Smart Skin Protection**: Automatically isolates and preserves skin tones.
- **DaVinci Resolve Bridge**: Python automation to instantly apply looks in your NLE.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS
- **AI**: Google Gemini Flash 2.0
- **Automation**: Python 3 + DaVinci Resolve Scripting API

---
*v2.1.0-beta | Built for professional colorists.*
