import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, Play, Home, MessageSquare, Send, X, Loader2, Users } from 'lucide-react';
import { getGameResults, getReplay, Room, getAuthMe, returnToWaitingRoom } from '../api';

interface ResultScreenProps {
  room: Room;
  gameId: number;
  onExit: () => void;
  onReturnToRoom?: () => void;
}

const COLORS = ['#ffe083', '#6dfe9c', '#ffb4ab', '#7c3aed', '#ba1a1a', '#fed01a'];

function DrawingResultCard({ turn, avatarUrl }: { turn: any; avatarUrl?: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [strokes, setStrokes] = useState<any[]>([]);

  const playReplay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    let replayStrokes = strokes;
    
    // 리플레이 좌표가 없으면 API에서 가져오기
    if (strokes.length === 0) {
      try {
        const data = await getReplay(turn.replay_id);
        replayStrokes = data.events || [];
        setStrokes(replayStrokes);
      } catch (e) {
        console.error("리플레이를 불러오지 못했습니다.", e);
        setIsPlaying(false);
        return;
      }
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    let i = 0;
    const drawNext = () => {
      if (i >= replayStrokes.length) {
        setIsPlaying(false);
        return;
      }
      // 스피드를 올리기 위해 한 프레임에 3개의 선을 그립니다.
      for (let k = 0; k < 3 && i < replayStrokes.length; k++, i++) {
        const pt = replayStrokes[i];
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
      }
      requestAnimationFrame(drawNext);
    };
    drawNext();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && canvas.parentElement) {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, []);

  return (
    <div className="relative pl-16 group">
      <div className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#00773b] border-[3px] border-[#1b1b1e] rounded-full z-10"></div>
      <div className="bg-white border-[3px] border-[#1b1b1e] neo-brutal-shadow-lg rounded-xl overflow-hidden">
        <div className="p-4 md:p-6 border-b-[3px] border-[#1b1b1e] flex flex-wrap gap-4 justify-between items-center bg-[#f0edf1]">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-10 h-10 border-[3px] border-[#1b1b1e] rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 border-[3px] border-[#1b1b1e] bg-[#6dfe9c] rounded-full flex items-center justify-center font-bold text-xl uppercase">
                {turn.author.nickname[0]}
              </div>
            )}
            <div>
              <p className="font-bold text-[#1b1b1e]">{turn.author.nickname}</p>
              <p className="text-xs uppercase font-black text-[#00773b] tracking-wider font-mono">Drawing</p>
            </div>
          </div>
          <button onClick={playReplay} disabled={isPlaying} className={`flex items-center gap-2 border-[3px] border-[#1b1b1e] px-4 py-2 font-bold neo-brutal-shadow rounded-lg transition-all ${isPlaying ? 'bg-[#e4e1e5] text-[#4a4455] cursor-not-allowed' : 'bg-[#fed01a] cursor-pointer btn-press'}`}>
            <Play className="w-4 h-4 fill-current" /> {isPlaying ? '재생 중...' : '재생'}
          </button>
        </div>
        <div className="aspect-[4/3] max-h-96 md:max-h-none bg-[#eae7eb] p-4 flex items-center justify-center text-[#4a4455] font-bold border-t-[3px] border-[#1b1b1e]">
          <canvas ref={canvasRef} className="w-full h-full border-[2px] border-[#1b1b1e] bg-white rounded-lg touch-none" />
        </div>
      </div>
    </div>
  );
}

