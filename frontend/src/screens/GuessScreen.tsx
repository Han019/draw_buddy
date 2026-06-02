import { useEffect, useRef, useState } from "react";
import { CheckCircle2, EyeOff, RefreshCw, Send, Timer } from "lucide-react";

// TODO: 추후 공통 types.ts 파일로 분리
export type StrokePoint = {
  type: "start" | "draw" | "end";
  x: number;
  y: number;
  color: string;
  width: number;
};

interface GuessScreenProps {
  onNext: (guess: string) => void;
  userStrokes: StrokePoint[];
}

export default function GuessScreen({ onNext, userStrokes }: GuessScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [guess, setGuess] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);

  // 타이머 로직
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

  // 이전 그림(userStrokes) 렌더링 로직
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || userStrokes.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parentRect = canvas.parentElement?.getBoundingClientRect();
    if (parentRect) {
      canvas.width = parentRect.width;
      canvas.height = parentRect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    userStrokes.forEach((pt) => {
      if (pt.type === "start") {
        ctx.beginPath();
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = pt.width;
        ctx.moveTo(pt.x * canvas.width, pt.y * canvas.height);
      } else if (pt.type === "draw") {
        ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        ctx.stroke();
      } else if (pt.type === "end") {
        ctx.stroke();
        ctx.beginPath();
      }
    });
  }, [userStrokes]);

  const handleSubmit = () => {
    onNext(guess || "우주 정복하는 고양이 캡틴");
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-lowest font-sans text-ink">
      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center px-4 py-4 md:py-6">
        {/* Header 영역 */}
        <div className="mb-4 flex w-full shrink-0 flex-col items-center justify-between gap-4 sm:flex-row sm:items-start md:mb-6">
          <div className="hidden items-center gap-3 rounded-lg border-[3px] border-ink bg-surface px-4 py-2 shadow-neo-sm sm:flex">
            <RefreshCw className="text-primary" size={24} />
            <div>
              <p className="font-mono text-[10px] font-bold uppercase text-on-surface-variant">Round</p>
              <p className="text-xl font-black leading-none">3 / 5</p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <h1 className="mb-1 font-display text-xl font-extrabold md:text-3xl">이 그림을 문장으로 설명하세요</h1>
            <p className="flex items-center justify-center gap-1 text-xs font-bold text-on-surface-variant md:text-sm">
              <EyeOff size={16} />
              익명의 예술가가 그린 작품입니다
            </p>
          </div>

          <div className="flex min-w-[120px] items-center justify-center gap-2 rounded-lg border-[3px] border-ink bg-secondary-container px-6 py-2 shadow-neo-sm">
            <Timer className="h-5 w-5 shrink-0 text-on-secondary-container" />
            <p className="font-mono text-xl font-bold text-on-secondary-container md:text-2xl">
              0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </p>
          </div>
        </div>

        {/* Canvas / 그림 표시 영역 */}
        <div className="group relative mb-4 flex min-h-0 w-full flex-1 cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border-[3px] border-ink bg-surface shadow-neo md:mb-6">
          {userStrokes.length > 0 ? (
            <div className="relative h-full w-full p-2 md:p-4">
              <canvas ref={canvasRef} className="h-full w-full rounded border-[2px] border-ink bg-surface-container-lowest" />
            </div>
          ) : (
            <img 
              alt="Game Drawing Mock" 
              className="h-full w-full select-none object-contain p-4 md:p-8" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQEJUHykui9eaG52jnkMRZPdw2yNSEkopYKj2OgJ94bdq94sHGsFx7GFK2qhmyt0M6n1CgZ6AbjqwNqATBQ5fqiNxlLAEuHQAKk7WTvmGTXxIafIFpLuNoUugT9aO57twNRzFNHYVK-hIjAXN0x7uO3AIjBGpnUCkZdBD1fJQgX_e4kc6Q6FU3PMYTM5gBWp_Y3SC8efXfWjTSDM1gSLEEMInccdYUtYv2PEpMWNjeLy7SWYzi5jG5flYY264fU6quK0haXru2g0P7"
            />
          )}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink/5 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-lg border-[2px] border-ink bg-surface px-4 py-2 font-bold shadow-neo-sm md:border-[3px]">
              <span>크게 보기</span>
            </div>
          </div>
        </div>

        {/* 입력 및 제출 영역 */}
        <div className="w-full shrink-0 rounded-xl border-[3px] border-ink bg-surface p-4 shadow-neo md:p-6">
          <div className="flex flex-col items-stretch gap-4 md:flex-row">
            <div className="relative flex-grow">
              <textarea 
                maxLength={50}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="그림을 보고 연상되는 문장을 입력하세요..." 
                rows={2}
                value={guess}
                className="h-full min-h-[80px] w-full resize-none rounded-lg border-[3px] border-ink bg-surface-lowest p-4 font-body text-lg font-bold text-ink outline-none focus:border-primary md:text-xl"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <span className={`rounded border-[2px] border-ink px-2 py-1 font-mono text-[10px] font-bold md:text-xs ${
                  guess.length >= 50 ? "bg-error-container text-error" : "bg-surface-container-highest text-ink"
                }`}>
                  {guess.length} / 50
                </span>
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              className="neo-button flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-xl font-black text-white md:w-auto"
              type="button"
            >
              <span>제출하기</span>
              <Send className="h-5 w-5 text-white md:h-6 md:w-6" />
            </button>
          </div>
        </div>
      </main>

      {/* Floating Status Toast 피드백 */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-lg border-[3px] border-ink bg-tertiary-fixed px-4 py-3 text-on-tertiary-fixed shadow-neo-sm md:bottom-8 md:right-8 md:gap-3 md:px-6 md:py-4">
        <CheckCircle2 className="font-black text-on-tertiary-fixed-variant" size={24} />
        <p className="text-sm font-bold">다른 플레이어들이 생각 중입니다...</p>
      </div>
    </div>
  );
}