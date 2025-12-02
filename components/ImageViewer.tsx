import React, { useRef, useEffect, useState } from 'react';
import { ColorParams, LutConfig, ScopeData, RGB } from '../types';
import Scopes from './Scopes';

interface ImageViewerProps {
  imageSrc: string | null;
  params: ColorParams;
  config: LutConfig;
  requestAutoWB: boolean;
  onAutoWBComplete: (balance: RGB) => void;
}

// --- INLINE WORKER CODE ---
// We define this as a string to avoid 404 errors when the browser tries to fetch
// a .ts file or an unbundled worker file. This guarantees the worker runs.
const WORKER_CODE = `
  /* MATH HELPERS (Duplicated from colorTransforms.ts and lutEngine.ts) */
  
  const ROLLOFF_START = 0.8;

  const applyRolloff = (val) => {
    if (val <= ROLLOFF_START) return val;
    const x = val - ROLLOFF_START;
    const scale = 1.0 - ROLLOFF_START;
    const compressed = x / (x + 0.5);
    return ROLLOFF_START + (compressed * scale);
  };

  // Matrix Math
  const applyMatrix = (r, g, b, m) => {
    return {
        r: r * m[0] + g * m[1] + b * m[2],
        g: r * m[3] + g * m[4] + b * m[5],
        b: r * m[6] + g * m[7] + b * m[8]
    };
  };

  // --- ARRI ---
  const LOGC_CUT = 0.010591;
  const LOGC_A = 5.555556;
  const LOGC_B = 0.052272;
  const LOGC_C = 2.473932;
  const LOGC_D = 0.385537;
  const LOGC_E = 5.367655;
  const LOGC_F = 0.092809;

  const arriLogC3ToLinear = (val) => {
    if (val > LOGC_E * LOGC_CUT + LOGC_F) {
        return (Math.pow(10, (val - LOGC_D) / LOGC_C) - LOGC_B) / LOGC_A;
    } else {
        return (val - LOGC_F) / LOGC_E;
    }
  };

  const MAT_AWG_TO_REC709 = [
    1.6175, -0.5373, -0.0802,
    -0.0706, 1.3346, -0.2640,
    -0.0211, -0.2270, 1.2481
  ];

  // --- SONY ---
  const sLog3ToLinear = (val) => {
    if (val >= 171.210294 / 1023.0) {
        return Math.pow(10, (val * 1023.0 - 420.0) / 261.5) * (0.18 + 0.01) - 0.01;
    } else {
        return (val * 1023.0 - 95.0) * 0.01125000 / (171.210294 - 95.0);
    }
  };

  const MAT_SGAMUT3CINE_TO_REC709 = [
    1.6475, -0.3561, -0.2914,
    -0.0645, 1.1882, -0.1237,
    -0.0094, -0.0384, 1.0478
  ];

  // --- CANON ---
  const cLog3ToLinear = (val) => {
    if (val < 0.0975) return 0;
    return Math.pow(10, (val - 0.06297) / 0.5284) - 0.0152;
  };

  const MAT_CINEMA_GAMUT_TO_REC709 = [
    1.8688, -0.7302, -0.1386,
    -0.1287, 1.3191, -0.1904,
    -0.0197, -0.1508, 1.1705
  ];

  // --- ODT ---
  const linearToRec709 = (val) => {
    if (val < 0.018) {
        return val * 4.5;
    } else {
        return 1.099 * Math.pow(val, 0.45) - 0.099;
    }
  };

  // Legacy Generic Log
  const applyGenericLogTransform = (val) => {
      const slope = 5.0;
      const offset = 0.5;
      const sigmoid = 1 / (1 + Math.exp(-slope * (val - offset)));
      return (sigmoid - 0.07) * 1.15;
  };

  const getSkinWeight = (r, g, b) => {
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

  // Helper to apply IDT
  const applyIDT = (r, g, b, space) => {
    if (space === 'Generic Log') {
       const nr = applyGenericLogTransform(r);
       const ng = applyGenericLogTransform(g);
       const nb = applyGenericLogTransform(b);
       return { r: nr, g: ng, b: nb };
    }
    if (space === 'Arri LogC3') {
       const linR = arriLogC3ToLinear(r);
       const linG = arriLogC3ToLinear(g);
       const linB = arriLogC3ToLinear(b);
       const gamut = applyMatrix(linR, linG, linB, MAT_AWG_TO_REC709);
       return {
         r: linearToRec709(gamut.r),
         g: linearToRec709(gamut.g),
         b: linearToRec709(gamut.b)
       };
    }
    if (space === 'Sony S-Log3') {
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
    if (space === 'Canon C-Log3') {
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
    // Default / Rec.709
    return { r, g, b };
  };

  const processPixel = (r, g, b, params, config) => {
    // 1. Input Transform
    const idt = applyIDT(r, g, b, config.inputColorSpace);
    let nr = idt.r;
    let ng = idt.g;
    let nb = idt.b;

    // 1.5 Auto Balance
    if (params.balance) {
      nr *= params.balance.r;
      ng *= params.balance.g;
      nb *= params.balance.b;
    }

    // CAPTURE BASE STATE
    const baseR = nr;
    const baseG = ng;
    const baseB = nb;

    // 2. ASC-CDL
    nr *= params.gain.r;
    ng *= params.gain.g;
    nb *= params.gain.b;

    nr += params.lift.r;
    ng += params.lift.g;
    nb += params.lift.b;

    const safeGamma = (v, gm) => (v < 0 ? 0 : Math.pow(v, 1 / Math.max(0.1, gm)));
    nr = safeGamma(nr, params.gamma.r);
    ng = safeGamma(ng, params.gamma.g);
    nb = safeGamma(nb, params.gamma.b);

    // 3. Temp & Tint
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

    // 6. Skin Protect
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

  const calculateAutoBalance = (data, config) => {
    let sumR = 0, sumG = 0, sumB = 0;
    const len = data.length;
    const pixelCount = len / 4;

    for (let i = 0; i < len; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      const res = applyIDT(r, g, b, config.inputColorSpace);
      
      sumR += res.r;
      sumG += res.g;
      sumB += res.b;
    }

    const avgR = sumR / pixelCount || 0.001;
    const avgG = sumG / pixelCount || 0.001;
    const avgB = sumB / pixelCount || 0.001;

    const globalAvg = (avgR + avgG + avgB) / 3;

    return {
      r: globalAvg / avgR,
      g: globalAvg / avgG,
      b: globalAvg / avgB
    };
  };

  /* WORKER EVENT HANDLER */
  self.onmessage = (event) => {
    const { type, imageData, width, height, params, config } = event.data;

    if (type === 'analyze') {
      const balance = calculateAutoBalance(imageData, config);
      self.postMessage({ type: 'analysis', balance });
      return;
    }

    if (type === 'process') {
      const src = imageData;
      const length = src.length;
      
      const outputBuffer = new Uint8ClampedArray(length);
      
      const histR = new Uint32Array(256);
      const histG = new Uint32Array(256);
      const histB = new Uint32Array(256);
      const histL = new Uint32Array(256);
      const vectorscope = new Uint32Array(256 * 256);

      for (let i = 0; i < length; i += 4) {
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

        // Scopes
        histR[outR]++;
        histG[outG]++;
        histB[outB]++;
        
        const luma = Math.round(0.2126 * outR + 0.7152 * outG + 0.0722 * outB);
        histL[Math.min(255, luma)]++;

        // Vectorscope (Downsample for perf)
        if (i % 20 === 0) {
          const yNorm = 0.2126 * res.r + 0.7152 * res.g + 0.0722 * res.b;
          const cb = (res.b - yNorm) / 1.772;
          const cr = (res.r - yNorm) / 1.402;
          
          const x = Math.floor(128 + cb * 224);
          const y = Math.floor(128 - cr * 224);

          if (x >= 0 && x < 256 && y >= 0 && y < 256) {
            vectorscope[y * 256 + x]++;
          }
        }
      }

      self.postMessage({
        type: 'complete',
        imageData: outputBuffer.buffer,
        scopeData: {
          histograms: { r: histR, g: histG, b: histB, l: histL },
          vectorscope
        }
      }, [outputBuffer.buffer, histR.buffer, histG.buffer, histB.buffer, histL.buffer, vectorscope.buffer]);
    }
  };
`;

