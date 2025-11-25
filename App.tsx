import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { UploadZone } from './components/UploadZone';
import { Editor } from './components/Editor';
import { fileToBase64, getBase64Data, getMimeType } from './utils/imageHelpers';
import { processFaceImage } from './services/geminiService';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelected = useCallback(async (file: File) => {
    try {
      setError(null);
      if (file.size > 50 * 1024 * 1024) {
        setError("File size exceeds 50MB limit.");
        return;
      }
      
      const base64 = await fileToBase64(file);
      setOriginalImage(base64);
      setProcessedImage(null); // Reset previous result
    } catch (err) {
      console.error(err);
      setError("Failed to load image. Please try another file.");
    }
  }, []);

  const handleProcessImage = useCallback(async () => {
    if (!originalImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const mimeType = getMimeType(originalImage);
      const rawBase64 = getBase64Data(originalImage);
      
      const processedBase64Data = await processFaceImage(rawBase64, mimeType);
      
      // Construct valid Data URL
      setProcessedImage(`data:${mimeType};base64,${processedBase64Data}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process image with Gemini AI.");
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage]);

  const handleReset = useCallback(() => {
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 selection:bg-brand-500/30">
      <Header />
      
      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full">
        
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-200 animate-in fade-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!originalImage ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] animate-in zoom-in-95 duration-500">
            <div className="w-full max-w-xl">
              <div className="text-center mb-10 space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                  Flawless Skin,<br/>Naturally.
                </h2>
                <p className="text-lg text-slate-400 max-w-md mx-auto">
                  AI-powered blemish removal that respects your skin's texture. No blur, no filters, just you on your best day.
                </p>
              </div>
              <UploadZone onImageSelected={handleImageSelected} isProcessing={isProcessing} />
              
              <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-sm text-slate-500">
                 <div>
                    <span className="block text-white font-medium mb-1">Smart Detection</span>
                    Pinpoints only acne and spots
                 </div>
                 <div>
                    <span className="block text-white font-medium mb-1">Texture Safe</span>
                    Preserves pores and lighting
                 </div>
                 <div>
                    <span className="block text-white font-medium mb-1">Privacy First</span>
                    Processed securely via API
                 </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <Editor 
              originalImage={originalImage}
              processedImage={processedImage}
              isProcessing={isProcessing}
              onReset={handleReset}
              onProcess={handleProcessImage}
            />
          </div>
        )}
      </main>
      
      <footer className="border-t border-slate-800/50 py-8 text-center text-xs text-slate-600">
        <p>&copy; {new Date().getFullYear()} DermaFix AI. Powered by Google Gemini.</p>
      </footer>
    </div>
  );
};

export default App;