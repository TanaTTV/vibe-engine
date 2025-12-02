export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorParams {
  lift: RGB;
  gamma: RGB;
  gain: RGB;
  saturation: number;
  temperature: number; // -1.0 to 1.0 (Cool to Warm)
  tint: number; // -1.0 to 1.0 (Green to Magenta)
  contrast: number; // 0.5 to 2.0
  contrastPivot: number; // 0.0 to 1.0 (usually 0.435)
  skinProtect: number; // 0.0 to 1.0 (Strength of skin tone protection)
  balance: RGB; // Auto White Balance Multipliers
  
  // AI Metadata
  aiThought?: string; // Explanation of the grade
  aiPalette?: string; // Description of the colors detected/applied
}

export enum InputColorSpace {
  REC709 = 'Rec.709',
  LOG_GENERIC = 'Generic Log',
  ARRI_LOGC3 = 'Arri LogC3',
  SONY_SLOG3 = 'Sony S-Log3',
  CANON_CLOG3 = 'Canon C-Log3'
}

export interface LutConfig {
  inputColorSpace: InputColorSpace; // Replaces inputLog
  safeRange: boolean; // True to enforce strict highlight rolloff
}

export const DEFAULT_PARAMS: ColorParams = {
  lift: { r: 0, g: 0, b: 0 },
  gamma: { r: 1, g: 1, b: 1 },
  gain: { r: 1, g: 1, b: 1 },
  saturation: 1.0,
  temperature: 0,
  tint: 0,
  contrast: 1.0,
  contrastPivot: 0.435,
  skinProtect: 0.0,
  balance: { r: 1, g: 1, b: 1 },
  aiThought: '',
  aiPalette: ''
};

export interface ScopeData {
  histograms: {
    r: Uint32Array;
    g: Uint32Array;
    b: Uint32Array;
    l: Uint32Array;
  };
  vectorscope: Uint32Array; // 256x256 heatmap buffer
}

export interface NodeBlueprint {
  timestamp: number;
  cst: {
    is_log: boolean;
    input_gamma: string; // e.g. "Sony S-Log3"
    output_gamma: string;
  };
  primary: {
    lift: [number, number, number]; // RGB Array
    gamma: [number, number, number];
    gain: [number, number, number];
    saturation: number;
    contrast: number;
    pivot: number;
  };
  look: {
    temp: number;
    tint: number;
    skin_protect: number;
  };
}
