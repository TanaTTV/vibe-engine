import { processPixel, calculateAutoBalance } from '../services/lutEngine';
import { ColorParams, LutConfig } from '../types';

/* eslint-disable no-restricted-globals */
const ctx: Worker = self as any;

ctx.onmessage = (event) => {
  const { type, imageData, width, height, params, config } = event.data;

  if (type === 'analyze') {
    // Upgrade 3: Auto White Balance Calculation
    const balance = calculateAutoBalance(imageData, config);
    ctx.postMessage({ type: 'analysis', balance });
    return;
  }

  if (type === 'process') {
    // Upgrade 4: Off-thread processing
    const src = imageData; // Uint8ClampedArray
    const length = src.length;
    
    // Output buffers
    const outputBuffer = new Uint8ClampedArray(length);
    
    // Upgrade 1: Scopes Initialization
    // Histogram: 256 buckets per channel
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);
    const histL = new Uint32Array(256);
    
    // Vectorscope: 256x256 heatmap
    const vectorscope = new Uint32Array(256 * 256);

    for (let i = 0; i < length; i += 4) {
      // 1. Process Color
      const r = src[i] / 255;
      const g = src[i + 1] / 255;
      const b = src[i + 2] / 255;

      const res = processPixel(r, g, b, params, config);
      
      const outR = Math.round(res.r * 255);
      const outG = Math.round(res.g * 255);
      const outB = Math.round(res.b * 255);
      const outA = src[i + 3];

      outputBuffer[i] = outR;
      outputBuffer[i + 1] = outG;
      outputBuffer[i + 2] = outB;
      outputBuffer[i + 3] = outA;

      // 2. Scope Analysis (Optimized: Single Loop)
      // Histogram
      histR[outR]++;
      histG[outG]++;
      histB[outB]++;
      
      const luma = Math.round(0.2126 * outR + 0.7152 * outG + 0.0722 * outB);
      histL[Math.min(255, luma)]++;

      // Vectorscope (Sample every 5th pixel for speed vs density)
      if (i % 20 === 0) {
        // Convert to YCbCr (Standard Rec.709 constants)
        // Cb = (B - Y) / 1.772
        // Cr = (R - Y) / 1.402
        // Map -0.5..0.5 to 0..255
        
        const yNorm = 0.2126 * res.r + 0.7152 * res.g + 0.0722 * res.b;
        const cb = (res.b - yNorm) / 1.772;
        const cr = (res.r - yNorm) / 1.402;
        
        // Scale and shift to center (128, 128)
        const x = Math.floor(128 + cb * 224); // 224 is scale factor (leaves padding)
        const y = Math.floor(128 - cr * 224); // Invert Y for graph

        if (x >= 0 && x < 256 && y >= 0 && y < 256) {
          vectorscope[y * 256 + x]++;
        }
      }
    }

    ctx.postMessage({
      type: 'complete',
      imageData: outputBuffer,
      scopeData: {
        histograms: { r: histR, g: histG, b: histB, l: histL },
        vectorscope
      }
    }, [outputBuffer.buffer, histR.buffer, histG.buffer, histB.buffer, histL.buffer, vectorscope.buffer]);
  }
};
