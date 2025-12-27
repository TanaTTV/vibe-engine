# Vibe Engine 🎨

**AI-Powered Color Grading Engine for Filmmakers**

Turn natural language descriptions into professional 3D LUTs. Type "Blade Runner 2049 teal and orange" and get an industry-standard `.cube` file ready for DaVinci Resolve, Premiere Pro, or any NLE.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)

---

## ✨ Features

- **AI Vibe-to-Grade**: Describe a look in plain English → get precise color grading parameters
- **Real Color Science**: ASC-CDL math (Slope/Offset/Power), proper gamut conversions, broadcast-safe output
- **Camera Log Support**: Native IDTs for ARRI LogC3, Sony S-Log3, Canon C-Log3
- **Smart Skin Protection**: Automatically preserves skin tones even with aggressive grades
- **Live Scopes**: Real-time histogram and vectorscope monitoring
- **Industry Export**: Standard 33x33x33 `.cube` LUT files
- **DaVinci Resolve Bridge**: Python automation to sync grades directly to your timeline

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A [Google AI Studio](https://aistudio.google.com/) API key (Gemini)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/vibe-engine.git
cd vibe-engine

# Install dependencies
npm install

# Create environment file
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Basic Usage

1. **Import an image** - Upload a still frame from your footage
2. **Select your camera** - Choose the correct IDT (Input Device Transform) if shooting Log
3. **Describe your vibe** - Type something like "moody noir with cyan shadows" or "warm 70s Kodak film"
4. **Generate** - Click "Generate Look" and watch the AI dial in the grade
5. **Export** - Download the `.cube` file and import it into your NLE

---

## 🎬 How It Works

### The Color Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Camera     │ -> │    IDT      │ -> │  ASC-CDL    │ -> │   Output    │
│  Log/Rec709 │    │  Transform  │    │  Grading    │    │  .cube LUT  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

1. **Input Device Transform (IDT)**: Converts camera-native formats to a working color space
   - ARRI LogC3 / AWG → Rec.709
   - Sony S-Log3 / S-Gamut3.Cine → Rec.709
   - Canon C-Log3 / Cinema Gamut → Rec.709

2. **ASC-CDL Grading**: Industry-standard color correction
   - **Lift** (Offset): Adjusts shadow density
   - **Gamma** (Power): Controls midtone response
   - **Gain** (Slope): Scales highlight brightness

3. **Creative Controls**: Temperature, tint, saturation, contrast

4. **Signal Safety**: Soft-knee rolloff prevents illegal broadcast levels

### AI Color Science

The AI (Google Gemini) acts as a virtual colorist. It receives:
- Your text prompt ("Blade Runner neon noir")
- A detailed system prompt explaining color theory and ASC-CDL math

It returns structured JSON with precise values:
```json
{
  "lift": { "r": -0.02, "g": -0.01, "b": 0.03 },
  "gamma": { "r": 0.95, "g": 1.0, "b": 1.1 },
  "gain": { "r": 1.1, "g": 0.95, "b": 0.85 },
  "saturation": 0.9,
  "temperature": -0.2,
  "contrast": 1.15,
  "skinProtect": 0.7,
  "aiThought": "Creating a cool, high-contrast look with teal shadows..."
}
```

### Smart Skin Protection

The engine detects skin tones using a hue-angle mask (targeting ~35-50° on the vectorscope) and blends them back toward their original state. This prevents the "alien skin" problem common with heavy color grades.

```typescript
// Skin detection heuristic
const getSkinWeight = (r, g, b) => {
  if (r <= g || g <= b) return 0.0;  // Skin is always r > g > b
  const hueNorm = (g - b) / (r - b);
  // Target orange/red hue range
  return smoothstep(0.5, 0.9, hueNorm);
};
```

---

## 📁 Project Structure

```
vibe-engine/
├── App.tsx                 # Main application component
├── index.tsx               # React entry point
├── index.html              # HTML template + Tailwind config
├── types.ts                # TypeScript interfaces
├── vite.config.ts          # Vite build configuration
│
├── components/
│   ├── Controls.tsx        # Left panel with sliders and AI input
│   ├── ImageViewer.tsx     # Canvas preview + Web Worker integration
│   └── Scopes.tsx          # Histogram and vectorscope displays
│
├── services/
│   ├── geminiService.ts    # AI integration (Gemini API)
│   ├── lutEngine.ts        # LUT generation + pixel processing
│   └── colorTransforms.ts  # Camera IDTs and matrix math
│
├── automation/             # DaVinci Resolve integration
│   ├── bridge_server.py    # Flask server for live sync
│   ├── build_grade.py      # Standalone grade applier
│   └── requirements.txt    # Python dependencies
│
└── docs/                   # Additional documentation
    ├── USER_GUIDE.md
    ├── RESOLVE_WORKFLOW.md
    └── EXPORT_CST.md
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_google_ai_studio_key
```

### Tailwind Theme

The UI uses a custom "Resolve-inspired" dark theme defined in `index.html`:

```javascript
colors: {
  resolve: {
    bg: '#0F0F0F',
    panel: '#272727',
    input: '#151515',
    border: '#3E3E3E',
    accent: '#4B88FF',
    text: '#CCCCCC'
  }
}
```

---

## 🎛️ Manual Controls Reference

| Control | Range | Description |
|---------|-------|-------------|
| **Lift R/G/B** | -0.2 to 0.2 | Shadow color offset |
| **Gamma R/G/B** | 0.5 to 2.0 | Midtone power (inverse = brighter) |
| **Gain R/G/B** | 0.5 to 2.0 | Highlight multiplier |
| **Contrast** | 0.5 to 1.5 | Tonal range expansion |
| **Saturation** | 0.0 to 2.0 | Color intensity |
| **Temperature** | -1.0 to 1.0 | Cool (blue) ↔ Warm (orange) |
| **Tint** | -1.0 to 1.0 | Green ↔ Magenta |
| **Skin Protect** | 0.0 to 1.0 | Skin tone preservation strength |

---

## 🔌 DaVinci Resolve Integration

### Prerequisites
- **DaVinci Resolve Studio** (free version doesn't support scripting)
- Python 3.6+
- Enable scripting: Resolve → Preferences → System → General → External Scripting: **Local**

### Live Sync (Bridge Server)

```bash
cd automation
pip install -r requirements.txt
python bridge_server.py
```

This starts a Flask server on `localhost:8000`. Click "Sync to Resolve" in the web app to instantly apply your grade to the selected clip.

### Manual Workflow

1. Click "Export JSON" to download the grade blueprint
2. Run `python automation/build_grade.py`
3. Select the JSON file when prompted
4. The script installs the LUT and applies it to your current node

---

## 🧮 Color Science Deep Dive

### ASC-CDL Formula

The American Society of Cinematographers Color Decision List:

```
output = (input × slope + offset) ^ power
```

In Vibe Engine terms:
- **Slope** = Gain (highlight multiplier)
- **Offset** = Lift (shadow shift)
- **Power** = 1/Gamma (midtone curve)

### Camera Log Transforms

**ARRI LogC3:**
```typescript
// LogC3 → Linear (simplified)
if (val > E * cut + F) {
  return (10^((val - D) / C) - B) / A;
} else {
  return (val - F) / E;
}
```

**Sony S-Log3:**
```typescript
// S-Log3 → Linear
if (val >= 171.2 / 1023) {
  return 10^((val * 1023 - 420) / 261.5) * 0.19 - 0.01;
}
```

### Gamut Conversion Matrices

AWG to Rec.709:
```
[ 1.6175, -0.5373, -0.0802]
[-0.0706,  1.3346, -0.2640]
[-0.0211, -0.2270,  1.2481]
```

---

## 🤝 Contributing

Contributions welcome! Some ideas:

- [ ] Add more camera profiles (RED, Blackmagic, Panasonic)
- [ ] Reference image analysis (match grade to a photo)
- [ ] Preset library system
- [ ] Multi-node grading chains
- [ ] ACES workflow support

### Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
```

---

## 📄 License

MIT License - feel free to use this in personal or commercial projects.

---

## 🙏 Acknowledgments

- Color science references from [ARRI](https://www.arri.com/), [Sony](https://pro.sony/), and [Canon](https://www.usa.canon.com/) white papers
- ASC-CDL specification from the [American Society of Cinematographers](https://theasc.com/)
- UI inspired by DaVinci Resolve's color page

---

**Made with ☕ and too many hours staring at waveform monitors.**
