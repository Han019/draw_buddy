import {
  Brush,
  Hash,
  Loader2,
  LogIn,
  Plus,
  Share2,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { Dispatch, FormEvent, SetStateAction } from "react";

export type EntryMode = "create" | "join";

type LobbyScreenProps = {
  error: string;
  maxPlayers: number;
  mode: EntryMode;
  nickname: string;
  onCreateRoom: (event: FormEvent<HTMLFormElement>) => void;
  onJoinRoom: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  roomCode: string;
  setMaxPlayers: Dispatch<SetStateAction<number>>;
  setMode: Dispatch<SetStateAction<EntryMode>>;
  setNickname: Dispatch<SetStateAction<string>>;
  setRoomCode: Dispatch<SetStateAction<string>>;
};

const steps = [
  {
    icon: Share2,
    title: "초대 코드 공유",
    description: "방을 만들고 생성된 코드를 친구에게 전달합니다.",
    colorClass: "bg-secondary-container",
  },
  {
    icon: Users,
    title: "친구 입장",
    description: "친구들이 코드를 입력하고 같은 대기실로 들어옵니다.",
    colorClass: "bg-tertiary-fixed",
  },
  {
    icon: Brush,
    title: "드로잉 시작",
    description: "제시어를 그리고 맞추며 라운드를 진행합니다.",
    colorClass: "bg-error-container",
  },
];

export default function LobbyScreen({
  error,
  maxPlayers,
  mode,
  nickname,
  onCreateRoom,
  onJoinRoom,
  pending,
  roomCode,
  setMaxPlayers,
  setMode,
  setNickname,
  setRoomCode,
}: LobbyScreenProps) {
  const isCreateMode = mode === "create";

  return (
    <div className="min-h-screen bg-surface-lowest text-ink">
      <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-surface shadow-neo-sm">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="font-display text-3xl font-extrabold uppercase italic text-primary sm:text-4xl">
            DrawBuddy
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <button
              className="neo-button bg-secondary-container text-on-secondary-container"
              onClick={() => setMode("join")}
              type="button"
            >
              <LogIn size={19} />
              참가
            </button>
            <button
              className="neo-button bg-primary text-white"
              onClick={() => setMode("create")}
              type="button"
            >
              <Plus size={19} />
              생성
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div className="flex flex-col gap-6">
            <div className="neo-pill w-fit bg-secondary-container">
              <Sparkles size={20} />
              멀티플레이어 드로잉 게임
            </div>

            <h1 className="max-w-3xl font-display text-5xl font-extrabold leading-[1.08] text-ink sm:text-6xl lg:text-7xl">
              낙서로 하나되는 시간,
              <span className="mt-3 block w-fit rotate-[-2deg] border-[3px] border-ink bg-surface px-3 py-1 text-primary shadow-neo">
                DrawBuddy
              </span>
            </h1>

            <p className="max-w-2xl border-[3px] border-ink bg-surface p-4 font-body text-lg font-medium leading-8 text-on-surface-variant shadow-neo">
              닉네임만 입력하면 방을 만들거나 코드로 참가할 수 있습니다.
              친구들과 실시간으로 그림을 그리고 정답을 맞혀보세요.
            </p>
          </div>

          <form
            className="neo-panel bg-surface p-5 sm:p-6"
            onSubmit={isCreateMode ? onCreateRoom : onJoinRoom}
          >
            <div className="grid grid-cols-2 gap-2 rounded-lg border-[3px] border-ink bg-surface-container p-1">
              <button
                className={`segmented-button ${
                  isCreateMode ? "segmented-button-active" : ""
                }`}
                onClick={() => setMode("create")}
                type="button"
              >
                <Plus size={18} />
                방 생성
              </button>
              <button
                className={`segmented-button ${
                  !isCreateMode ? "segmented-button-active" : ""
                }`}
                onClick={() => setMode("join")}
                type="button"
              >
                <LogIn size={18} />
                방 참가
              </button>
            </div>

            <label className="mt-5 block">
              <span className="form-label">닉네임</span>
              <div className="input-shell">
                <UserRound size={20} />
                <input
                  className="text-input"
                  maxLength={20}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="예: 민수"
                  required
                  value={nickname}
                />
              </div>
            </label>

            {isCreateMode ? (
              <label className="mt-4 block">
                <span className="form-label">최대 인원</span>
                <input
                  className="number-input"
                  max={10}
                  min={2}
                  onChange={(event) => setMaxPlayers(Number(event.target.value))}
                  type="number"
                  value={maxPlayers}
                />
              </label>
            ) : (
              <label className="mt-4 block">
                <span className="form-label">방 코드</span>
                <div className="input-shell">
                  <Hash size={20} />
                  <input
                    className="text-input font-mono uppercase"
                    maxLength={12}
                    onChange={(event) => setRoomCode(event.target.value)}
                    placeholder="A1B2C3"
                    required
                    value={roomCode}
                  />
                </div>
              </label>
            )}

            {error ? (
              <div className="mt-4 border-[3px] border-ink bg-error-container px-3 py-2 text-sm font-semibold text-on-error-container">
                {error}
              </div>
            ) : null}

            <button
              className="neo-button mt-5 h-14 w-full justify-center bg-primary text-lg text-white"
              disabled={pending}
              type="submit"
            >
              {pending ? (
                <Loader2 className="animate-spin" size={22} />
              ) : isCreateMode ? (
                <Plus size={22} />
              ) : (
                <LogIn size={22} />
              )}
              {isCreateMode ? "방 만들기" : "참가하기"}
            </button>
          </form>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <article
                className="neo-panel relative bg-surface-container-low p-5 text-center transition-transform hover:-translate-y-1"
                key={step.title}
              >
                <div className="absolute -left-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-ink bg-primary text-lg font-extrabold text-white">
                  {index + 1}
                </div>
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-ink ${step.colorClass} shadow-neo-sm`}
                >
                  <Icon size={34} />
                </div>
                <h2 className="mt-4 font-display text-2xl font-bold">
                  {step.title}
                </h2>
                <p className="mt-2 font-body text-base leading-7 text-on-surface-variant">
                  {step.description}
                </p>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
