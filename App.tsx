import React, { useState, useCallback } from 'react';
import Controls from './components/Controls';
import ImageViewer from './components/ImageViewer';
import { DEFAULT_PARAMS, ColorParams, LutConfig, RGB, NodeBlueprint, InputColorSpace } from './types';
import { generateParamsFromVibe } from './services/geminiService';
import { generateLutFile } from './services/lutEngine';
import { animateParams } from './services/animationService';

// Default placeholder image (Cinematic street scene)
const PLACEHOLDER_IMG = "https://picsum.photos/id/234/1200/800"; 

const App: React.FC = () => {
  const [params, setParams] = useState<ColorParams>(DEFAULT_PARAMS);
  const [config, setConfig] = useState<LutConfig>({ 
    inputColorSpace: InputColorSpace.REC709, 
    safeRange: true 
  });
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

  const getLowResImage = async (): Promise<string | undefined> => {
     if (!imageSrc) return undefined;
     
     return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imageSrc;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Downscale to max 512px for AI speed/token savings
            const scale = Math.min(1, 512 / Math.max(img.width, img.height));
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => resolve(undefined);
     });
  };

  const handleAIGenerate = async (prompt: string) => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const startParams = params; // Capture current params
      
      // Get image context
      const imageBase64 = await getLowResImage();
      
      const newParams = await generateParamsFromVibe(prompt, imageBase64);
      
      // Animate from current params to new params
      // Duration: 1500ms for dramatic effect
      animateParams(startParams, newParams, 1500, (currentParams) => {
         // Preserve the metadata fields which are not animated
         currentParams.aiThought = newParams.aiThought;
         currentParams.aiPalette = newParams.aiPalette;
         setParams(currentParams);
      });

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

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLut = () => {
    const lutContent = generateLutFile(params, config);
    downloadFile(`Vibe_Look_${Date.now()}.cube`, lutContent, 'text/plain');
  };

  const handleExportBridge = () => {
    const timestamp = Date.now();
    const basename = `Vibe_Bridge_${timestamp}`;

    // 1. Generate & Download CUBE
    const lutContent = generateLutFile(params, config);
    downloadFile(`${basename}.cube`, lutContent, 'text/plain');

    // 2. Generate & Download JSON
    const isLog = config.inputColorSpace !== InputColorSpace.REC709;
    
    const blueprint: NodeBlueprint = {
        timestamp,
        cst: {
            is_log: isLog,
            input_gamma: config.inputColorSpace,
            output_gamma: "Rec.709"
        },
        primary: {
            lift: [params.lift.r, params.lift.g, params.lift.b],
            gamma: [params.gamma.r, params.gamma.g, params.gamma.b],
            gain: [params.gain.r, params.gain.g, params.gain.b],
            saturation: params.saturation,
            contrast: params.contrast,
            pivot: params.contrastPivot
        },
        look: {
            temp: params.temperature,
            tint: params.tint,
            skin_protect: params.skinProtect
        }
    };
    downloadFile(`${basename}.json`, JSON.stringify(blueprint, null, 2), 'application/json');
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
        onDownloadLut={handleDownloadLut}
        onExportBridge={handleExportBridge}
        onImageUpload={handleImageUpload}
        onRequestAutoWB={handleAutoWBRequest}
      />
      
      <main className="flex-1 flex flex-col relative bg-[#111]">
        {/* Top Bar */}
        <div className="h-12 border-b border-resolve-border flex items-center px-6 justify-between bg-resolve-panel/90 backdrop-blur-md">
            <h1 className="text-white font-bold tracking-widest uppercase text-sm">
              <span className="text-resolve-accent">VIBE</span> ENGINE <span className="text-xs text-gray-500 ml-2">v2.1 Pro <span className="text-orange-500 font-bold">Beta</span></span>
            </h1>
            <div className="flex items-center gap-4 text-xs text-gray-500">
               <span>Signal Safe Mode: {config.safeRange ? 'Active' : 'Off'}</span>
               {config.inputColorSpace !== InputColorSpace.REC709 && <span className="text-yellow-500">{config.inputColorSpace} Active</span>}
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
