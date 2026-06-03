import React, { useState, useEffect } from 'react';
import { Shuffle, Send, Palette, Brain, Hourglass, Swords } from 'lucide-react';

interface PromptScreenProps {
  defaultText?: string;
  timeLimit?: number;
  onNext: (customPrompt: string) => void;
  onCancel?: () => void;
  isSubmitted?: boolean;
  currentTurn?: number;
  totalPlayers?: number;
}

const DEFAULT_PROMPTS = {
  pool: [
    "외계인과 춤추는 고양이",
    "피자를 먹는 우주인",
    "스케이트보드 타는 할머니",
    "하늘을 나는 보라색 수박",
    "디스코 추는 아기 코끼리",
    "선글라스를 쓴 식인 양파"
  ],
  Animals: [
    "우주에서 떡볶이 먹는 토끼",
    "헤드폰을 쓴 슈나우저 강아지",
    "서핑하는 뚱뚱한 펭귄",
    "광선검을 든 스파이더맨",
    "해리포터 모자를 쓴 아이언맨",
    "타이타닉 위에서 요가하는 슈렉",
  ]
};

export default function PromptScreen({ defaultText, timeLimit = 30, onNext, onCancel, isSubmitted, currentTurn, totalPlayers }: PromptScreenProps) {
  const promptPool = DEFAULT_PROMPTS.pool;
  const [prompt, setPrompt] = useState(defaultText || promptPool[0]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useEffect(() => {
    if (isSubmitted) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isSubmitted) onNext(prompt);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, prompt, onNext]);

  const handleShuffle = () => {
    if (isSubmitted) return;
    const remaining = promptPool.filter((p) => p !== prompt);
    const random = remaining[Math.floor(Math.random() * remaining.length)] || promptPool[0];
    setPrompt(random);
  };

  const handleSubmit = () => {
    if (isSubmitted) {
      onCancel?.();
    } else {
      onNext(prompt);
    }
  };

  return (
    <div className="h-full bg-[#fbf8fc] flex flex-col font-sans text-[#1b1b1e] overflow-hidden">
      <main className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-4 md:py-8 max-w-4xl mx-auto w-full min-h-0">
        {/* Top Header Info */}
        <div className="w-full flex justify-between items-center mb-4 md:mb-8 shrink-0">
          <div className="flex items-center gap-4 bg-white border-[3px] border-[#1b1b1e] px-4 py-2 neo-brutal-shadow rounded-lg">
            <div>
              <p className="text-xl font-black leading-none">{currentTurn ?? 1} / {totalPlayers ?? 5}</p>
            </div>
          </div>
          <div className="bg-[#ba1a1a] text-white border-[3px] border-[#1b1b1e] neo-brutal-shadow px-4 py-2 flex items-center gap-2 rounded-lg font-mono">
            <Hourglass className="w-5 h-5 animate-spin" />
            <span className="text-xl font-bold">
              0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          </div>
        </div>

        <div className="w-full bg-white border-[3px] border-[#1b1b1e] neo-brutal-shadow-lg p-6 md:p-8 flex flex-col items-center text-center rounded-xl relative flex-1 min-h-0 justify-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2 shrink-0">첫 문장을 작성하세요</h2>
          <p className="text-[#4a4455] text-sm md:text-base font-bold mb-6 shrink-0">
            기본 제시어를 그대로 사용하거나 나만의 문장으로 바꿔보세요!
          </p>

          <div className="w-full relative mb-6 flex-1 min-h-0 flex flex-col">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isSubmitted}
              spellCheck={false}
              className="w-full flex-1 p-4 md:p-6 text-2xl md:text-4xl font-extrabold text-center bg-[#f0edf1] border-[3px] border-[#1b1b1e] focus:ring-0 focus:outline-none placeholder-gray-400 resize-none rounded-lg leading-relaxed text-[#1b1b1e] disabled:opacity-60"
            />
            {/* Floating Label Decoration */}
            <div className="absolute -top-3 left-4 bg-[#fed01a] text-black border-[2px] border-[#1b1b1e] px-2 py-0.5 text-[10px] md:text-xs font-mono font-bold uppercase tracking-wider rounded">
              Creative Input
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full shrink-0">
            {/* Shuffle Button */}
            <button
              onClick={handleShuffle}
              disabled={isSubmitted}
              className="flex-1 bg-[#fed01a] text-black font-bold py-4 border-[3px] border-[#1b1b1e] neo-brutal-shadow btn-press flex items-center justify-center gap-2 rounded-lg text-lg cursor-pointer disabled:opacity-50"
            >
              <Shuffle className="w-5 h-5" />
              <span>새로고침</span>
            </button>
            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className={`flex-[2] text-white font-extrabold py-4 border-[3px] border-[#1b1b1e] neo-brutal-shadow btn-press flex items-center justify-center gap-2 rounded-lg text-xl cursor-pointer ${isSubmitted ? 'bg-[#ba1a1a]' : 'bg-[#7c3aed]'}`}
            >
              <span>{isSubmitted ? "제출 취소" : "제출하기"}</span>
              {isSubmitted ? null : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Secondary Help Bento Grid */}
        <div className="mt-4 md:mt-8 hidden sm:grid grid-cols-1 md:grid-cols-3 gap-4 w-full shrink-0">
          <div className="bg-[#6dfe9c] text-black p-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow flex items-center gap-3 rounded-lg">
            <Brain className="w-6 h-6 shrink-0 text-black" />
            <span className="font-mono text-[10px] font-bold leading-relaxed">
              최대한 구체적일수록 재미있는 그림이 나옵니다!
            </span>
          </div>
          <div className="bg-[#eaddff] text-black p-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow flex items-center gap-3 rounded-lg">
            <Swords className="w-6 h-6 shrink-0 text-black" />
            <span className="font-mono text-[10px] font-bold leading-relaxed">
              다른 플레이어들이 당황할 만한 황당한 문장을 써보세요.
            </span>
          </div>
          <div className="bg-[#ffe083] text-black p-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow flex items-center gap-3 rounded-lg">
            <Palette className="w-6 h-6 shrink-0 text-black" />
            <span className="font-mono text-[10px] font-bold leading-relaxed">
              나중에 갤러리에서 이번 게임의 모든 과정을 볼 수 있습니다.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
