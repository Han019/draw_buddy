import { useEffect, useState } from "react";
import { GameState, getGameState, getReplay, Room, submitDrawing, submitGuess, submitPrompt, unsubmitDrawing, unsubmitGuess, unsubmitPrompt } from "../api";
import { Loader2 } from "lucide-react";
import GuessScreen from "./GuessScreen";

import PromptScreen from "./PromptScreen";
import DrawingScreen from "./DrawingScreen";
import ResultScreen from "./ResultScreen";

type GameScreenProps = {
  room: Room;
  gameId: number;
  onLeave: () => void;
  onReturnToRoom?: () => void;
};

export default function GameScreen({ room, gameId, onLeave, onReturnToRoom }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pending, setPending] = useState(true);
  const [replayStrokes, setReplayStrokes] = useState<any[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // 백엔드에서 현재 내 턴 상태를 가져옵니다.
  const fetchGameState = async () => {
    try {
      const state = await getGameState(gameId);
      setGameState(state);

      // 내 턴이 "guess(맞추기)"이고 이전 그림 데이터가 존재한다면 리플레이 좌표를 가져옵니다.
      if (state.turn?.kind === "guess" && state.turn.source_replay_id) {
        const replayData = await getReplay(state.turn.source_replay_id);
        setReplayStrokes(replayData.events || []);
      }
    } catch (error) {
      console.error("게임 상태를 불러오지 못했습니다.", error);
    } finally {
      setPending(false);
    }
  };

  // 컴포넌트 마운트 시 최초 호출 & 웹소켓 실시간 동기화
  useEffect(() => {
    fetchGameState();
    const timer = setInterval(fetchGameState, 3000); // 혹시 모를 누락 방지용 백업 폴링

    // 로비에서 쓰던 방 웹소켓을 그대로 연결해서 턴 전환 신호를 주고받습니다.
    const wsHost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
      ? `${window.location.hostname}:8000`
      : window.location.host;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${wsHost}/ws/rooms/${room.code}/`);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "room_updated") {
        fetchGameState(); // 누군가 제출 완료하면 즉시 상태 동기화
      }
    };
    setWs(socket);

    return () => {
      clearInterval(timer);
      socket.close();
    };
  }, [gameId, room.code]);

  if (pending && !gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface-container-low text-ink">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!gameState) {
    return <div>게임 상태를 불러올 수 없습니다.</div>;
  }

  // API 제출 핸들러들
  const handlePromptSubmit = async (text: string) => {
    if (!gameState?.turn) return;
    setPending(true);
    try {
      await submitPrompt(gameId, gameState.turn.id, text);
      ws?.send(JSON.stringify({ type: "room_update" })); // 다른 사람들에게 내 제출 알림
      await fetchGameState(); // 제출 후 다음 상태(Waiting)를 불러옴
    } catch (e) {
      console.error(e);
      setPending(false);
    }
  };

  const handlePromptUnsubmit = async () => {
    if (!gameState?.turn) return;
    setPending(true);
    try {
      await unsubmitPrompt(gameId, gameState.turn.id);
      ws?.send(JSON.stringify({ type: "room_update" }));
      await fetchGameState();
    } catch (e) { console.error(e); setPending(false); }
  };

  const handleDrawingSubmit = async (payload: { canvas_width: number; canvas_height: number; events: any[] }) => {
    if (!gameState?.turn) return;
    setPending(true);
    try {
      await submitDrawing(gameId, gameState.turn.id, payload);
      ws?.send(JSON.stringify({ type: "room_update" })); // 다른 사람들에게 내 제출 알림
      await fetchGameState();
    } catch (e) {
      console.error(e);
      setPending(false);
    }
  };

  const handleDrawingUnsubmit = async () => {
    if (!gameState?.turn) return;
    setPending(true);
    try {
      await unsubmitDrawing(gameId, gameState.turn.id);
      ws?.send(JSON.stringify({ type: "room_update" }));
      await fetchGameState();
    } catch (e) { console.error(e); setPending(false); }
  };

  const handleGuessSubmit = async (text: string) => {
    if (!gameState?.turn) return;
    setPending(true);
    try {
      await submitGuess(gameId, gameState.turn.id, text);
      ws?.send(JSON.stringify({ type: "room_update" })); // 다른 사람들에게 내 제출 알림
      await fetchGameState();
    } catch (e) {
      console.error(e);
      setPending(false);
    }
  };

  const handleGuessUnsubmit = async () => {
    if (!gameState?.turn) return;
    setPending(true);
    try {
      await unsubmitGuess(gameId, gameState.turn.id);
      ws?.send(JSON.stringify({ type: "room_update" }));
      await fetchGameState();
    } catch (e) { console.error(e); setPending(false); }
  };

  // 1. 게임이 종료되었거나 결과 공개 중일 때
  if (gameState.game_status === "finished" || gameState.game_status === "revealing") {
    return <ResultScreen room={room} gameId={gameId} onExit={onLeave} onReturnToRoom={onReturnToRoom} />;
  }

  // 2. 제출을 완료하고 다른 사람을 기다릴 때 (turn이 null임)
  if (!gameState.turn) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-surface-container-low">
        <Loader2 className="mb-4 animate-spin text-primary" size={48} />
        <h2 className="font-display text-2xl font-bold">다른 플레이어들을 기다리는 중...</h2>
      </div>
    );
  }

  // 3. 내 턴에 맞는 화면 렌더링
  const turn = gameState.turn;

  if (turn.kind === "prompt") {
    return (
      <PromptScreen 
        key={turn.id} 
        defaultText={turn.text || ""} 
        timeLimit={turn.time_limit} 
        onNext={handlePromptSubmit} 
        onCancel={handlePromptUnsubmit} 
        isSubmitted={turn.is_submitted}
        currentTurn={gameState.current_turn_number + 1}
        totalPlayers={room.players.length}
      />
    );
  }

  if (turn.kind === "drawing") {
    return (
      <DrawingScreen 
        key={turn.id}
        prompt={turn.source_text || "그릴 문장이 없습니다"} 
        drawTime={turn.time_limit} 
        onFinished={(strokes) => handleDrawingSubmit({ canvas_width: 800, canvas_height: 600, events: strokes })} 
        onCancel={handleDrawingUnsubmit}
        isSubmitted={turn.is_submitted}
        totalPlayers={room.players.length}
      />
    );
  }

  if (turn.kind === "guess") {
    return <GuessScreen key={turn.id} onNext={handleGuessSubmit} userStrokes={replayStrokes} timeLimit={turn.time_limit} onCancel={handleGuessUnsubmit} isSubmitted={turn.is_submitted} />;
  }

  return <div>알 수 없는 턴입니다.</div>;
}