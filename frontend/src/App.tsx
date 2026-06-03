import { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoom, getRoom, joinRoom, Room, getAuthMe, logout, updateReady, startGame, updateRoomSettings } from "./api";
import LobbyScreen, { EntryMode } from "./screens/LobbyScreen";
import RoomScreen from "./screens/RoomScreen";
import GameScreen from "./screens/GameScreen";

export type DiscordUser = {
  id: number;
  provider: string;
  discord_id: string;
  username: string;
  global_name: string;
  avatar_url: string;
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function getRoomCodeFromPath() {
  const match = window.location.pathname.match(/^\/rooms\/([^/]+)\/?$/);
  return match ? normalizeCode(decodeURIComponent(match[1])) : "";
}

export default function App() {
  const initialRoomCode = getRoomCodeFromPath();
  const [mode, setMode] = useState<EntryMode>(
    initialRoomCode ? "join" : "create",
  );
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [room, setRoom] = useState<Room | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const [authUser, setAuthUser] = useState<DiscordUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    async function fetchAuth() {
      try {
        // 앱이 켜질 때 CSRF 토큰을 쿠키에 설정받습니다.
        await fetch("/api/csrf/");
        const data = await getAuthMe();
        if (data.user) {
          setAuthUser(data.user);
          setNickname((prev) => prev || data.user.global_name || data.user.username);
        }
      } catch (caught) {
        console.error("인증 정보를 불러오지 못했습니다.", caught);
      } finally {
        setIsAuthLoading(false);
      }
    }
    fetchAuth();
  }, []);

  async function handleLogout() {
    try {
      await logout();
      setAuthUser(null);
      setNickname("");
    } catch (caught) {
      console.error("로그아웃 실패", caught);
    }
  }

  const inviteUrl = useMemo(() => {
    if (!room) {
      return "";
    }

    return `${window.location.origin}/rooms/${room.code}`;
  }, [room]);

  function enterRoom(nextRoom: Room) {
    setRoom(nextRoom);
    setRoomCode(nextRoom.code);
    setError("");
    window.history.pushState({}, "", `/rooms/${nextRoom.code}`);
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const nextRoom = await createRoom({
        nickname: nickname.trim(),
        max_players: maxPlayers,
      });
      enterRoom(nextRoom);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방 생성에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const nextRoom = await joinRoom(normalizeCode(roomCode), {
        nickname: nickname.trim(),
      });
      enterRoom(nextRoom);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방 참가에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function refreshRoom() {
    if (!room) {
      return;
    }

    setPending(true);
    setError("");

    try {
      setRoom(await getRoom(room.code));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "방 정보를 다시 불러오지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  function leaveLocalRoom() {
    setRoom(null);
    setRoomCode("");
    setError("");
    setCopyState("idle");
    window.history.pushState({}, "", "/");
  }

  async function handleToggleReady(isReady: boolean) {
    if (!room) return;
    setPending(true);
    setError("");
    try {
      const updatedRoom = await updateReady(room.code, isReady);
      setRoom(updatedRoom);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "준비 상태 변경에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function handleStartGame() {
    if (!room) return;
    setPending(true);
    setError("");
    try {
      await startGame(room.code);
      // 게임 시작이 성공하면 방 상태를 다시 불러옵니다 (playing 상태 확인)
      const updatedRoom = await getRoom(room.code);
      setRoom(updatedRoom);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "게임 시작에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateSettings(settings: Partial<Room>) {
    if (!room) return;
    setPending(true);
    setError("");
    try {
      const updatedRoom = await updateRoomSettings(room.code, settings);
      setRoom(updatedRoom);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "설정 변경에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return room ? (
    room.status === "playing" && room.current_game_id ? (
      <GameScreen 
        room={room} 
        gameId={room.current_game_id} 
        onLeave={leaveLocalRoom} 
        onReturnToRoom={refreshRoom}
      />
    ) : (
      <RoomScreen
        copyState={copyState}
        currentNickname={nickname.trim()}
        error={error}
        inviteUrl={inviteUrl}
        onCopyInvite={copyInvite}
        onLeave={leaveLocalRoom}
        onRefresh={refreshRoom}
        onToggleReady={handleToggleReady}
        onStartGame={handleStartGame}
        pending={pending}
        onUpdateSettings={handleUpdateSettings}
        room={room}
      />
    )
  ) : (
    <LobbyScreen
      error={error}
      maxPlayers={maxPlayers}
      mode={mode}
      nickname={nickname}
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      pending={pending}
      roomCode={roomCode}
      setMaxPlayers={setMaxPlayers}
      setMode={setMode}
      setNickname={setNickname}
      setRoomCode={setRoomCode}
      authUser={authUser}
      isAuthLoading={isAuthLoading}
      onLogout={handleLogout}
    />
  );
}
