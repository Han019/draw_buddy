import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, Layers } from 'lucide-react';
import { StrokePoint } from '../types';

interface ReplayModalProps {
  strokes: StrokePoint[];
  subject: string;
  artistName: string;
  onClose: () => void;
}

export default function ReplayModal({ strokes, subject, artistName, onClose }: ReplayModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalStrokes, setTotalStrokes] = useState(0);

  useEffect(() => {
    let count = 0;
    strokes.forEach(pt => { if (pt.type === 'start') count++; });
    setTotalStrokes(count);
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const parentRect = canvas.parentElement?.getBoundingClientRect();
    if (parentRect) {
      canvas.width = parentRect.width;
      canvas.height = parentRect.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pointsToDraw = strokes.slice(0, currentIndex);
    pointsToDraw.forEach((pt) => {
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
  }, [currentIndex, strokes]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= strokes.length) {
          setIsPlaying(false);
          return strokes.length;
        }
        return Math.min(strokes.length, prev + speed);
      });
    }, 30);
    return () => clearInterval(interval);
  }, [isPlaying, speed, strokes]);

  const handleScrub = (value: number) => {
    const targetIdx = Math.floor((value / 100) * strokes.length);
    setCurrentIndex(Math.min(strokes.length, targetIdx));
  };

  const playedPercent = strokes.length > 0 ? (currentIndex / strokes.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-[#1b1b1e]/85 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-sans text-[#1b1b1e]">
      <div className="bg-white border-[4px] border-[#1b1b1e] w-full max-w-4xl h-[95vh] lg:h-[85vh] rounded-2xl neo-brutal-shadow-lg relative overflow-hidden flex flex-col p-4 sm:p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="bg-[#fed01a] border-[2px] border-[#1b1b1e] text-[10px] uppercase font-black tracking-wider px-3 py-1 rounded-sm block w-fit mb-1">Playback Studio</span>
            <h2 className="text-xl sm:text-3xl font-black leading-snug">드로잉 다시보기: <span className="text-[#7c3aed] underline">{subject}</span></h2>
            <p className="text-xs text-[#4a4455] font-bold">Created by <span className="font-extrabold text-[#1b1b1e]">{artistName}</span></p>
          </div>
          <button onClick={onClose} className="bg-[#ba1a1a] text-white p-2 border-[3px] border-[#1b1b1e] rounded-xl neo-brutal-shadow hover:translate-y-0.5 cursor-pointer">
            <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          </button>
        </div>
        <div className="w-full flex-1 border-[3px] border-[#1b1b1e] rounded-xl relative p-0 overflow-hidden mb-4 bg-[#fbf8fc]">
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
        <div className="bg-[#f0edf1] border-[3px] border-[#1b1b1e] p-3 sm:p-4 flex flex-col gap-3 rounded-xl shrink-0">
          <div className="w-full flex items-center gap-4 font-mono text-xs font-bold">
            <span>START</span>
            <div className="flex-grow h-6 relative flex items-center">
              <input type="range" min="0" max="100" value={playedPercent} onChange={(e) => handleScrub(Number(e.target.value))} className="w-full h-3 bg-white border-[2px] border-[#1b1b1e] rounded-lg accent-[#7c3aed] cursor-pointer" />
            </div>
            <span>END</span>
          </div>
          <div className="w-full flex justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 rounded-xl border-[3px] border-[#1b1b1e] flex items-center justify-center bg-[#fed01a] neo-brutal-shadow">
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
              <button onClick={() => { setCurrentIndex(0); setIsPlaying(true); }} className="w-12 h-12 rounded-xl border-[3px] border-[#1b1b1e] flex items-center justify-center bg-white neo-brutal-shadow">
                <RotateCcw className="w-5 h-5" />
              </button>
              <div className="flex border-[2px] border-[#1b1b1e] bg-white rounded-lg font-mono p-0.5">
                {([1, 2, 4] as const).map((s) => <button key={s} onClick={() => setSpeed(s)} className={`px-3 py-1 font-bold text-xs rounded ${speed === s ? 'bg-[#7c3aed] text-white' : ''}`}>{s}x</button>)}
              </div>
            </div>
            <div className="bg-white border-[3px] border-[#1b1b1e] px-4 py-2 font-mono text-xs font-bold rounded flex items-center gap-2 neo-brutal-shadow-sm"><Layers className="w-4 h-4 text-[#7c3aed]" /> Strokes: {totalStrokes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}