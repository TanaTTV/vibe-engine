import { ColorParams, LutConfig, RGB } from '../types';

/**
 * Signal Safety Constants
 */
const ROLLOFF_START = 0.8;

const applyRolloff = (val: number): number => {
  if (val <= ROLLOFF_START) return val;
  const x = val - ROLLOFF_START;
  const scale = 1.0 - ROLLOFF_START;
  const compressed = x / (x + 0.5);
  return ROLLOFF_START + (compressed * scale);
};

const applyLogTransform = (val: number): number => {
    const slope = 5.0;
    const offset = 0.5;
    const sigmoid = 1 / (1 + Math.exp(-slope * (val - offset)));
    return (sigmoid - 0.07) * 1.15;
};

const getSkinWeight = (r: number, g: number, b: number): number => {
  if (r <= g || g <= b) return 0.0;
  const chroma = r - b; 
  if (chroma < 0.05) return 0.0;
  if (r < 0.15) return 0.0; 

  const hueNorm = (g - b) / chroma;
  const target = 0.70; 
  const range = 0.20; 
  
  const dist = Math.abs(hueNorm - target);
  if (dist > range) return 0.0;
  
  return 0.5 * (1 + Math.cos((dist / range) * Math.PI));
};

/**
 * Calculates Auto White Balance multipliers using Grey World Assumption.
 * Note: Should be run on image data AFTER log transform if log is active.
 */
export const calculateAutoBalance = (
  data: Uint8ClampedArray, 
  config: LutConfig
): RGB => {
  let sumR = 0, sumG = 0, sumB = 0;
  const len = data.length;
  const pixelCount = len / 4;

  // Sampling for performance if image is huge, but doing full pass is more accurate
  // We'll iterate by 4 (R,G,B,A)
  for (let i = 0; i < len; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    // Must normalize input first if Log, otherwise grey assumption fails on flat footage
    if (config.inputLog) {
      r = applyLogTransform(r);
      g = applyLogTransform(g);
      b = applyLogTransform(b);
    }

    sumR += r;
    sumG += g;
    sumB += b;
  }

  const avgR = sumR / pixelCount || 0.001;
  const avgG = sumG / pixelCount || 0.001;
  const avgB = sumB / pixelCount || 0.001;

  // Grey World: The average of the image should be neutral grey.
  // Find the global luminance average
  const globalAvg = (avgR + avgG + avgB) / 3;

  // Multipliers to bring each channel to the global average
  return {
    r: globalAvg / avgR,
    g: globalAvg / avgG,
    b: globalAvg / avgB
  };
};

/**
 * Core Color Pipeline
 */
export const processPixel = (
  r: number, 
  g: number, 
  b: number, 
  params: ColorParams, 
  config: LutConfig
): RGB => {
  let nr = r;
  let ng = g;
  let nb = b;

  // 1. Input Transform (Log -> Linear-ish)
  if (config.inputLog) {
    nr = applyLogTransform(nr);
    ng = applyLogTransform(ng);
    nb = applyLogTransform(nb);
  }

  // 1.5 Auto White Balance (Step 0 - Upgrade 3)
  // Applied after Log (so we are working in quasi-linear) but before Creative Loop
  nr *= params.balance.r;
  ng *= params.balance.g;
  nb *= params.balance.b;

  // CAPTURE BASE STATE for Skin Mask
  const baseR = nr;
  const baseG = ng;
  const baseB = nb;

  // 2. Temperature & Tint
  const tempShift = params.temperature * 0.15;
  nr += tempShift;
  nb -= tempShift;

  const tintShift = params.tint * 0.15;
  ng += tintShift;

  // 3. ASC-CDL
  nr += params.lift.r;
  ng += params.lift.g;
  nb += params.lift.b;

  nr *= params.gain.r;
  ng *= params.gain.g;
  nb *= params.gain.b;

  const safeGamma = (v: number, g: number) => {
    if (v < 0) return 0;
    return Math.pow(v, 1 / Math.max(0.1, g));
  };
  nr = safeGamma(nr, params.gamma.r);
  ng = safeGamma(ng, params.gamma.g);
  nb = safeGamma(nb, params.gamma.b);

  // 4. Contrast
  nr = (nr - params.contrastPivot) * params.contrast + params.contrastPivot;
  ng = (ng - params.contrastPivot) * params.contrast + params.contrastPivot;
  nb = (nb - params.contrastPivot) * params.contrast + params.contrastPivot;

  // 5. Saturation
  const luma = 0.2126 * nr + 0.7152 * ng + 0.0722 * nb;
  nr = luma + (nr - luma) * params.saturation;
  ng = luma + (ng - luma) * params.saturation;
  nb = luma + (nb - luma) * params.saturation;

  // 6. Smart Skin Tone Protection (Upgrade 2)
  if (params.skinProtect > 0) {
    const weight = getSkinWeight(baseR, baseG, baseB);
    const mix = weight * params.skinProtect;
    if (mix > 0) {
      nr = nr * (1 - mix) + baseR * mix;
      ng = ng * (1 - mix) + baseG * mix;
      nb = nb * (1 - mix) + baseB * mix;
    }
  }

  // 7. Signal Safety
  if (config.safeRange) {
    nr = applyRolloff(nr);
    ng = applyRolloff(ng);
    nb = applyRolloff(nb);
  }

  return {
    r: Math.max(0, Math.min(1, nr)),
    g: Math.max(0, Math.min(1, ng)),
    b: Math.max(0, Math.min(1, nb))
  };
};

export const generateLutFile = (params: ColorParams, config: LutConfig): string => {
  const size = 33;
  let fileContent = `TITLE "Vibe-to-LUT Generated"\n`;
  fileContent += `LUT_3D_SIZE ${size}\n\n`;

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const nr = r / (size - 1);
        const ng = g / (size - 1);
        const nb = b / (size - 1);

        const result = processPixel(nr, ng, nb, params, config);

        fileContent += `${result.r.toFixed(6)} ${result.g.toFixed(6)} ${result.b.toFixed(6)}\n`;
      }
    }
  }

  return fileContent;
};
