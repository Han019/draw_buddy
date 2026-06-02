import React, { useRef, useState, useEffect } from 'react';
import { Undo2, Redo2, Trash2, Eraser, Send, Timer } from 'lucide-react';
import { StrokePoint } from '../types';

interface DrawingScreenProps {
  prompt: string;
  drawTime: number;
  onFinished: (drawnStrokes: StrokePoint[]) => void;
}

export default function DrawingScreen({ prompt, drawTime, onFinished }: DrawingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [color, setColor] = useState('#1b1b1e');
  const [brushWidth, setBrushWidth] = useState(10);
  const [isEraser, setIsEraser] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(drawTime || 80);
  const [strokeHistory, setStrokeHistory] = useState<StrokePoint[]>([]);
  const [redoStack, setRedoStack] = useState<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        redrawCanvas();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [strokeHistory]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    strokeHistory.forEach((pt) => {
      if (pt.type === 'start') {
        ctx.beginPath();
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = pt.width;
        ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
      } else if (pt.type === 'draw') {
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        ctx.stroke();
      } else if (pt.type === 'end') {
        ctx.stroke();
        ctx.beginPath();
      }
    });
  };

  const drawPoint = (x: number, y: number, type: 'start' | 'draw' | 'end') => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const normX = (x - rect.left) / rect.width;
    const normY = (y - rect.top) / rect.height;
    const activeColor = isEraser ? '#ffffff' : color;
    const newPoint: StrokePoint = { x: normX, y: normY, type, color: activeColor, width: brushWidth };
    return newPoint;
  };

  const handleStart = (clientX: number, clientY: number) => {
    isDrawingRef.current = true;
    const pt = drawPoint(clientX, clientY, 'start');
    if (pt) {
      setStrokeHistory((prev) => [...prev, pt]);
      setRedoStack([]);
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const pt = drawPoint(clientX, clientY, 'draw');
    if (pt) setStrokeHistory((prev) => [...prev, pt]);
  };

  const handleEnd = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const lastHistory = strokeHistory[strokeHistory.length - 1];
    if (lastHistory) {
      const pt: StrokePoint = { ...lastHistory, type: 'end' };
      setStrokeHistory((prev) => [...prev, pt]);
    }
  };

  const handleUndo = () => {
    if (strokeHistory.length === 0) return;
    let lastStartIdx = -1;
    for (let i = strokeHistory.length - 1; i >= 0; i--) {
      if (strokeHistory[i].type === 'start') { lastStartIdx = i; break; }
    }
    if (lastStartIdx !== -1) {
      const popped = strokeHistory.slice(lastStartIdx);
      setRedoStack((prev) => [...prev, ...popped]);
      setStrokeHistory((prev) => prev.slice(0, lastStartIdx));
    }
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    let endIdx = -1;
    for (let i = 0; i < redoStack.length; i++) {
      if (redoStack[i].type === 'end') { endIdx = i; break; }
    }
    if (endIdx !== -1) {
      const stateToRestore = redoStack.slice(0, endIdx + 1);
      setStrokeHistory((prev) => [...prev, ...stateToRestore]);
      setRedoStack((prev) => prev.slice(endIdx + 1));
    } else {
      setStrokeHistory((prev) => [...prev, ...redoStack]);
      setRedoStack([]);
    }
  };

  return (
    <div className="h-screen w-full bg-[#fbf8fc] flex flex-col font-sans text-[#1b1b1e] overflow-hidden">
      <main className="flex-1 px-2 md:px-6 py-2 md:py-6 max-w-7xl mx-auto w-full flex flex-col min-h-0 min-w-0">
        <div className="w-full mb-2 md:mb-4 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-white border-[2px] md:border-[3px] border-[#1b1b1e] p-2 md:p-3 neo-brutal-shadow rounded-xl flex-1">
            <span className="bg-[#7c3aed] text-white font-extrabold px-2 py-1 rounded border-[2px] border-[#1b1b1e] text-[10px] md:text-xs font-mono shrink-0">NOW DRAWING</span>
            <h2 className="text-sm md:text-xl font-black truncate">
              그려주세요: <span className="text-[#630ed4] underline decoration-2 md:decoration-4 underline-offset-4">{prompt}</span>
            </h2>
          </div>
          <div className="bg-[#fed01a] border-[2px] md:border-[3px] border-[#1b1b1e] p-2 md:p-3 neo-brutal-shadow flex items-center gap-2 md:gap-3 rounded-xl font-mono shrink-0">
            <Timer className="w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <span className="text-xl md:text-2xl font-bold">0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</span>
          </div>
        </div>
        
        <div ref={containerRef} className="w-full flex-1 bg-white border-[3px] border-[#1b1b1e] neo-brutal-shadow-sm md:neo-brutal-shadow-lg rounded-xl overflow-hidden relative flex items-center justify-center cursor-crosshair min-h-0" onMouseDown={(e) => handleStart(e.clientX, e.clientY)} onMouseMove={(e) => handleMove(e.clientX, e.clientY)} onMouseUp={handleEnd} onMouseLeave={handleEnd} onTouchStart={(e) => { const touch = e.touches[0]; if (touch) handleStart(touch.clientX, touch.clientY); }} onTouchMove={(e) => { const touch = e.touches[0]; if (touch) handleMove(touch.clientX, touch.clientY); }} onTouchEnd={handleEnd}>
          {strokeHistory.length === 0 && (
            <div className="absolute inset-0 pointer-events-none opacity-5 flex items-center justify-center select-none">
              <span className="text-4xl md:text-6xl font-black rotate-12 uppercase">DRAW HERE</span>
            </div>
          )}
          <canvas ref={canvasRef} className="w-full h-full bg-transparent touch-none" />
        </div>
        
        <div className="w-full mt-2 md:mt-4 flex flex-col lg:flex-row items-center justify-between gap-3 md:gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-[#e4e1e5] p-2 md:p-4 border-[3px] border-[#1b1b1e] neo-brutal-shadow rounded-xl w-full lg:w-auto overflow-x-auto">
            <div className="flex gap-2 pr-4 border-r-[3px] border-[#1b1b1e] items-center shrink-0">
              {['#7c3aed', '#fed01a', '#6dfe9c', '#ba1a1a', '#1b1b1e', '#ffffff'].map((swatchColor) => (
                <button key={swatchColor} onClick={() => { setColor(swatchColor); setIsEraser(false); }} style={{ backgroundColor: swatchColor }} className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-[2px] border-[#1b1b1e] transition-transform shrink-0 ${color === swatchColor && !isEraser ? 'scale-110 ring-2 ring-[#7c3aed]' : 'hover:scale-105'}`} />
              ))}
              <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setIsEraser(false); }} className="w-7 h-7 md:w-8 md:h-8 ml-2 cursor-pointer rounded-full border-0 p-0 shadow-none hover:scale-105" />
            </div>
            <div className="flex items-center gap-2 md:gap-3 px-4 border-r-[3px] border-[#1b1b1e] shrink-0">
              {[5, 10, 16, 24].map((width) => (
                <button key={width} onClick={() => setBrushWidth(width)} className={`p-1 rounded hover:bg-white flex items-center justify-center ${brushWidth === width ? 'bg-white border-2 border-[#1b1b1e]' : ''}`}>
                  <div className="bg-[#1b1b1e] rounded-full" style={{ width: `${Math.max(4, width / 1.5)}px`, height: `${Math.max(4, width / 1.5)}px` }} />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 md:gap-3 pl-2 shrink-0">
              <button onClick={handleUndo} className="p-1 md:p-2 hover:bg-white rounded"><Undo2 className="w-4 h-4 md:w-5 md:h-5 text-black" /></button>
              <button onClick={handleRedo} className="p-1 md:p-2 hover:bg-white rounded"><Redo2 className="w-4 h-4 md:w-5 md:h-5 text-black" /></button>
              <button onClick={() => setIsEraser(!isEraser)} className={`p-1 md:p-2 rounded ${isEraser ? 'bg-[#7c3aed] text-white' : 'hover:bg-white text-black'}`}><Eraser className="w-4 h-4 md:w-5 md:h-5" /></button>
              <button onClick={() => { setStrokeHistory([]); setRedoStack([]); }} className="p-1 md:p-2 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 md:w-5 md:h-5 text-[#ba1a1a]" /></button>
            </div>
          </div>
          <button onClick={() => onFinished(strokeHistory)} className="w-full lg:w-auto flex items-center justify-center gap-2 md:gap-3 bg-[#6dfe9c] text-[#00210c] border-[3px] border-[#1b1b1e] px-6 py-3 md:px-10 md:py-4 neo-brutal-shadow rounded-xl btn-press font-black text-lg shrink-0 lg:ml-auto">
            <span>완료하기</span><Send className="w-5 h-5" />
          </button>
        </div>
      </main>
    </div>
  );
}