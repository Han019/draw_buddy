export type RoomStatus = "waiting" | "playing" | "finished";

export type RoomPlayer = {
  id: number;
  nickname: string;
  is_host: boolean;
  is_ready: boolean;
  score: number;
  joined_at: string;
  avatar_url?: string | null;
};

export type Room = {
  id: number;
  code: string;
  status: RoomStatus;
  max_players: number;
  draw_time?: number;
  write_time?: number;
  created_at: string;
  players: RoomPlayer[];
  current_game_id?: number;
};

type CreateRoomRequest = {
  nickname: string;
  max_players: number;
};

type JoinRoomRequest = {
  nickname: string;
};

export function getCsrfToken() {
  const match = document.cookie.match(new RegExp("(^| )csrftoken=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> ?? {}),
  };

  const method = init?.method?.toUpperCase() || "GET";
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["X-CSRFToken"] = getCsrfToken();
  }

  const response = await fetch(API_BASE_URL + path, {
    ...init,
    headers,
    credentials: "include", // 백엔드(Django)와 세션 쿠키를 주고받기 위해 필수!
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;

    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        message = data.detail;
      }
    } catch {
      // Keep the HTTP status text when the server did not return JSON.
    }

    throw new Error(message);
  }

  // 백엔드에서 데이터 없이(204 No Content) 성공 응답을 보냈을 때의 JSON 파싱 에러 방지
  if (response.status === 204) {
    return null as unknown as T;
  }

  return response.json() as Promise<T>;
}

export function createRoom(payload: CreateRoomRequest): Promise<Room> {
  return requestJson<Room>("/api/rooms/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function joinRoom(
  roomCode: string,
  payload: JoinRoomRequest,
): Promise<Room> {
  return requestJson<Room>(`/api/rooms/${roomCode}/join/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRoom(roomCode: string): Promise<Room> {
  return requestJson<Room>(`/api/rooms/${roomCode}/`);
}

// --- 인증 관련 API ---

export function getAuthMe(): Promise<{ user: any }> {
  return requestJson<{ user: any }>("/api/auth/me/");
}

export function logout(): Promise<{ logged_out: boolean }> {
  return requestJson<{ logged_out: boolean }>("/api/auth/logout/", {
    method: "POST",
  });
}

// --- 방(대기실) 관련 액션 API ---

export function updateReady(roomCode: string, isReady: boolean): Promise<Room> {
  return requestJson<Room>(`/api/rooms/${roomCode}/ready/`, {
    method: "PATCH",
    body: JSON.stringify({ is_ready: isReady }),
  });
}

export function updateRoomSettings(roomCode: string, settings: Partial<Room>): Promise<Room> {
  return requestJson<Room>(`/api/rooms/${roomCode}/settings/`, {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

export function returnToWaitingRoom(roomCode: string): Promise<Room> {
  return requestJson<Room>(`/api/rooms/${roomCode}/settings/`, {
    method: "PATCH",
    body: JSON.stringify({ status: "waiting" }),
  });
}

export function leaveRoom(roomCode: string): Promise<void> {
  return requestJson(`/api/rooms/${roomCode}/leave/`, {
    method: "POST",
  });
}

export function startGame(roomCode: string): Promise<any> {
  return requestJson(`/api/rooms/${roomCode}/start/`, {
    method: "POST",
  });
}

// --- 게임 진행(In-game) 관련 API ---

export type GameState = {
  game_id: number;
  game_status: string;
  current_turn_number: number;
  turn: {
    id: number;
    turn_number: number;
    kind: "prompt" | "drawing" | "guess";
    time_limit: number;
    text: string | null;
    source_text: string | null;
    source_replay_id: number | null;
    is_submitted: boolean;
  } | null;
};

export function getGameState(gameId: number): Promise<GameState> {
  return requestJson<GameState>(`/api/games/${gameId}/state/`);
}

export function submitPrompt(gameId: number, turnId: number, text: string): Promise<any> {
  return requestJson(`/api/games/${gameId}/turns/${turnId}/prompt/`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function unsubmitPrompt(gameId: number, turnId: number): Promise<any> {
  return requestJson(`/api/games/${gameId}/turns/${turnId}/prompt/`, {
    method: "DELETE",
  });
}

export function submitDrawing(gameId: number, turnId: number, payload: { canvas_width: number; canvas_height: number; events: any[] }): Promise<any> {
  return requestJson(`/api/games/${gameId}/turns/${turnId}/drawing/complete/`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function unsubmitDrawing(gameId: number, turnId: number): Promise<any> {
  return requestJson(`/api/games/${gameId}/turns/${turnId}/drawing/complete/`, {
    method: "DELETE",
  });
}

export function submitGuess(gameId: number, turnId: number, text: string): Promise<any> {
  return requestJson(`/api/games/${gameId}/turns/${turnId}/guess/`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export function unsubmitGuess(gameId: number, turnId: number): Promise<any> {
  return requestJson(`/api/games/${gameId}/turns/${turnId}/guess/`, {
    method: "DELETE",
  });
}

export function getGameResults(gameId: number): Promise<any> {
  return requestJson(`/api/games/${gameId}/results/`);
}

export function getReplay(replayId: number): Promise<any> {
  return requestJson(`/api/replays/${replayId}/`);
}
