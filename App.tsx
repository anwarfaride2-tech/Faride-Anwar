
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AspectRatio, GenerationState, Resolution, AudioType } from './types';
import { generateVeoVideo } from './services/geminiService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [image, setImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [audioType, setAudioType] = useState<AudioType>('default');
  const [genState, setGenState] = useState<GenerationState>({ status: 'idle' });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      setHasApiKey(false);
    }
  };

  const handleSelectKey = async () => {
    try {
      await (window as any).aistudio.openSelectKey();
      // Assume success after triggering the dialog to avoid race condition
      setHasApiKey(true);
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setVideoUrl(null);
        setGenState({ status: 'idle' });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) return;

    setGenState({ status: 'generating', progressMessage: 'Preparing image...' });
    setVideoUrl(null);

    try {
      const resultUrl = await generateVeoVideo(
        image,
        aspectRatio,
        resolution,
        audioType,
        (msg) => setGenState(prev => ({ ...prev, progressMessage: msg }))
      );
      setVideoUrl(resultUrl);
      setGenState({ status: 'completed' });
    } catch (error: any) {
      const errorMessage = error?.message || "Something went wrong during generation.";
      const isPermissionError = 
        errorMessage.toLowerCase().includes("permission") || 
        errorMessage.toLowerCase().includes("403") ||
        errorMessage.toLowerCase().includes("requested entity was not found");

      if (isPermissionError) {
        setGenState({ 
          status: 'error', 
          error: "Permission Denied. Veo requires an API key from a project with billing enabled. Please re-select your key." 
        });
        setHasApiKey(false);
      } else {
        setGenState({ status: 'error', error: errorMessage });
      }
    }
  };

  const reset = () => {
    setImage(null);
    setVideoUrl(null);
    setGenState({ status: 'idle' });
  };

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-8 max-w-2xl mx-auto">
        <div className="bg-blue-600/10 p-6 rounded-full">
          <i className="fa-solid fa-key text-5xl text-blue-500"></i>
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-4">API Key Required</h1>
          <p className="text-zinc-400 text-lg">
            To use the Veo video generation model, you need to select a valid API key from a <strong>paid GCP project</strong> with billing enabled.
          </p>
        </div>
        <div className="flex flex-col gap-4 w-full">
          <button
            onClick={handleSelectKey}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/20"
          >
            Select API Key
          </button>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm underline"
          >
            Learn about billing for Gemini API
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <header className="text-center mb-12 space-y-4">
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          VEO ANIMATOR
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Turn your static portraits into raw, authentic handheld phone footage.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Left Column: Input / Controls */}
        <section className="space-y-8 sticky top-8">
          <div 
            className={`relative border-2 border-dashed rounded-3xl p-4 transition-all overflow-hidden ${
              image ? 'border-zinc-700 bg-zinc-900/30' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/50 group cursor-pointer'
            }`}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            
            {image ? (
              <div className="relative group">
                <img 
                  src={image} 
                  alt="Source" 
                  className="w-full h-auto rounded-2xl shadow-2xl object-cover max-h-[500px]" 
                />
                <button 
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute top-4 right-4 bg-zinc-950/80 hover:bg-red-600 text-white p-2 rounded-full transition-colors backdrop-blur"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                  <i className="fa-solid fa-cloud-arrow-up text-2xl text-zinc-400"></i>
                </div>
                <div className="text-center">
                  <p className="text-zinc-100 font-semibold">Click to upload an image</p>
                  <p className="text-zinc-500 text-sm mt-1">Supports PNG, JPG, WebP</p>
                </div>
              </div>
            )}
          </div>

          {image && genState.status === 'idle' && (
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Aspect Ratio</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setAspectRatio('9:16')}
                        className={`flex-1 py-2 rounded-lg border text-sm transition-all ${aspectRatio === '9:16' ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                      >
                        Portrait
                      </button>
                      <button 
                        onClick={() => setAspectRatio('16:9')}
                        className={`flex-1 py-2 rounded-lg border text-sm transition-all ${aspectRatio === '16:9' ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Quality</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setResolution('720p')}
                        className={`flex-1 py-2 rounded-lg border text-sm transition-all ${resolution === '720p' ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                      >
                        720p
                      </button>
                      <button 
                        onClick={() => setResolution('1080p')}
                        className={`flex-1 py-2 rounded-lg border text-sm transition-all ${resolution === '1080p' ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                      >
                        1080p
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-