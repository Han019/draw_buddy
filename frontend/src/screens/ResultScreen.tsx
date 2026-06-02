import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Play, RefreshCw, Home, MessageSquare, Send, X } from 'lucide-react';
import { StrokePoint } from '../types';

interface ResultScreenProps {
  userPrompt?: string;
  userStrokes?: StrokePoint[];
  userGuess?: string;
  onReplay: (strokes: StrokePoint[], subject: string, artistName: string) => void;
  onRestart: () => void;
  onExit: () => void;
}

export default function ResultScreen({
  userPrompt,
  userStrokes,
  userGuess,
  onReplay,
  onRestart,
  onExit
}: ResultScreenProps) {
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'System', text: '결과 공개 화면에 입장했습니다.', isMe: false }
  ]);
  const [inputText, setInputText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const maxSteps = 4;
  const chatEndRef = useRef<HTMLDivElement>(null);

  const mockPlayers = [
    { id: 1, name: 'Felix', color: '#ffe083' },
    { id: 2, name: 'Mia', color: '#6dfe9c' },
    { id: 3, name: 'DoodleBob', color: '#ffb4ab' },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showMobileChat]);

  const handleSendChat = () => {
    if (!inputText.trim()) return;
    setChatMessages(prev => [...prev, { id: Date.now().toString(), sender: 'You', text: inputText, isMe: true }]);
    setInputText('');
  };

  return (
    <div className="h-screen bg-[#fbf8fc] flex font-sans text-[#1b1b1e] w-full overflow-hidden">
      {/* Main Center Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <main className="flex-1 overflow-y-auto px-4 md:px-12 w-full pt-8 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="my-8 flex flex-col gap-6 pb-6 border-b-2 border-dashed border-[#1b1b1e]">
              <div className="flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {mockPlayers.map((player, idx) => (
                  <button 
                    key={player.id}
                    onClick={() => { setCurrentChainIndex(idx); setCurrentStep(1); }}
                    className={`flex-shrink-0 flex items-center justify-center p-1 rounded-full transition-all ${currentChainIndex === idx ? 'ring-4 ring-[#630ed4] ring-offset-2' : 'hover:scale-110 opacity-70 hover:opacity-100 cursor-pointer'}`}
                  >
                    <div style={{ backgroundColor: player.color }} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] border-[#1b1b1e] flex items-center justify-center font-bold text-xl">{player.name[0]}</div>
                  </button>
                ))}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1b1b1e] font-sans">
                  {mockPlayers[currentChainIndex].name}'s Chain
                </h1>
              </div>
            </div>

            {/* Timeline steps */}
            <div className="space-y-12 relative before:content-[''] before:absolute before:left-8 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#1b1b1e]">
              
              {currentStep >= 1 && (
                <div className="relative pl-16 group">
                  <div className="absolute left-6 top-8 w-4 h-4 bg-[#7c3aed] border-[3px] border-[#1b1b1e] rounded-full z-10"></div>
                  <div className="bg-white border-[3px] border-[#1b1b1e] neo-brutal-shadow p-6 rounded-xl relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 border-[3px] border-[#1b1b1e] bg-[#ffe083] rounded-full flex items-center justify-center font-bold">F</div>
                      <div>
                        <p className="font-bold text-[#1b1b1e]">Felix</p>
                        <p className="text-xs uppercase font-black text-[#7c3aed] tracking-wider font-mono">Initial Sentence</p>
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-extrabold text-[#1b1b1e]">"{userPrompt || "우주에서 떡볶이 먹는 토끼"}"</p>
                  </div>
                </div>
              )}

              {currentStep >= 2 && (
                <div className="relative pl-16 group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#00773b] border-[3px] border-[#1b1b1e] rounded-full z-10"></div>
                  <div className="bg-white border-[3px] border-[#1b1b1e] neo-brutal-shadow-lg rounded-xl overflow-hidden">
                    <div className="p-4 md:p-6 border-b-[3px] border-[#1b1b1e] flex flex-wrap gap-4 justify-between items-center bg-[#f0edf1]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-[3px] border-[#1b1b1e] bg-[#6dfe9c] rounded-full flex items-center justify-center font-bold">M</div>
                        <div>
                          <p className="font-bold text-[#1b1b1e]">Mia</p>
                          <p className="text-xs uppercase font-black text-[#00773b] tracking-wider font-mono">Drawing</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onReplay(userStrokes || [], userPrompt || "우주 토끼", "Mia"); }} className="flex items-center gap-2 bg-[#fed01a] border-[3px] border-[#1b1b1e] px-4 py-2 font-bold neo-brutal-shadow rounded-lg cursor-pointer">
                        <Play className="w-4 h-4 text-black fill-current" /> 재생
                      </button>
                    </div>
                    <div className="aspect-[4/3] max-h-96 md:max-h-none bg-[#eae7eb] p-4 flex items-center justify-center text-[#4a4455] font-bold border-t-[3px] border-[#1b1b1e]">
                      [그림 화면 - 리플레이를 눌러 확인하세요]
                    </div>
                  </div>
                </div>
              )}

              {currentStep >= 3 && (
                <div className="relative pl-16 group">
                  <div className="absolute left-6 top-8 w-4 h-4 bg-[#ba1a1a] border-[3px] border-[#1b1b1e] rounded-full z-10"></div>
                  <div className="bg-white border-[3px] border-[#1b1b1e] neo-brutal-shadow p-6 rounded-xl relative">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 border-[3px] border-[#1b1b1e] bg-red-100 rounded-full flex items-center justify-center font-bold">D</div>
                      <div>
                        <p className="font-bold text-[#1b1b1e]">DoodleBob</p>
                        <p className="text-xs uppercase font-black text-[#ba1a1a] tracking-wider font-mono">The Guess</p>
                      </div>
                    </div>
                    <p className="text-2xl md:text-3xl font-extrabold text-[#1b1b1e]">"{userGuess || "우주 정복하는 고양이 캡틴"}"</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Sticky Bottom Actions */}
        <footer className="shrink-0 bg-white border-t-[3px] border-[#1b1b1e] px-4 py-6 flex flex-wrap justify-center items-center gap-4">
          <div className="flex gap-4 w-full max-w-4xl justify-center font-sans">
            {currentStep < maxSteps || currentChainIndex < mockPlayers.length - 1 ? (
              <button onClick={() => { if (currentStep < maxSteps) { setCurrentStep(prev => prev + 1); } else { setCurrentChainIndex(prev => prev + 1); setCurrentStep(1); } }} className="flex-grow max-w-[300px] bg-[#6dfe9c] py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer">
                <span>다음</span><ArrowRight className="w-6 h-6 stroke-[3]" />
              </button>
            ) : (
              <>
                <button onClick={onRestart} className="flex-grow max-w-[300px] bg-[#6dfe9c] py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer"><RefreshCw className="w-6 h-6 stroke-[3]" />다시 하기</button>
                <button onClick={onExit} className="flex-grow max-w-[300px] bg-[#7c3aed] text-white py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer"><Home className="w-6 h-6 stroke-[3]" />나가기</button>
              </>
            )}
            <button onClick={() => setShowMobileChat(true)} className="lg:hidden flex-grow max-w-[300px] bg-[#fed01a] py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer"><MessageSquare className="w-6 h-6 stroke-[3]" />채팅</button>
          </div>
        </footer>
      </div>

      {/* Right Sidebar (Chat Reaction) */}
      <aside className={`${showMobileChat ? 'fixed inset-0 z-[60] flex' : 'hidden lg:flex'} flex-col w-full lg:w-96 min-h-0 shrink-0 bg-white border-l-[3px] border-[#1b1b1e] h-full`}>
        <div className="p-6 border-b-[3px] border-[#1b1b1e] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-[#630ed4] w-5 h-5 shrink-0" />
            <h2 className="text-xl font-bold">Results Chat</h2>
          </div>
          {showMobileChat && <button onClick={() => setShowMobileChat(false)} className="lg:hidden p-2 hover:bg-gray-200 rounded-full cursor-pointer"><X className="w-6 h-6 text-black" /></button>}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f6f2f7]">
          {chatMessages.map(msg => {
            if (msg.isMe) {
              return (
                <div key={msg.id} className="space-y-1 flex flex-col items-end">
                  <span className="text-xs font-bold text-[#4a4455] px-2">You</span>
                  <div className="bg-[#7c3aed] text-white p-4 border-[3px] border-[#1b1b1e] rounded-tl-xl rounded-bl-xl rounded-br-xl neo-brutal-shadow max-w-[85%]"><p className="font-bold text-sm tracking-wide leading-relaxed">{msg.text}</p></div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="space-y-1 flex flex-col items-start">
                <span className="text-xs font-bold text-[#4a4455] px-2">{msg.sender}</span>
                <div className="bg-white p-4 border-[3px] border-[#1b1b1e] rounded-tr-xl rounded-bl-xl rounded-br-xl neo-brutal-shadow max-w-[85%]"><p className="font-bold text-[#1b1b1e] text-sm tracking-wide leading-relaxed">{msg.text}</p></div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 border-t-[3px] border-[#1b1b1e] bg-[#fbf8fc]">
          <div className="flex gap-2">
            <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} placeholder="메시지 입력..." className="flex-grow bg-white border-[3px] border-[#1b1b1e] p-3 rounded-lg font-bold outline-none" />
            <button onClick={handleSendChat} className="bg-[#fed01a] p-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow rounded-lg cursor-pointer"><Send className="w-5 h-5 text-black" /></button>
          </div>
        </div>
      </aside>
    </div>
  );
}