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
}

export interface LutConfig {
  inputLog: boolean; // True if input is LOG footage
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
