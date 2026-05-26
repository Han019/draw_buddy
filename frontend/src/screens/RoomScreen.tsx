import {
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
} from "lucide-react";
import { FormEvent, ReactNode, useMemo, useState } from "react";
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
  pending: boolean;
  room: Room;
};

type LocalMessage = {
  id: number;
  author: string;
  body: string;
  own: boolean;
};

const STATUS_LABEL: Record<Room["status"], string> = {
  waiting: "대기 중",
  playing: "진행 중",
  finished: "종료됨",
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
  pending,
  room,
}: RoomScreenProps) {
  const [chatDraft, setChatDraft] = useState("");
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

  function submitLocalMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = chatDraft.trim();
    if (!body) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        author: currentNickname || "나",
        body,
        own: true,
      },
    ]);
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
                onClick={onCopyInvite}
                type="button"
              >
                <Copy size={21} />
                {copyState === "copied"
                  ? "복사됨"
                  : copyState === "failed"
                    ? "복사 실패"
                    : "링크 복사"}
              </button>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <MetricCard label="상태" value={STATUS_LABEL[room.status]} />
            <MetricCard
              label="방장"
              value={host ? host.nickname : "없음"}
            />
            <MetricCard
              label="생성 시각"
              value={new Date(room.created_at).toLocaleTimeString()}
            />
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
              <SettingBlock label="Rounds">
                <div className="inline-flex items-center border-[3px] border-ink bg-surface-container shadow-neo-sm">
                  <button className="setting-stepper" disabled type="button">
                    -
                  </button>
                  <div className="w-16 text-center font-display text-2xl font-bold">
                    3
                  </div>
                  <button className="setting-stepper" disabled type="button">
                    +
                  </button>
                </div>
              </SettingBlock>

              <SettingBlock label="Draw Time">
                <select
                  className="h-14 w-full border-[3px] border-ink bg-surface px-3 font-display text-2xl font-bold shadow-neo-sm outline-none"
                  disabled
                  value="80 Seconds"
                >
                  <option>80 Seconds</option>
                </select>
              </SettingBlock>

              <SettingBlock label="Word Pack">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {["General", "Daily", "Movies"].map((wordPack, index) => (
                    <div
                      className={`border-[3px] border-ink p-3 text-center font-display text-xl font-bold shadow-neo-sm ${
                        index === 0 ? "bg-tertiary-fixed" : "bg-surface"
                      }`}
                      key={wordPack}
                    >
                      {wordPack}
                    </div>
                  ))}
                </div>
              </SettingBlock>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="neo-button h-16 flex-1 justify-center bg-primary text-xl text-white"
              disabled
              type="button"
            >
              게임 시작
              <Play size={26} />
            </button>
            <a
              className="neo-button h-16 justify-center bg-surface px-5 text-ink"
              href={inviteUrl}
            >
              <Clipboard size={22} />
              초대 링크
            </a>
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
                className={`max-w-[86%] ${
                  message.own ? "self-end text-right" : "self-start"
                }`}
                key={message.id}
              >
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
}: {
  currentNickname: string;
  index: number;
  player: RoomPlayer;
}) {
  const isCurrentPlayer = currentNickname === player.nickname;
  const colorClass = avatarColors[index % avatarColors.length];

  return (
    <div className="relative flex items-center gap-3 border-[3px] border-ink bg-surface p-3 shadow-neo-sm">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-ink ${colorClass}`}
      >
        <Users size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-display text-xl font-bold">
            {player.nickname}
          </div>
          {player.is_host ? (
            <Crown className="shrink-0 text-primary" size={19} />
          ) : null}
        </div>
        <div className="font-mono text-xs font-bold text-on-surface-variant">
          Score: {player.score}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {player.is_host ? (
          <span className="border-[2px] border-ink bg-primary px-2 py-1 font-mono text-[10px] font-bold uppercase text-white">
            Host
          </span>
        ) : null}
        <span className="font-mono text-[11px] font-bold text-on-surface-variant">
          {player.is_ready ? "Ready" : isCurrentPlayer ? "You" : "Waiting"}
        </span>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="neo-panel bg-surface p-4">
      <div className="font-mono text-xs font-bold uppercase text-on-surface-variant">
        {label}
      </div>
      <div className="mt-2 truncate font-display text-2xl font-bold">{value}</div>
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
