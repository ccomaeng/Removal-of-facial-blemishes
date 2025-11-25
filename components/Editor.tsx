import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Sliders, Eye, RefreshCw, X, MousePointer2, Eraser, Circle } from 'lucide-react';

interface EditorProps {
  originalImage: string;
  processedImage: string | null;
  isProcessing: boolean;
  onReset: () => void;
  onProcess: () => void;
}

interface Spot {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  radius: number; // Percentage of width
}

export const Editor: React.FC<EditorProps> = ({ 
  originalImage, 
  processedImage, 
  isProcessing,
  onReset,
  onProcess
}) => {
  const [intensity, setIntensity] = useState(60); // Default to 60 for natural look
  const [viewMode, setViewMode] = useState<'split' | 'hold'>('split');
  const [retouchMode, setRetouchMode] = useState<'auto' | 'manual'>('auto');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [brushSize, setBrushSize] = useState(2.5); // Reduced default size
  const [aspectRatio, setAspectRatio] = useState(1); // width / height
  
  // Custom Cursor State
  const [cursorPos, setCursorPos] = useState<{x: number, y: number} | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  
  // -- Image Load --
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalHeight > 0) {
        setAspectRatio(naturalWidth / naturalHeight);
    }
  };

  // -- Slider Logic --
  const handleDragStart = () => setIsDraggingSlider(true);
  const handleDragStop = () => setIsDraggingSlider(false);
  
  const handleSliderMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingSlider || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    
    setSliderPosition(percentage);
  }, [isDraggingSlider]);

  useEffect(() => {
    if (isDraggingSlider) {
      window.addEventListener('mouseup', handleDragStop);
      window.addEventListener('touchend', handleDragStop);
    }
    return () => {
      window.removeEventListener('mouseup', handleDragStop);
      window.removeEventListener('touchend', handleDragStop);
    };
  }, [isDraggingSlider]);


  // -- Mouse Tracking for Cursor & Spots --
  const handleMouseMove = (e: React.MouseEvent) => {
      if (retouchMode === 'manual' && containerRef.current) {
         setCursorPos({ x: e.clientX, y: e.clientY });
      } else {
         setCursorPos(null);
      }
      
      // Also handle slider if dragging
      if (isDraggingSlider) {
          handleSliderMove(e);
      }
  };
  
  const handleMouseLeave = () => {
      setCursorPos(null);
      setIsHoldingOriginal(false);
  };

  // -- Spot/Circle Logic --
  const handleImageClick = (e: React.MouseEvent) => {
    if (retouchMode !== 'manual' || !containerRef.current) return;
    
    // Prevent adding spots if we are dragging the slider or clicking a control
    if ((e.target as HTMLElement).closest('.slider-handle') || (e.target as HTMLElement).closest('.spot-remover')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newSpot: Spot = {
      id: Date.now().toString(),
      x,
      y,
      radius: brushSize
    };

    setSpots(prev => [...prev, newSpot]);
  };

  const removeSpot = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setSpots(prev => prev.filter(s => s.id !== id));
  };


  // -- Download Logic (Single Image Composition) --
  const handleDownload = () => {
    if (!processedImage) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const imgOriginal = new Image();
    const imgProcessed = new Image();

    const loadImg = (img: HTMLImageElement, src: string) => {
        return new Promise<void>((resolve) => {
            img.crossOrigin = "anonymous";
            img.onload = () => resolve();
            img.src = src;
        });
    };

    Promise.all([loadImg(imgOriginal, originalImage), loadImg(imgProcessed, processedImage)]).then(() => {
        // Set canvas to natural resolution
        canvas.width = imgOriginal.naturalWidth;
        canvas.height = imgOriginal.naturalHeight;
        
        if (!ctx) return;

        // 1. Draw Original Background
        ctx.drawImage(imgOriginal, 0, 0);

        // 2. Prepare to Draw Processed Layer
        ctx.save();
        
        // 3. Apply Opacity (Intensity)
        ctx.globalAlpha = intensity / 100;

        // 4. Apply Masking (if in manual mode)
        if (retouchMode === 'manual') {
            if (spots.length === 0) {
                // If no spots, mask everything (show nothing of processed layer)
                ctx.beginPath();
                ctx.rect(0, 0, 0, 0);
                ctx.clip();
            } else {
                ctx.beginPath();
                spots.forEach(spot => {
                    // Convert % coordinates to pixels
                    const x = (spot.x / 100) * canvas.width;
                    const y = (spot.y / 100) * canvas.height;
                    const r = (spot.radius / 100) * canvas.width;
                    
                    ctx.moveTo(x + r, y);
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                });
                ctx.clip();
            }
        }

        // 5. Draw Processed Image SCALED to fit exact dimensions
        // This fixes the issue where processed image might be smaller or off-center
        ctx.drawImage(imgProcessed, 0, 0, canvas.width, canvas.height);
        
        ctx.restore();
        
        // 6. Download
        const link = document.createElement('a');
        link.download = 'dermafix-retouched.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
    });
  };

  // Generate CSS Mask for visual preview
  const getMaskStyle = () => {
    if (retouchMode === 'auto') {
         return { opacity: intensity / 100 };
    }
    
    // Manual Mode
    if (spots.length === 0) {
        // IMPORTANT: Hide processed image completely if manual mode has no spots
        return { opacity: 0 };
    }
    
    // Mask logic
    return { 
        opacity: intensity / 100,
        clipPath: `url(#spot-mask)` 
    };
  };

  // Calculate cursor size in pixels based on container width (if available)
  const getCursorSizePx = () => {
      if (!containerRef.current) return 20;
      return (containerRef.current.offsetWidth * brushSize) / 100;
  };


  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* --- SVG Definition for masking (Hidden) --- */}
      <svg className="absolute w-0 h-0">
        <defs>
            <clipPath id="spot-mask" clipPathUnits="objectBoundingBox">
                 {spots.map((spot) => (
                    <ellipse 
                        key={spot.id} 
                        cx={spot.x / 100} 
                        cy={spot.y / 100} 
                        rx={spot.radius / 100} 
                        ry={(spot.radius / 100) * aspectRatio} 
                    />
                 ))}
                 {spots.length === 0 && <rect x="0" y="0" width="0" height="0" />}
            </clipPath>
        </defs>
      </svg>
      
      {/* --- Custom Cursor Overlay --- */}
      {retouchMode === 'manual' && cursorPos && (
        <div 
            className="fixed pointer-events-none z-50 rounded-full border border-white/80 bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.3)] backdrop-invert"
            style={{
                left: cursorPos.x,
                top: cursorPos.y,
                width: getCursorSizePx() * 2, // Radius * 2 = Diameter
                height: getCursorSizePx() * 2,
                transform: 'translate(-50%, -50%)',
            }}
        />
      )}


      {/* --- Toolbar --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <button 
          onClick={onReset}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <X className="w-4 h-4" />
          Close
        </button>

        <div className="flex items-center gap-3">
          {!processedImage ? (
             <button
             onClick={onProcess}
             disabled={isProcessing}
             className={`
               flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white shadow-lg shadow-brand-500/20 transition-all
               ${isProcessing 
                 ? 'bg-slate-700 cursor-wait opacity-80' 
                 : 'bg-brand-600 hover:bg-brand-500 hover:scale-105 active:scale-95'
               }
             `}
           >
             {isProcessing ? (
               <>
                 <RefreshCw className="w-4 h-4 animate-spin" />
                 Processing...
               </>
             ) : (
               <>
                 <SparklesIcon />
                 Generate Retouch
               </>
             )}
           </button>
          ) : (
             <button
             onClick={handleDownload}
             className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
           >
             <Download className="w-4 h-4" />
             Download Image
           </button>
          )}
        </div>
      </div>

      {/* --- Main Workspace --- */}
      <div className="flex flex-col lg:flex-row gap-6 h-full">
        
        {/* Image Viewport */}
        <div className="flex-1 bg-slate-900/30 rounded-2xl border border-slate-800 p-1 flex items-center justify-center relative overflow-hidden min-h-[400px]">
          
          <div 
             ref={containerRef}
             className={`
                relative select-none 
                ${retouchMode === 'manual' ? 'cursor-none' : 'cursor-default'}
             `}
             onMouseMove={handleMouseMove}
             onMouseLeave={handleMouseLeave}
             onTouchMove={handleSliderMove}
             onClick={handleImageClick}
          >
            {/* Layer 1: Original Base */}
            <img 
              ref={imageRef}
              src={originalImage} 
              alt="Original" 
              onLoad={handleImageLoad}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              draggable={false}
            />

            {/* Layer 2: Processed Overlay (Blended) */}
            {processedImage && (
              <div 
                className="absolute inset-0 w-full h-full rounded-lg overflow-hidden pointer-events-none"
                style={{ opacity: isHoldingOriginal ? 0 : 1 }}
              >
                 <img 
                    src={processedImage}
                    alt="Processed"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-100"
                    style={getMaskStyle()}
                 />

                 {/* Comparison Slider (Auto Mode) */}
                 {viewMode === 'split' && retouchMode === 'auto' && (
                    <div 
                        className="absolute inset-0 w-full h-full bg-slate-950 slider-handle pointer-events-auto"
                        style={{ 
                            clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                        }}
                    >
                         <img 
                            src={originalImage}
                            alt="Original Clipped"
                            className="absolute inset-0 w-full h-full object-contain"
                        />
                    </div>
                 )}
              </div>
            )}

            {/* Layer 3: UI Overlays (Spots - Indicators) */}
            {retouchMode === 'manual' && spots.map(spot => (
                <div
                    key={spot.id}
                    className="absolute rounded-full border border-white/30 bg-white/10 hover:bg-red-500/20 hover:border-red-500 transition-colors group cursor-pointer spot-remover"
                    style={{
                        left: `${spot.x}%`,
                        top: `${spot.y}%`,
                        width: `${spot.radius * 2}%`, // Use percentage width
                        aspectRatio: '1/1', // Keep visual circle
                        transform: 'translate(-50%, -50%)'
                    }}
                    onClick={(e) => removeSpot(e, spot.id)}
                >
                    <div className="hidden group-hover:flex items-center justify-center w-full h-full text-red-500">
                        <X className="w-1/2 h-1/2" />
                    </div>
                </div>
            ))}

            {/* Slider Handle UI */}
            {processedImage && viewMode === 'split' && retouchMode === 'auto' && (
              <div 
                className="absolute inset-y-0 w-1 bg-white/50 backdrop-blur-sm cursor-ew-resize z-20 flex items-center justify-center hover:bg-white slider-handle"
                style={{ left: `${sliderPosition}%` }}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
              >
                <div className="w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center text-slate-900 transform -translate-x-1/2 pointer-events-none">
                   <div className="flex gap-0.5">
                       <div className="w-0.5 h-3 bg-slate-400"></div>
                       <div className="w-0.5 h-3 bg-slate-400"></div>
                   </div>
                </div>
              </div>
            )}
            
            {/* Labels */}
            {processedImage && viewMode === 'split' && retouchMode === 'auto' && (
                <>
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white pointer-events-none z-10">
                        Original
                    </div>
                    <div className="absolute top-4 right-4 bg-brand-600/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white pointer-events-none z-10">
                        Retouched
                    </div>
                </>
            )}

          </div>
        </div>

        {/* --- Controls Sidebar --- */}
        <div className="w-full lg:w-80 flex flex-col gap-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 h-fit overflow-y-auto max-h-full">
            
            {/* 1. Retouch Mode Selection */}
            <div className="space-y-3">
                 <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                     <Sliders className="w-4 h-4" /> Mode
                 </h3>
                 <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
                    <button
                        onClick={() => { setRetouchMode('auto'); setViewMode('split'); }}
                        className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                            retouchMode === 'auto' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        Auto (Full)
                    </button>
                    <button
                        onClick={() => { setRetouchMode('manual'); setViewMode('hold'); }}
                        className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                            retouchMode === 'manual' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <MousePointer2 className="w-3.5 h-3.5" />
                        Manual Spots
                    </button>
                 </div>
                 
                 {retouchMode === 'manual' && (
                     <div className="p-3 bg-brand-900/20 border border-brand-500/30 rounded-lg text-xs text-brand-200 leading-relaxed">
                         <strong>Manual Mode:</strong> Click on the face to remove blemishes only in that spot.
                     </div>
                 )}
            </div>

            {retouchMode === 'manual' && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Brush Size</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="8"
                        step="0.5"
                        value={brushSize}
                        onChange={(e) => setBrushSize(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                    />
                    {spots.length > 0 && (
                        <button 
                            onClick={() => setSpots([])}
                            className="w-full flex items-center justify-center gap-2 py-2 mt-2 text-xs font-medium text-red-400 hover:bg-red-950/30 border border-red-900/50 rounded-lg transition-colors"
                        >
                            <Eraser className="w-3 h-3" /> Clear All Spots
                        </button>
                    )}
                </div>
            )}

            <div className="h-px bg-slate-800" />

            {processedImage && (
                <div className="space-y-4 animate-in fade-in">
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Correction Intensity</span>
                        <span className="text-brand-400 font-mono">{intensity}%</span>
                        </div>
                        <input
                        type="range"
                        min="0"
                        max="100"
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
                        />
                        <p className="text-xs text-slate-500 leading-relaxed">
                        Adjust how strongly the retouch blends with original skin texture.
                        </p>
                    </div>

                    <div className="h-px bg-slate-800" />

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                             <Eye className="w-4 h-4" /> Compare
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                            disabled={retouchMode === 'manual'}
                            onClick={() => setViewMode('split')}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                                viewMode === 'split' 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-slate-800 border-slate-800 text-slate-400 hover:bg-slate-750 disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                            >
                                Split Preview
                            </button>
                            <button
                            onClick={() => setViewMode('hold')}
                            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${
                                viewMode === 'hold' 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-slate-800 border-slate-800 text-slate-400 hover:bg-slate-750'
                            }`}
                            >
                                Hold for Original
                            </button>
                        </div>

                        {viewMode === 'hold' && (
                            <button
                                onMouseDown={() => setIsHoldingOriginal(true)}
                                onMouseUp={() => setIsHoldingOriginal(false)}
                                onMouseLeave={() => setIsHoldingOriginal(false)}
                                onTouchStart={() => setIsHoldingOriginal(true)}
                                onTouchEnd={() => setIsHoldingOriginal(false)}
                                className="w-full py-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors select-none"
                            >
                                Hold to see Before
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!processedImage && (
                <div className="mt-auto p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <h4 className="text-sm font-medium text-slate-200 mb-2">Tips</h4>
                    <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                        <li>Use "Auto" for quick full-face cleanup.</li>
                        <li>Use "Manual Spots" to surgically remove individual blemishes.</li>
                        <li>Hover over the image to see your brush size.</li>
                    </ul>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

const SparklesIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L14.39 9.61L22 12L14.39 14.39L12 22L9.61 14.39L2 12L9.61 9.61L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);