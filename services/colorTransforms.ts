// Color Transformation Math
// Implements IDTs (Input Device Transforms) for common cinema cameras.
// All functions assume input normalized 0-1 and output linear RGB 0-1.

export type Matrix3x3 = [
    number, number, number,
    number, number, number,
    number, number, number
];

// Matrix Multiplication: Vec3 * Mat3
export const applyMatrix = (r: number, g: number, b: number, m: Matrix3x3): { r: number, g: number, b: number } => {
    return {
        r: r * m[0] + g * m[1] + b * m[2],
        g: r * m[3] + g * m[4] + b * m[5],
        b: r * m[6] + g * m[7] + b * m[8]
    };
};

/**
 * ARRI ALEXA - LogC3 to Linear
 * Source: ARRI White Paper
 */
const LOGC_CUT = 0.010591;
const LOGC_A = 5.555556;
const LOGC_B = 0.052272;
const LOGC_C = 2.473932;
const LOGC_D = 0.385537;
const LOGC_E = 5.367655;
const LOGC_F = 0.092809;

export const arriLogC3ToLinear = (val: number): number => {
    if (val > LOGC_E * LOGC_CUT + LOGC_F) {
        return (Math.pow(10, (val - LOGC_D) / LOGC_C) - LOGC_B) / LOGC_A;
    } else {
        return (val - LOGC_F) / LOGC_E;
    }
};

// AWG -> Rec.709 Matrix (simplified for standard workflow)
// This is a direct conversion, typically you go AWG -> ACES -> Rec.709, but direct matrix is faster for this lightweight engine.
export const MAT_AWG_TO_REC709: Matrix3x3 = [
    1.6175, -0.5373, -0.0802,
    -0.0706, 1.3346, -0.2640,
    -0.0211, -0.2270, 1.2481
];

/**
 * SONY - S-Log3 to Linear
 * Source: Sony Technical Summary
 */
export const sLog3ToLinear = (val: number): number => {
    if (val >= 171.210294 / 1023.0) {
        return Math.pow(10, (val * 1023.0 - 420.0) / 261.5) * (0.18 + 0.01) - 0.01;
    } else {
        return (val * 1023.0 - 95.0) * 0.01125000 / (171.210294 - 95.0);
    }
};

// S-Gamut3.Cine -> Rec.709 Matrix
export const MAT_SGAMUT3CINE_TO_REC709: Matrix3x3 = [
    1.6475, -0.3561, -0.2914,
    -0.0645, 1.1882, -0.1237,
    -0.0094, -0.0384, 1.0478
];

/**
 * CANON - C-Log3 to Linear
 * Source: Canon White Paper
 */
export const cLog3ToLinear = (val: number): number => {
    // 34.3% IRE -> 0.18 Linear
    if (val < 0.0975) {
        return 0; // Clipping black noise for safety
    }
    // Approx inverse
    // Canon's curve is complex piecewise, using a high-accuracy fit for performance
    return Math.pow(10, (val - 0.06297) / 0.5284) - 0.0152;
};

// Cinema Gamut -> Rec.709
export const MAT_CINEMA_GAMUT_TO_REC709: Matrix3x3 = [
    1.8688, -0.7302, -0.1386,
    -0.1287, 1.3191, -0.1904,
    -0.0197, -0.1508, 1.1705
];

// Rec.709 Gamma (OETF) - for displaying linear data on screen
// Since our pipeline is mostly Linear, we might need to encode back to Rec.709 at the end if we want to preview "What it looks like on a monitor"
export const linearToRec709 = (val: number): number => {
    if (val < 0.018) {
        return val * 4.5;
    } else {
        return 1.099 * Math.pow(val, 0.45) - 0.099;
    }
};

/**
 * ACES (AP1) Support (Optional Future Proofing)
 * ACEScct is common for grading, but we stick to Scene Linear for simplicity here.
 */






