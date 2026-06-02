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
  LogOut,
} from "lucide-react";
import { Dispatch, FormEvent, SetStateAction } from "react";
import type { DiscordUser } from "../App";

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
  authUser: DiscordUser | null;
  isAuthLoading: boolean;
  onLogout: () => void;
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
  authUser,
  isAuthLoading,
  onLogout,
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
                  className={`text-input ${authUser ? "cursor-not-allowed opacity-60 bg-surface-container" : ""}`}
                  maxLength={20}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="예: 민수"
                  required
                  value={nickname}
                  readOnly={!!authUser}
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

            {/* 하단으로 이동된 Discord 인증 섹션 */}
            <div className="mt-5 border-t-[3px] border-ink border-dashed pt-5">
              {isAuthLoading ? (
                <div className="flex h-14 items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : authUser ? (
                <div className="flex items-center justify-between rounded-xl border-[3px] border-ink bg-surface-container-low p-3">
                  <div className="flex items-center gap-3">
                    {authUser.avatar_url ? (
                      <img src={authUser.avatar_url} alt="profile" className="h-10 w-10 rounded-full border-[2px] border-ink object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-[2px] border-ink bg-primary text-white">
                        <UserRound size={20} />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold text-ink">{authUser.global_name || authUser.username}</span>
                      <span className="text-xs font-semibold text-primary">디스코드로 연동됨</span>
                    </div>
                  </div>
                  <button type="button" onClick={onLogout} className="neo-button h-auto bg-error-container px-3 py-2 text-sm text-on-error-container">
                    <LogOut size={16} />
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="neo-button h-14 w-full justify-center bg-[#5865F2] text-lg text-white hover:bg-[#4752C4]"
                  onClick={() => { window.location.href = "/api/auth/discord/login/"; }}
                >
                  <svg fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                  </svg>
                  Discord로 로그인
                </button>
              )}
            </div>
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
