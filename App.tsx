import React, { useState, useCallback } from 'react';
import Controls from './components/Controls';
import ImageViewer from './components/ImageViewer';
import { DEFAULT_PARAMS, ColorParams, LutConfig, RGB } from './types';
import { generateParamsFromVibe } from './services/geminiService';
import { generateLutFile } from './services/lutEngine';

// Default placeholder image (Cinematic street scene)
const PLACEHOLDER_IMG = "https://picsum.photos/id/234/1200/800"; 

const App: React.FC = () => {
  const [params, setParams] = useState<ColorParams>(DEFAULT_PARAMS);
  const [config, setConfig] = useState<LutConfig>({ inputLog: false, safeRange: true });
  const [imageSrc, setImageSrc] = useState<string | null>(PLACEHOLDER_IMG);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [requestAutoWB, setRequestAutoWB] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const handleAIGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const newParams = await generateParamsFromVibe(prompt);
      // Preserve existing balance if any
      setParams(prev => ({
        ...newParams,
        balance: prev.balance,
        skinProtect: prev.skinProtect // Preserve manual overrides
      }));
    } catch (err: any) {
      setErrorMsg("AI Failed: " + (err.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoWBRequest = () => {
    setRequestAutoWB(true);
  };

  const handleAutoWBComplete = useCallback((balance: RGB) => {
    setParams(prev => ({ ...prev, balance }));
    setRequestAutoWB(false);
  }, []);

  const handleDownload = () => {
    const lutContent = generateLutFile(params, config);
    const blob = new Blob([lutContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Vibe_Look_${Date.now()}.cube`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-screen w-screen bg-resolve-bg text-resolve-text overflow-hidden font-sans">
      <Controls 
        params={params} 
        setParams={setParams}
        config={config}
        setConfig={setConfig}
        onGenerateAI={handleAIGenerate}
        isGenerating={isGenerating}
        onDownload={handleDownload}
        onImageUpload={handleImageUpload}
        onRequestAutoWB={handleAutoWBRequest}
      />
      
      <main className="flex-1 flex flex-col relative bg-[#111]">
        {/* Top Bar */}
        <div className="h-12 border-b border-resolve-border flex items-center px-6 justify-between bg-resolve-panel">
            <h1 className="text-white font-bold tracking-widest uppercase text-sm">
              <span className="text-resolve-accent">Vibe</span>Engine <span className="text-xs text-gray-500 ml-2">v2.0 Pro</span>
            </h1>
            <div className="flex items-center gap-4 text-xs text-gray-500">
               <span>Signal Safe Mode: {config.safeRange ? 'Active' : 'Off'}</span>
               {config.inputLog && <span className="text-yellow-500">Log Input Active</span>}
            </div>
        </div>

        {/* Viewport */}
        <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
             <ImageViewer 
                imageSrc={imageSrc} 
                params={params}
                config={config}
                requestAutoWB={requestAutoWB}
                onAutoWBComplete={handleAutoWBComplete}
             />
        </div>

        {/* Error Toast */}
        {errorMsg && (
          <div className="absolute bottom-8 right-8 bg-red-900/90 text-white px-6 py-4 rounded shadow-lg border-l-4 border-red-500 animate-bounce">
            <h3 className="font-bold">Error</h3>
            <p className="text-sm">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-xs underline mt-2">Dismiss</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
