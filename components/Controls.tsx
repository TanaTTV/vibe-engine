import React, { useState } from 'react';
import { ColorParams, LutConfig, RGB } from '../types';

interface ControlsProps {
  params: ColorParams;
  setParams: React.Dispatch<React.SetStateAction<ColorParams>>;
  config: LutConfig;
  setConfig: React.Dispatch<React.SetStateAction<LutConfig>>;
  onGenerateAI: (prompt: string) => void;
  isGenerating: boolean;
  onDownloadLut: () => void;
  onExportBridge: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestAutoWB: () => void;
}

const Controls: React.FC<ControlsProps> = ({
  params,
  setParams,
  config,
  setConfig,
  onGenerateAI,
  isGenerating,
  onDownloadLut,
  onExportBridge,
  onImageUpload,
  onRequestAutoWB
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSliderChange = (
    category: keyof ColorParams,
    channel: keyof RGB | null,
    value: number
  ) => {
    setParams((prev) => {
      if (channel && typeof prev[category] === 'object') {
        return {
          ...prev,
          [category]: {
            ...(prev[category] as RGB),
            [channel]: value,
          },
        };
      } else {
        return {
          ...prev,
          [category]: value,
        };
      }
    });
  };

  const ColorWheelGroup = ({ label, category, min, max, step = 0.01 }: { label: string, category: 'lift' | 'gamma' | 'gain', min: number, max: number, step?: number }) => (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">{label}</span>
      </div>
      <div className="space-y-2">
        {['r', 'g', 'b'].map((c) => (
          <div key={c} className="flex items-center gap-3">
            <span className={`text-[10px] w-3 uppercase font-bold ${c === 'r' ? 'text-red-500' : c === 'g' ? 'text-green-500' : 'text-blue-500'}`}>{c}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={params[category][c as keyof RGB]}
              onChange={(e) => handleSliderChange(category, c as keyof RGB, parseFloat(e.target.value))}
              className="flex-1 h-1 bg-resolve-border rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] text-gray-500 w-8 text-right">{params[category][c as keyof RGB].toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-resolve-panel border-r border-resolve-border w-80 flex-shrink-0 overflow-y-auto">
      {/* Header Area */}
      <div className="p-4 border-b border-resolve-border">
         <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Input Source</h2>
         <div className="flex gap-2 mb-4">
             <label className="flex-1 cursor-pointer bg-resolve-input hover:bg-resolve-border transition-colors rounded px-3 py-2 text-xs text-center border border-resolve-border">
                <input type="file" className="hidden" accept="image/*" onChange={onImageUpload} />
                <span>Import Image</span>
             </label>
         </div>

         <div className="flex items-center justify-between bg-resolve-input p-2 rounded border border-resolve-border mb-2">
             <span className="text-xs text-gray-400">Log Footage</span>
             <div 
               className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${config.inputLog ? 'bg-resolve-accent' : 'bg-gray-600'}`}
               onClick={() => setConfig(prev => ({...prev, inputLog: !prev.inputLog}))}
             >
                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${config.inputLog ? 'left-4.5' : 'left-0.5'}`} style={{ left: config.inputLog ? '18px' : '2px'}} />
             </div>
         </div>

         {/* Upgrade 3: Auto White Balance */}
         <button 
           onClick={onRequestAutoWB}
           className="w-full py-1.5 text-[10px] border border-gray-600 hover:border-gray-400 text-gray-400 uppercase tracking-wider rounded transition-colors"
         >
           Auto White Balance
         </button>
      </div>

      {/* AI Section */}
      <div className="p-4 border-b border-resolve-border bg-[#202020]">
        <h2 className="text-sm font-bold text-white mb-2 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-resolve-accent animate-pulse"></span>
            AI Vibe Generator
        </h2>
        <textarea
            className="w-full bg-resolve-input border border-resolve-border rounded p-3 text-sm text-white focus:border-resolve-accent outline-none resize-none mb-3"
            rows={2}
            placeholder='e.g., "Matrix green sci-fi" or "Vintage 70s kodak"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
        />
        <button
            onClick={() => onGenerateAI(prompt)}
            disabled={isGenerating || !prompt}
            className={`w-full py-2 rounded text-xs font-bold uppercase tracking-wider transition-all
                ${isGenerating 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-resolve-accent to-blue-600 hover:brightness-110 text-white'
                }`}
        >
            {isGenerating ? 'Analyzing Vibe...' : 'Generate Look'}
        </button>
      </div>

      {/* Manual Controls */}
      <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-6">
             <span className="text-xs font-bold text-gray-400 uppercase">Safe Range</span>
             <button 
                onClick={() => setConfig(prev => ({...prev, safeRange: !prev.safeRange}))}
                className={`text-[10px] px-2 py-1 rounded border ${config.safeRange ? 'border-green-500 text-green-500' : 'border-gray-600 text-gray-600'}`}
             >
                 {config.safeRange ? 'ENABLED' : 'DISABLED'}
             </button>
          </div>

          <ColorWheelGroup label="Lift (Shadows)" category="lift" min={-0.2} max={0.2} />
          <ColorWheelGroup label="Gamma (Midtones)" category="gamma" min={0.5} max={2.0} />
          <ColorWheelGroup label="Gain (Highlights)" category="gain" min={0.5} max={2.0} />

          <div className="mt-6 space-y-4 pt-4 border-t border-resolve-border">
              <div>
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase">Contrast</span>
                      <span className="text-gray-500">{params.contrast.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.5" max="1.5" step="0.01" 
                    value={params.contrast} 
                    onChange={(e) => handleSliderChange('contrast', null, parseFloat(e.target.value))}
                    className="w-full h-1 bg-resolve-border rounded-lg appearance-none cursor-pointer"
                   />
              </div>
              <div>
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase">Saturation</span>
                      <span className="text-gray-500">{params.saturation.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="2.0" step="0.01" 
                    value={params.saturation} 
                    onChange={(e) => handleSliderChange('saturation', null, parseFloat(e.target.value))}
                    className="w-full h-1 bg-resolve-border rounded-lg appearance-none cursor-pointer"
                   />
              </div>
              <div>
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase">Temp</span>
                      <span className="text-gray-500">{params.temperature.toFixed(2)}</span>
                  </div>
                  <input type="range" min="-1.0" max="1.0" step="0.01" 
                    value={params.temperature} 
                    onChange={(e) => handleSliderChange('temperature', null, parseFloat(e.target.value))}
                    className="w-full h-1 bg-resolve-border rounded-lg appearance-none cursor-pointer"
                   />
              </div>
              <div>
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400 uppercase">Tint</span>
                      <span className="text-gray-500">{params.tint.toFixed(2)}</span>
                  </div>
                  <input type="range" min="-1.0" max="1.0" step="0.01" 
                    value={params.tint} 
                    onChange={(e) => handleSliderChange('tint', null, parseFloat(e.target.value))}
                    className="w-full h-1 bg-resolve-border rounded-lg appearance-none cursor-pointer"
                   />
              </div>
              
              <div className="pt-4 border-t border-resolve-border">
                  <div className="flex justify-between text-xs mb-1">
                      <span className="text-orange-400 font-bold uppercase tracking-wider">Smart Skin Protect</span>
                      <span className="text-gray-500">{(params.skinProtect * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0" max="1.0" step="0.01" 
                    value={params.skinProtect} 
                    onChange={(e) => handleSliderChange('skinProtect', null, parseFloat(e.target.value))}
                    className="w-full h-1 bg-resolve-border rounded-lg appearance-none cursor-pointer accent-orange-500"
                   />
                  <p className="text-[10px] text-gray-500 mt-1">Isolates skin (35-50° Hue) and preserves it.</p>
              </div>
          </div>
      </div>

      {/* Footer / Export */}
      <div className="p-4 border-t border-resolve-border space-y-2">
        <button 
            onClick={onDownloadLut}
            className="w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors rounded"
        >
            Download .CUBE
        </button>
        <button 
            onClick={onExportBridge}
            className="w-full py-3 border border-resolve-accent text-resolve-accent text-xs font-bold uppercase tracking-widest hover:bg-resolve-accent/10 transition-colors rounded flex flex-col items-center"
        >
            <span>Export to Resolve</span>
            <span className="text-[9px] text-gray-400 normal-case">(Downloads Blueprint + LUT)</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;
