import {
  Check,
  Clipboard,
  Copy,
  Crown,
  DoorOpen,
  Loader2,
  MessageCircle,
  Play,
  RefreshCw,
  Send,
  Settings,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Room, RoomPlayer } from "../api";

type CopyState = "idle" | "copied" | "failed";

type RoomScreenProps = {
  copyState: CopyState;
  currentNickname: string;
  error: string;
  inviteUrl: string;
  onCopyInvite: () => void;
  onLeave: () => void;
  onRefresh: () => void;
  onToggleReady: (isReady: boolean) => Promise<void> | void;
  onStartGame: () => Promise<void> | void;
  pending: boolean;
  room: Room;
  onUpdateSettings?: (settings: Partial<Room>) => Promise<void> | void;
  onKickPlayer?: (playerId: number) => Promise<void> | void;
};

type LocalMessage = {
  id: number;
  author: string;
  body: string;
  own: boolean;
  avatar_url?: string;
};

const avatarColors = [
  "bg-tertiary-fixed",
  "bg-primary-fixed",
  "bg-secondary-fixed",
  "bg-error-container",
  "bg-surface-container-high",
];

export default function RoomScreen({
  copyState,
  currentNickname,
  error,
  inviteUrl,
  onCopyInvite,
  onLeave,
  onRefresh,
  onToggleReady,
  onStartGame,
  pending,
  room,
  onUpdateSettings,
  onKickPlayer,
}: RoomScreenProps) {
  const [chatDraft, setChatDraft] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [codeCopyState, setCodeCopyState] = useState<CopyState>("idle");
  const [messages, setMessages] = useState<LocalMessage[]>(() => [
    {
      id: 1,
      author: "DrawBuddy",
      body: "방이 준비되었습니다.",
      own: false,
    },
  ]);

  const host = useMemo(
    () => room.players.find((player) => player.is_host),
    [room.players],
  );

  const currentPlayer = useMemo(
    () => room.players.find((player) => player.nickname === currentNickname),
    [room.players, currentNickname]
  );

  const isHost = currentPlayer?.is_host ?? false;
  const isReady = currentPlayer?.is_ready ?? false;
  const allReady = room.players.filter((p) => !p.is_host).every((p) => p.is_ready);
  const canStart = room.players.length >= 2 && allReady;

  // App.tsx에서 넘겨받은 최신 onRefresh를 참조하기 위한 ref (의존성 무한 루프 방지)
  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  // 웹소켓 연결
  useEffect(() => {
    // 개발 환경에서는 백엔드 포트(8000)로 직접 연결하도록 주소를 구성합니다.
    const wsHost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
      ? `${window.location.hostname}:8000`
      : window.location.host;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${wsHost}/ws/rooms/${room.code}/`);

    socket.onopen = () => {
      // 내가 방에 들어왔음을 다른 사람들에게 알림 (참가자 목록 새로고침 유도)
      socket.send(JSON.stringify({ type: "room_update" }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "chat_message") {
        setMessages((current) => [
          ...current,
          {
            id: Date.now() + Math.random(),
            author: data.nickname,
            body: data.message,
            own: data.nickname === currentNickname,
            avatar_url: data.avatar_url,
          },
        ]);
      } else if (data.type === "room_updated") {
        refreshRef.current(); // 상태 변경 시 자동으로 방 정보 갱신
      }
    };

    setWs(socket);

    return () => socket.close();
  }, [room.code, currentNickname]);

  function submitLocalMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = chatDraft.trim();
    if (!body || !ws) {
      return;
    }

    // 서버로 채팅 메시지 전송
    ws.send(
      JSON.stringify({
        type: "chat_message",
        nickname: currentNickname || "익명",
        message: body,
        avatar_url: currentPlayer?.avatar_url,
      })
    );
    setChatDraft("");
  }

  return (
    <div className="min-h-screen bg-surface-container-low text-ink">
      <header className="sticky top-0 z-40 border-b-[3px] border-ink bg-surface shadow-neo-sm">
        <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="font-display text-3xl font-extrabold uppercase italic text-primary sm:text-4xl">
              DrawBuddy
            </div>
            <div className="hidden h-10 border-l-[3px] border-ink sm:block" />
            <div className="hidden font-display text-2xl font-bold sm:block">
              Game Room
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="neo-icon-button bg-secondary-container"
              onClick={onCopyInvite}
              title="초대 링크 복사"
              type="button"
            >
              <Copy size={20} />
            </button>
            <button
              className="neo-icon-button bg-surface"
              disabled={pending}
              onClick={onRefresh}
              title="방 정보 새로고침"
              type="button"
            >
              {pending ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <RefreshCw size={20} />
              )}
            </button>
            <button
              className="neo-icon-button bg-error-container text-on-error-container"
              onClick={onLeave}
              title="방 나가기"
              type="button"
            >
              <DoorOpen size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="grid gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)_360px] lg:px-8">
        <aside className="neo-panel flex flex-col bg-surface-container-highest">
          <div className="border-b-[3px] border-ink bg-secondary-fixed p-5">
            <h1 className="font-display text-3xl font-bold">Game Room</h1>
            <div className="mt-2 inline-flex border-[2px] border-ink bg-surface px-2 py-1 font-mono text-sm font-bold">
              #{room.code}
            </div>
          </div>

          <div className="flex items-center justify-between border-b-[3px] border-ink p-4">
            <div className="flex items-center gap-2 font-mono text-sm font-bold uppercase">
              <Users size={18} />
              Players
            </div>
            <span className="rounded-full border-[2px] border-ink bg-surface px-3 py-1 font-mono text-xs font-bold">
              {room.players.length}/{room.max_players}
            </span>
          </div>

          <div className="flex flex-col gap-3 p-4">
            {room.players.map((player, index) => (
              <PlayerRow
                currentNickname={currentNickname}
                index={index}
                key={player.id}
                player={player}
                isHostView={isHost}
                onKick={() => onKickPlayer && onKickPlayer(player.id)}
              />
            ))}
          </div>

          <div className="mt-auto border-t-[3px] border-ink p-4">
            <button
              className="neo-button w-full justify-center bg-surface text-ink"
              onClick={onCopyInvite}
              type="button"
            >
              <UserPlus size={20} />
              초대하기
            </button>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-5">
          <div className="neo-panel relative overflow-hidden bg-primary-container p-6 text-on-primary-container sm:p-8">
            <div className="absolute inset-0 opacity-20 dot-pattern" />
            <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-mono text-sm font-bold uppercase">
                  Room Code
                </div>
                <div className="mt-1 break-all font-display text-5xl font-extrabold sm:text-6xl">
                  {room.code}
                </div>
              </div>
              <button
                className="neo-button w-full justify-center bg-secondary-container text-on-secondary-container md:w-auto"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(room.code);
                setCodeCopyState("copied");
              } catch {
                setCodeCopyState("failed");
              }
              setTimeout(() => setCodeCopyState("idle"), 1500);
            }}
                type="button"
              >
                <Copy size={21} />
            {codeCopyState === "copied"
                  ? "복사됨"
              : codeCopyState === "failed"
                    ? "복사 실패"
                : "코드 복사"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="border-[3px] border-ink bg-error-container px-4 py-3 font-semibold text-on-error-container shadow-neo-sm">
              {error}
            </div>
          ) : null}

          <div className="neo-panel bg-surface p-5 sm:p-6">
            <div className="mb-6 flex items-center gap-3 border-b-[3px] border-ink pb-4">
              <Settings size={28} />
              <h2 className="font-display text-3xl font-bold">Game Settings</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
            <SettingBlock label="Write Time">
              <select
                className="h-14 w-full border-[3px] border-ink bg-surface px-3 font-display text-2xl font-bold shadow-neo-sm outline-none disabled:opacity-50"
                disabled={!isHost || pending}
                value={room.write_time || 60}
                onChange={async (e) => {
                  await onUpdateSettings?.({ write_time: Number(e.target.value) });
                  ws?.send(JSON.stringify({ type: "room_update" }));
                }}
              >
                <option value={40}>40 Seconds</option>
                <option value={60}>60 Seconds</option>
                <option value={80}>80 Seconds</option>
                <option value={100}>100 Seconds</option>
              </select>
              </SettingBlock>

              <SettingBlock label="Draw Time">
                <select
                  className="h-14 w-full border-[3px] border-ink bg-surface px-3 font-display text-2xl font-bold shadow-neo-sm outline-none disabled:opacity-50"
                  disabled={!isHost || pending}
                value={room.draw_time || 80}
                onChange={async (e) => {
                  await onUpdateSettings?.({ draw_time: Number(e.target.value) });
                  ws?.send(JSON.stringify({ type: "room_update" }));
                }}
                >
                  <option value={60}>60 Seconds</option>
                  <option value={80}>80 Seconds</option>
                  <option value={100}>100 Seconds</option>
                  <option value={120}>120 Seconds</option>
                </select>
              </SettingBlock>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {isHost ? (
              <button
                className="neo-button h-16 flex-1 justify-center bg-primary text-xl text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canStart || pending}
                onClick={async () => {
                  await onStartGame(); // 게임 시작 API 호출
                  ws?.send(JSON.stringify({ type: "room_update" })); // 웹소켓으로 새로고침 신호 전송
                }}
                type="button"
              >
                {room.players.length < 2 ? "인원 부족" : allReady ? "게임 시작" : "준비 대기 중"}
                <Play size={26} />
              </button>
            ) : (
              <button
                className={`neo-button h-16 flex-1 justify-center text-xl text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                  isReady ? "bg-error-container text-on-error-container" : "bg-primary"
                }`}
                disabled={pending}
                onClick={async () => {
                  await onToggleReady(!isReady); // 준비 상태 변경 API 호출
                  ws?.send(JSON.stringify({ type: "room_update" })); // 웹소켓으로 새로고침 신호 전송
                }}
                type="button"
              >
                {isReady ? "준비 취소" : "준비하기"}
                {isReady ? <X size={26} /> : <Check size={26} />}
              </button>
            )}
            <button
              className="neo-button h-16 justify-center bg-surface px-5 text-ink"
              onClick={onCopyInvite}
              type="button"
            >
              <Clipboard size={22} />
              초대 링크
            </button>
          </div>
        </section>

        <aside className="neo-panel flex min-h-[520px] flex-col bg-surface">
          <div className="flex items-center gap-3 border-b-[3px] border-ink bg-surface-container-high p-4">
            <MessageCircle className="text-primary" size={25} />
            <h2 className="font-display text-2xl font-bold">Lobby Chat</h2>
          </div>

          <div className="dot-pattern flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                className={`flex max-w-[86%] gap-2 ${
                  message.own ? "self-end flex-row-reverse" : "self-start"
                }`}
                key={message.id}
              >
                <div className="mt-1 shrink-0">
                  {message.avatar_url ? (
                    <img src={message.avatar_url} className="h-8 w-8 rounded-full border-[2px] border-ink object-cover" alt="avatar" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-ink bg-surface-variant text-on-surface-variant">
                      <Users size={14} />
                    </div>
                  )}
                </div>
                <div className={`flex flex-col ${message.own ? "items-end" : "items-start"}`}>
                  <div className="mb-1 px-1 font-mono text-xs font-bold text-on-surface-variant">
                    {message.author}
                  </div>
                  <div
                    className={`border-[3px] border-ink px-4 py-2 font-body text-sm font-medium leading-6 shadow-neo-sm ${
                      message.own
                        ? "rounded-lg rounded-tr-none bg-primary-container text-on-primary-container"
                        : "rounded-lg rounded-tl-none bg-secondary-fixed"
                    }`}
                  >
                    {message.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form
            className="border-t-[3px] border-ink bg-surface p-4"
            onSubmit={submitLocalMessage}
          >
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 border-[3px] border-ink bg-surface-container-lowest px-3 py-3 font-body outline-none focus:border-primary"
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="메시지 입력"
                value={chatDraft}
              />
              <button
                className="neo-icon-button bg-secondary-container"
                type="submit"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </aside>
      </main>
    </div>
  );
}

function PlayerRow({
  currentNickname,
  index,
  player,
  isHostView,
  onKick,
}: {
  currentNickname: string;
  index: number;
  player: RoomPlayer;
  isHostView: boolean;
  onKick: () => void;
}) {
  const isCurrentPlayer = currentNickname === player.nickname;
  const colorClass = avatarColors[index % avatarColors.length];
  const avatarUrl = player.avatar_url;

  return (
    <div className="relative flex items-center gap-3 border-[3px] border-ink bg-surface p-3 shadow-neo-sm">
      {avatarUrl ? (
        <img src={avatarUrl} alt="profile" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-ink object-cover" />
      ) : (
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-ink ${colorClass}`}>
          <Users size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-display text-xl font-bold">
            {player.nickname}
          </div>
          {player.is_host ? (
            <Crown className="shrink-0 text-primary" size={19} />
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {player.is_host ? (
          <span className="border-[2px] border-ink bg-primary px-2 py-1 font-mono text-[10px] font-bold uppercase text-white">
            Host
          </span>
        ) : null}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-[11px] font-bold text-on-surface-variant">
            {isCurrentPlayer && !player.is_ready ? "You" : player.is_ready ? "Ready" : "Waiting"}
          </span>
          <div 
            className={`h-3 w-3 rounded-full border-[2px] border-ink shadow-neo-sm ${
              player.is_ready ? "bg-[#6dfe9c]" : "bg-[#1b1b1e] opacity-30"
            }`} 
          />
        </div>
        {isHostView && !player.is_host && (
          <button onClick={onKick} className="mt-1 font-mono text-[11px] font-bold text-error hover:underline">
            내보내기
          </button>
        )}
      </div>
    </div>
  );
}

function SettingBlock({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className={label === "Word Pack" ? "md:col-span-2" : ""}>
      <label className="mb-2 block font-mono text-sm font-bold uppercase text-on-surface-variant">
        {label}
      </label>
      {children}
    </div>
  );
}