export default function ResultScreen({ room, gameId, onExit, onReturnToRoom }: ResultScreenProps) {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string; isMe: boolean; avatar_url?: string | null }[]>([
    { id: '1', sender: 'System', text: '결과 공개 화면에 입장했습니다.', isMe: false, avatar_url: undefined }
  ]);
  const [inputText, setInputText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const myNicknameRef = useRef("나");
  
  const onReturnToRoomRef = useRef(onReturnToRoom);
  useEffect(() => {
    onReturnToRoomRef.current = onReturnToRoom;
  }, [onReturnToRoom]);

  // 결과 데이터 및 본인 닉네임 불러오기
  useEffect(() => {
    getAuthMe().then(data => {
      if (data.user) myNicknameRef.current = data.user.global_name || data.user.username;
    }).catch(() => {});

    getGameResults(gameId)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gameId]);

  const getAvatarUrl = (nickname: string) => room.players.find(p => p.nickname === nickname)?.avatar_url;

  // 채팅 웹소켓 연결 (로비와 동일한 채널 사용)
  useEffect(() => {
    const wsHost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
      ? `${window.location.hostname}:8000`
      : window.location.host;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${wsHost}/ws/rooms/${room.code}/`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "chat_message") {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString() + Math.random(),
          sender: data.nickname,
          text: data.message,
          isMe: data.nickname === myNicknameRef.current,
          avatar_url: data.avatar_url
        }]);
      } else if (data.type === "result_sync") {
        setCurrentChainIndex(data.currentChainIndex);
        setCurrentStep(data.currentStep);
      } else if (data.type === "room_updated") {
        if (onReturnToRoomRef.current) {
          onReturnToRoomRef.current();
        } else {
          window.location.reload();
        }
      }
    };
    setWs(socket);
    return () => socket.close();
  }, [room.code]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showMobileChat]);

  const handleSendChat = () => {
    if (!inputText.trim() || !ws) return;
    ws.send(JSON.stringify({
      type: "chat_message",
      nickname: myNicknameRef.current,
      message: inputText.trim(),
      avatar_url: getAvatarUrl(myNicknameRef.current)
    }));
    setInputText('');
  };

  if (loading || !results) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-container-low text-ink">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const chains = results.chains || [];
  const currentChain = chains[currentChainIndex];
  const maxSteps = currentChain?.turns.length || 0;
  const isHost = room.players.find(p => p.nickname === myNicknameRef.current)?.is_host ?? false;

  const handleReturnToLobby = async () => {
    if (isHost) {
      try {
        await returnToWaitingRoom(room.code);
        ws?.send(JSON.stringify({ type: "room_update" }));
      } catch (e) {
        console.error("대기실 복귀 실패", e);
      }
    }
  };

  const handleNext = () => {
    let nextStep = currentStep;
    let nextChainIndex = currentChainIndex;

    if (currentStep < maxSteps) {
      nextStep++;
    } else {
      nextChainIndex++;
      nextStep = 1;
    }

    setCurrentChainIndex(nextChainIndex);
    setCurrentStep(nextStep);

    ws?.send(JSON.stringify({ type: "result_sync", currentChainIndex: nextChainIndex, currentStep: nextStep }));
  };

  return (
    <div className="h-screen bg-[#fbf8fc] flex font-sans text-[#1b1b1e] w-full overflow-hidden">
      {/* Main Center Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <main className="flex-1 overflow-y-auto px-4 md:px-12 w-full pt-8 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="my-8 flex flex-col gap-6 pb-6 border-b-2 border-dashed border-[#1b1b1e]">
              <div className="flex items-center gap-4 overflow-x-auto p-4 -m-4 custom-scrollbar">
                {chains.map((chain: any, idx: number) => {
                  const starter = chain.turns[0]?.author?.nickname || "Unknown";
                  const color = COLORS[idx % COLORS.length];
                  const isCurrent = currentChainIndex === idx;
                  const avatarUrl = getAvatarUrl(starter);
                  return (
                    <button 
                      key={chain.chain_id}
                      disabled={!isHost}
                      onClick={() => { 
                        if (isHost) {
                          setCurrentChainIndex(idx); setCurrentStep(1); 
                          ws?.send(JSON.stringify({ type: "result_sync", currentChainIndex: idx, currentStep: 1 }));
                        }
                      }}
                      className={`flex-shrink-0 flex items-center justify-center p-1 rounded-full transition-all ${isCurrent ? 'ring-4 ring-[#630ed4] ring-offset-2' : 'opacity-70'} ${isHost ? 'hover:scale-110 hover:opacity-100 cursor-pointer' : 'cursor-default'}`}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] border-[#1b1b1e] object-cover" />
                      ) : (
                        <div style={{ backgroundColor: color }} className="w-12 h-12 md:w-16 md:h-16 rounded-full border-[3px] border-[#1b1b1e] flex items-center justify-center font-bold text-xl uppercase">
                          {starter[0]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#1b1b1e] font-sans">
                  {chains[currentChainIndex]?.turns[0]?.author?.nickname}님의 체인
                </h1>
              </div>
            </div>

            {/* Timeline steps */}
            <div className="space-y-12 relative before:content-[''] before:absolute before:left-8 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#1b1b1e]">
              
              {chains[currentChainIndex]?.turns.slice(0, currentStep).map((turn: any, idx: number) => {
                if (turn.kind === 'prompt' || turn.kind === 'guess') {
                  const bgColor = turn.kind === 'prompt' ? '#ffe083' : '#ffb4ab';
                  const label = turn.kind === 'prompt' ? 'Initial Sentence' : 'The Guess';
                  const dotColor = turn.kind === 'prompt' ? '#7c3aed' : '#ba1a1a';
                const avatarUrl = getAvatarUrl(turn.author.nickname);
                  return (
                    <div key={turn.turn_number} className="relative pl-16 group">
                      <div className="absolute left-6 top-8 w-4 h-4 border-[3px] border-[#1b1b1e] rounded-full z-10" style={{ backgroundColor: dotColor }}></div>
                      <div className="bg-white border-[3px] border-[#1b1b1e] neo-brutal-shadow p-6 rounded-xl relative">
                        <div className="flex items-center gap-3 mb-4">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="avatar" className="w-10 h-10 border-[3px] border-[#1b1b1e] rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 border-[3px] border-[#1b1b1e] rounded-full flex items-center justify-center font-bold text-xl uppercase" style={{ backgroundColor: bgColor }}>
                            {turn.author.nickname[0]}
                          </div>
                        )}
                          <div>
                            <p className="font-bold text-[#1b1b1e]">{turn.author.nickname}</p>
                            <p className="text-xs uppercase font-black tracking-wider font-mono" style={{ color: dotColor }}>{label}</p>
                          </div>
                        </div>
                        <p className="text-2xl md:text-3xl font-extrabold text-[#1b1b1e]">"{turn.text}"</p>
                      </div>
                    </div>
                  );
                } else if (turn.kind === 'drawing') {
                return <DrawingResultCard key={turn.turn_number} turn={turn} avatarUrl={getAvatarUrl(turn.author.nickname)} />;
                }
                return null;
              })}
            </div>
          </div>
        </main>

        {/* Sticky Bottom Actions */}
        <footer className="shrink-0 bg-white border-t-[3px] border-[#1b1b1e] px-4 py-6 flex flex-wrap justify-center items-center gap-4">
          <div className="flex gap-4 w-full max-w-4xl justify-center font-sans">
            {isHost && (currentStep < maxSteps || currentChainIndex < chains.length - 1) && (
              <button onClick={handleNext} className="flex-grow max-w-[300px] bg-[#6dfe9c] py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer btn-press">
                <span>다음 체인 넘기기</span><ArrowRight className="w-6 h-6 stroke-[3]" />
              </button>
            )}
            {(!isHost || (currentStep >= maxSteps && currentChainIndex >= chains.length - 1)) && (
              <div className="flex gap-4 w-full max-w-2xl justify-center">
                {(currentStep >= maxSteps && currentChainIndex >= chains.length - 1) ? (
                  <>
                    {isHost ? (
                      <button onClick={handleReturnToLobby} className="flex-grow bg-[#7c3aed] text-white py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer btn-press">
                        대기실로 돌아가기
                      </button>
                    ) : (
                      <div className="flex-grow max-w-[300px] bg-[#e4e1e5] text-[#4a4455] py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl text-center">
                        방장 대기 중...
                      </div>
                    )}
                    <button onClick={onExit} className="flex-grow bg-[#ba1a1a] text-white py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer btn-press">
                      <Home className="w-6 h-6 stroke-[3]" />홈 (나가기)
                    </button>
                  </>
                ) : (
                  <div className="flex-grow max-w-[300px] bg-[#e4e1e5] text-[#4a4455] py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl text-center">
                    방장이 진행 중입니다...
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setShowMobileChat(true)} className="lg:hidden flex-grow max-w-[300px] bg-[#fed01a] py-3 border-[3px] border-[#1b1b1e] neo-brutal-shadow font-black text-xl flex items-center justify-center gap-2 rounded-xl cursor-pointer btn-press"><MessageSquare className="w-6 h-6 stroke-[3]" />채팅</button>
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
                  <span className="text-xs font-bold text-[#4a4455] px-2">{msg.sender} (나)</span>
                <div className="flex items-end gap-2">
                  <div className="bg-[#7c3aed] text-white p-4 border-[3px] border-[#1b1b1e] rounded-tl-xl rounded-bl-xl rounded-br-xl neo-brutal-shadow max-w-full">
                    <p className="font-bold text-sm tracking-wide leading-relaxed break-all">{msg.text}</p>
                  </div>
                  {msg.avatar_url ? (
                    <img src={msg.avatar_url} alt="avatar" className="w-8 h-8 rounded-full border-[2px] border-[#1b1b1e] object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-[2px] border-[#1b1b1e] bg-surface-variant flex items-center justify-center shrink-0"><Users size={14}/></div>
                  )}
                </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="space-y-1 flex flex-col items-start">
                <span className="text-xs font-bold text-[#4a4455] px-2">{msg.sender}</span>
              <div className="flex items-end gap-2">
                {msg.avatar_url ? (
                  <img src={msg.avatar_url} alt="avatar" className="w-8 h-8 rounded-full border-[2px] border-[#1b1b1e] object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full border-[2px] border-[#1b1b1e] bg-surface-variant flex items-center justify-center shrink-0"><Users size={14}/></div>
                )}
                <div className="bg-white p-4 border-[3px] border-[#1b1b1e] rounded-tr-xl rounded-bl-xl rounded-br-xl neo-brutal-shadow max-w-full">
                  <p className="font-bold text-[#1b1b1e] text-sm tracking-wide leading-relaxed break-all">{msg.text}</p>
                </div>
              </div>
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