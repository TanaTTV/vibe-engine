import { ColorParams, LutConfig, RGB, InputColorSpace } from '../types';
import { 
  arriLogC3ToLinear, 
  sLog3ToLinear, 
  cLog3ToLinear, 
  linearToRec709,
  applyMatrix,
  MAT_AWG_TO_REC709,
  MAT_SGAMUT3CINE_TO_REC709,
  MAT_CINEMA_GAMUT_TO_REC709
} from './colorTransforms';

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

// Legacy generic log transform (keeping for backward compatibility or "Generic Log" mode)
const applyGenericLogTransform = (val: number): number => {
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
 * Helper to apply Input Device Transform (IDT) based on config
 * Returns RGB in Display Rec.709 space (ready for grading)
 */
const applyIDT = (r: number, g: number, b: number, space: InputColorSpace): { r: number, g: number, b: number } => {
  switch (space) {
    case InputColorSpace.REC709:
      return { r, g, b };
    
    case InputColorSpace.LOG_GENERIC: {
      const nr = applyGenericLogTransform(r);
      const ng = applyGenericLogTransform(g);
      const nb = applyGenericLogTransform(b);
      return { r: nr, g: ng, b: nb };
    }

    case InputColorSpace.ARRI_LOGC3: {
      // 1. De-Log (LogC3 -> Linear)
      const linR = arriLogC3ToLinear(r);
      const linG = arriLogC3ToLinear(g);
      const linB = arriLogC3ToLinear(b);
      // 2. Gamut (AWG -> Rec.709)
      const gamut = applyMatrix(linR, linG, linB, MAT_AWG_TO_REC709);
      // 3. ODT (Linear -> Rec.709 Gamma)
      return {
        r: linearToRec709(gamut.r),
        g: linearToRec709(gamut.g),
        b: linearToRec709(gamut.b)
      };
    }

    case InputColorSpace.SONY_SLOG3: {
      const linR = sLog3ToLinear(r);
      const linG = sLog3ToLinear(g);
      const linB = sLog3ToLinear(b);
      const gamut = applyMatrix(linR, linG, linB, MAT_SGAMUT3CINE_TO_REC709);
      return {
        r: linearToRec709(gamut.r),
        g: linearToRec709(gamut.g),
        b: linearToRec709(gamut.b)
      };
    }

    case InputColorSpace.CANON_CLOG3: {
      const linR = cLog3ToLinear(r);
      const linG = cLog3ToLinear(g);
      const linB = cLog3ToLinear(b);
      const gamut = applyMatrix(linR, linG, linB, MAT_CINEMA_GAMUT_TO_REC709);
      return {
        r: linearToRec709(gamut.r),
        g: linearToRec709(gamut.g),
        b: linearToRec709(gamut.b)
      };
    }

    default:
      return { r, g, b };
  }
};

/**
 * Calculates Auto White Balance multipliers using Grey World Assumption.
 * Note: Should be run on image data AFTER IDT transform.
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

    // Normalize input using IDT
    const res = applyIDT(r, g, b, config.inputColorSpace);
    
    sumR += res.r;
    sumG += res.g;
    sumB += res.b;
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
  // 1. Input Transform (IDT -> Rec.709)
  const idt = applyIDT(r, g, b, config.inputColorSpace);
  let nr = idt.r;
  let ng = idt.g;
  let nb = idt.b;

  // 1.5 Auto White Balance (Step 0 - Upgrade 3)
  // Applied after IDT (so we are working in quasi-linear Rec.709) but before Creative Loop
  nr *= params.balance.r;
  ng *= params.balance.g;
  nb *= params.balance.b;

  // CAPTURE BASE STATE for Skin Mask
  const baseR = nr;
  const baseG = ng;
  const baseB = nb;

  // 2. ASC-CDL (Gain -> Lift -> Gamma)
  // Standard CDL Order: Slope (Gain) -> Offset (Lift) -> Power (Gamma)
  
  // Slope (Gain)
  nr *= params.gain.r;
  ng *= params.gain.g;
  nb *= params.gain.b;

  // Offset (Lift)
  nr += params.lift.r;
  ng += params.lift.g;
  nb += params.lift.b;

  // Power (Gamma)
  const safeGamma = (v: number, g: number) => {
    if (v < 0) return 0;
    return Math.pow(v, 1 / Math.max(0.1, g));
  };
  nr = safeGamma(nr, params.gamma.r);
  ng = safeGamma(ng, params.gamma.g);
  nb = safeGamma(nb, params.gamma.b);

  // 3. Temperature & Tint (Post-CDL for creative tinting)
  const tempShift = params.temperature * 0.15;
  nr += tempShift;
  nb -= tempShift;

  const tintShift = params.tint * 0.15;
  ng += tintShift;

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
  let fileContent = `TITLE "Vibe-Engine_v2.1_Pro"\n`;
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
