import { FormEvent, useMemo, useState } from "react";
import { createRoom, getRoom, joinRoom, Room } from "./api";
import LobbyScreen, { EntryMode } from "./screens/LobbyScreen";
import RoomScreen from "./screens/RoomScreen";

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

  return room ? (
    <RoomScreen
      copyState={copyState}
      currentNickname={nickname.trim()}
      error={error}
      inviteUrl={inviteUrl}
      onCopyInvite={copyInvite}
      onLeave={leaveLocalRoom}
      onRefresh={refreshRoom}
      pending={pending}
      room={room}
    />
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
    />
  );
}
