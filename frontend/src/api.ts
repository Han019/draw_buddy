export type RoomStatus = "waiting" | "playing" | "finished";

export type RoomPlayer = {
  id: number;
  nickname: string;
  is_host: boolean;
  is_ready: boolean;
  score: number;
  joined_at: string;
};

export type Room = {
  id: number;
  code: string;
  status: RoomStatus;
  max_players: number;
  created_at: string;
  players: RoomPlayer[];
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

  const response = await fetch(path, {
    ...init,
    headers,
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
