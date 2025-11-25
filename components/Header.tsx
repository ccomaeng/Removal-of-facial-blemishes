import React from 'react';
import { Sparkles, Camera } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-brand-600 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">DermaFix AI</h1>
            <p className="text-xs text-slate-400">Professional Skin Retouching</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
           <span className="hidden sm:flex items-center gap-1">
             <Camera className="w-4 h-4" />
             <span>Powered by Gemini 2.5</span>
           </span>
        </div>
      </div>
    </header>
  );
};