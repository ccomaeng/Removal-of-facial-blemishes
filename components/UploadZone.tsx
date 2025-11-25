import React, { useCallback, useState } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

interface UploadZoneProps {
  onImageSelected: (file: File) => void;
  isProcessing: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onImageSelected, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onImageSelected(file);
      }
    }
  }, [onImageSelected]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  }, [onImageSelected]);

  return (
    <div 
      className={`relative group rounded-2xl border-2 border-dashed transition-all duration-300 ease-in-out
        ${isDragging 
          ? 'border-brand-500 bg-brand-500/10 scale-[1.01]' 
          : 'border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50'
        }
        h-80 flex flex-col items-center justify-center cursor-pointer overflow-hidden
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleFileInput}
        disabled={isProcessing}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
      />
      
      <div className="flex flex-col items-center gap-4 text-center p-6 transition-transform duration-300 group-hover:scale-105">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-brand-500/20' : 'bg-slate-800'}`}>
          <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-brand-400' : 'text-slate-400'}`} />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg font-medium text-slate-200">
            Click or drag image here
          </h3>
          <p className="text-sm text-slate-400">
            Supports JPG, PNG (Max 50MB)
          </p>
        </div>
        
        <div className="flex gap-2 text-xs text-slate-500 mt-4 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Best results with close-up portraits</span>
        </div>
      </div>
    </div>
  );
};