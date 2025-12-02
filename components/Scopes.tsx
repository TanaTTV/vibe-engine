import React, { useEffect, useRef } from 'react';
import { ScopeData } from '../types';

interface ScopesProps {
  data: ScopeData | null;
}

const Scopes: React.FC<ScopesProps> = ({ data }) => {
  const histogramRef = useRef<HTMLCanvasElement>(null);
  const vectorRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!data || !histogramRef.current || !vectorRef.current) return;

    // --- Draw Histogram ---
    const hCanvas = histogramRef.current;
    const hCtx = hCanvas.getContext('2d');
    if (hCtx) {
      hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
      hCtx.globalCompositeOperation = 'screen'; // Additive blending
      
      const drawChannel = (hist: Uint32Array, color: string) => {
        hCtx.fillStyle = color;
        hCtx.beginPath();
        const max = Math.max(...Array.from(hist)) || 1; // Avoid divide by zero
        
        // Normalize height
        for (let i = 0; i < 256; i++) {
           const height = (hist[i] / max) * hCanvas.height;
           // Draw bars
           hCtx.fillRect(i, hCanvas.height - height, 1, height);
        }
      };

      // Draw RGB + Luma
      drawChannel(data.histograms.r, 'rgba(255, 0, 0, 0.5)');
      drawChannel(data.histograms.g, 'rgba(0, 255, 0, 0.5)');
      drawChannel(data.histograms.b, 'rgba(0, 0, 255, 0.5)');
      drawChannel(data.histograms.l, 'rgba(255, 255, 255, 0.3)');
    }

    // --- Draw Vectorscope ---
    const vCanvas = vectorRef.current;
    const vCtx = vCanvas.getContext('2d');
    if (vCtx) {
      vCtx.fillStyle = '#000000';
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height);
      
      // Draw Grid / Skin Line
      vCtx.strokeStyle = '#333';
      vCtx.lineWidth = 1;
      vCtx.beginPath();
      vCtx.arc(128, 128, 120, 0, Math.PI * 2); // Outer ring
      vCtx.moveTo(128, 0); vCtx.lineTo(128, 256); // Crosshair
      vCtx.moveTo(0, 128); vCtx.lineTo(256, 128);
      vCtx.stroke();
      
      // Skin Tone Line (approx 135 degrees, top-left quadrant in Cr/Cb)
      vCtx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
      vCtx.beginPath();
      vCtx.moveTo(128, 128);
      vCtx.lineTo(128 - 90, 128 - 90);
      vCtx.stroke();
      vCtx.fillStyle = 'rgba(255, 165, 0, 0.8)';
      vCtx.fillText("SKIN", 20, 30);

      // Draw Heatmap
      const imgData = vCtx.createImageData(256, 256);
      const heatmap = data.vectorscope;
      
      // Find max for auto-exposure of scope
      let maxVal = 0;
      // Sampling max to save time
      for(let k=0; k<heatmap.length; k+=100) if(heatmap[k] > maxVal) maxVal = heatmap[k];
      maxVal = Math.max(maxVal, 10); // Floor

      for (let i = 0; i < heatmap.length; i++) {
         const count = heatmap[i];
         if (count > 0) {
            const intensity = Math.min(255, (count / maxVal) * 255 * 8); // Boost brightness
            const offset = i * 4;
            imgData.data[offset] = 0;     // R
            imgData.data[offset + 1] = 255; // G (Green trace like old scopes)
            imgData.data[offset + 2] = 100; // B
            imgData.data[offset + 3] = intensity; // Alpha
         }
      }
      vCtx.putImageData(imgData, 0, 0);
    }

  }, [data]);

  if (!data) return <div className="text-xs text-gray-500 text-center py-4">Waiting for signal...</div>;

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <div className="relative bg-black border border-resolve-border rounded aspect-video">
         <span className="absolute top-1 left-2 text-[10px] text-gray-500 uppercase z-10">Histogram</span>
         <canvas ref={histogramRef} width={256} height={150} className="w-full h-full" />
      </div>
      <div className="relative bg-black border border-resolve-border rounded aspect-square">
         <span className="absolute top-1 left-2 text-[10px] text-gray-500 uppercase z-10">Vectorscope</span>
         <canvas ref={vectorRef} width={256} height={256} className="w-full h-full" />
      </div>
    </div>
  );
};

export default Scopes;