const ImageViewer: React.FC<ImageViewerProps> = ({ 
  imageSrc, 
  params, 
  config, 
  requestAutoWB,
  onAutoWBComplete 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const [originalImageData, setOriginalImageData] = useState<Uint8ClampedArray | null>(null);
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [scopeData, setScopeData] = useState<ScopeData | null>(null);

  // Initialize Worker using Blob (Robust Method)
  useEffect(() => {
    try {
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      workerRef.current = new Worker(url);

      workerRef.current.onmessage = (e) => {
        const { type, imageData, scopeData, balance } = e.data;
        
        if (type === 'complete') {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const iData = new ImageData(new Uint8ClampedArray(imageData), canvas.width, canvas.height);
              ctx.putImageData(iData, 0, 0);
            }
          }
          setScopeData(scopeData);
          setIsProcessing(false);
        }
        
        if (type === 'analysis') {
           onAutoWBComplete(balance);
        }
      };

      workerRef.current.onerror = (e) => {
          console.error("❌ Worker Error:", e.message);
          setIsProcessing(false);
      };

      return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error("Failed to create Inline Worker:", e);
    }
  }, [onAutoWBComplete]);

  // Load Image
  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const MAX_WIDTH = 1000;
      let width = img.width;
      let height = img.height;
      
      if (width > MAX_WIDTH) {
        const ratio = MAX_WIDTH / width;
        width = MAX_WIDTH;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height);
      
      setOriginalImageData(data.data); // Store Uint8ClampedArray
      setImgDims({ w: width, h: height });
    };
  }, [imageSrc]);

  // Handle Auto WB Request
  useEffect(() => {
    if (requestAutoWB && originalImageData && workerRef.current) {
      workerRef.current.postMessage({
        type: 'analyze',
        imageData: originalImageData, // Clone
        width: imgDims.w,
        height: imgDims.h,
        config: config
      });
    }
  }, [requestAutoWB, originalImageData, config, imgDims]);

  // Trigger Grading
  useEffect(() => {
    if (!originalImageData || !workerRef.current) return;

    setIsProcessing(true);
    
    // We send a clone of the original data to the worker
    workerRef.current.postMessage({
       type: 'process',
       imageData: originalImageData,
       width: imgDims.w,
       height: imgDims.h,
       params,
       config
    });

  }, [params, config, originalImageData, imgDims]);

  if (!imageSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        Upload an image to start.
      </div>
    );
  }

  return (
    <div className="flex flex-row w-full h-full gap-4">
      {/* Main Preview */}
      <div className="flex-1 relative flex items-center justify-center bg-black rounded-lg overflow-hidden border border-resolve-border shadow-2xl border-opacity-50">
        <canvas 
          ref={canvasRef}  
          className="max-w-full max-h-[70vh] object-contain"
        />
        {isProcessing && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 text-xs text-white rounded-full flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Processing
          </div>
        )}
      </div>

      {/* Scopes Panel */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-resolve-panel p-2 rounded-lg border border-resolve-border">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-resolve-border pb-1">Signal Scopes</h3>
        <Scopes data={scopeData} />
      </div>
    </div>
  );
};

export default ImageViewer;
