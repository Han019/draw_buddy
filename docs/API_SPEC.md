# DrawBuddy MVP API 명세서

작성 기준일: 2026-05-26

이 문서는 현재 `backend/` 아래의 Django 코드를 먼저 확인한 뒤 작성한 MVP API 명세입니다. 현재 구현된 내용과 앞으로 구현해야 할 내용을 분리해서 기록합니다.

## 1. 서비스 개요

DrawBuddy는 Gartic Phone / 캐치마인드 스타일의 웹 기반 실시간 그림 게임 서비스입니다.

- 사용자는 회원가입 없이 닉네임으로 방을 생성하거나 방 코드로 참가합니다.
- 로비에서 방 코드, 참가자 목록, 방장, 점수, 게임 설정, 채팅을 확인합니다.
- 방장이 게임을 시작하면 `waiting` 상태의 방이 `playing` 상태로 전환됩니다.
- 실시간 채팅, 참가자 상태 갱신, 그림 좌표 전송은 WebSocket으로 처리합니다.
- 방 생성, 참가, 초기 조회, 설정 저장, 준비 상태 변경, 게임 시작 같은 명확한 요청/응답 작업은 REST API로 처리합니다.

프론트엔드 예정 스택:

- React
- Vite
- TypeScript
- Tailwind CSS
- Canvas API
- WebSocket client

백엔드 방향:

- Django
- Django REST Framework
- drf-spectacular / Swagger UI
- 추후 Django Channels + WebSocket
- 개발 DB는 SQLite, 추후 PostgreSQL 고려

## 2. 현재 구현 상태 점검 결과

### 2.1 현재 구현됨

확인한 파일:

- `backend/config/settings.py`
- `backend/config/urls.py`
- `backend/game/models.py`
- `backend/game/views.py`
- `backend/game/urls.py`
- `backend/game/admin.py`
- `backend/game/migrations/`

현재 코드 기준 구현된 내용:

- Django 프로젝트 `config`와 앱 `game`이 존재합니다.
- `INSTALLED_APPS`에 `game`, `rest_framework`, `drf_spectacular`가 등록되어 있습니다.
- 개발 DB는 SQLite `backend/db.sqlite3`로 설정되어 있습니다.
- drf-spectacular schema 설정이 `REST_FRAMEWORK["DEFAULT_SCHEMA_CLASS"]`에 등록되어 있습니다.
- OpenAPI 관련 URL이 의도한 형태로 연결되어 있습니다.
  - `GET /api/schema/`
  - `GET /api/docs/`
  - `GET /api/redoc/`
- `game.models`에 `Room`, `GameSession`, `RoomPlayer` 모델 초안이 있습니다.
- `GET /api/`는 `game.views.index`로 연결되어 `"game start"` 문자열을 반환합니다.

### 2.2 현재 구현되지 않음

- REST API용 DRF Serializer가 없습니다.
- REST API용 APIView/ViewSet이 없습니다.
- `POST /api/rooms/`, `POST /api/rooms/{room_code}/join/` 등 MVP API는 아직 구현되어 있지 않습니다.
- Django Channels 설정과 WebSocket Consumer가 없습니다.
- 로비 채팅, 그림 좌표 전송, 게임 시작 브로드캐스트는 아직 구현되어 있지 않습니다.
- `game` 앱 모델 migration 파일이 아직 없습니다.
- SQLite DB에도 `game_room`, `game_roomplayer`, `game_gamesession` 테이블이 없습니다.
- `game/admin.py`에 모델 등록이 없습니다.
- 의존성 파일 `requirements.txt`, `pyproject.toml` 등이 없습니다.

### 2.3 실행 전 수정 필요 사항

전역 Python에서 `python manage.py check`를 실행하면 `ModuleNotFoundError: No module named 'rest_framework'`로 중단됩니다. `conda`의 `ex` 환경에서는 Django REST Framework와 drf-spectacular가 설치되어 있으며 `conda run -n ex python manage.py check`가 통과합니다.

이번 확인에서 수정된 부분:

- `GameSession.started_at = models.DateTimeField(auto_now_add=True)`로 정리되었습니다.
- `RoomPlayer.__str__`는 `self.room.code`를 참조하도록 수정되었습니다.
- `RoomPlayer`에 `is_host`, `score`, `joined_at` 필드가 추가되었습니다.
- 현재 `RoomPlayer.room`의 `related_name`은 `"players"`, `GameSession.room`의 `related_name`은 `"games"`입니다. 이전에 발생했던 reverse accessor 충돌 원인인 `related_name="players"` 중복은 현재 코드에는 남아 있지 않습니다.

## 3. 데이터 모델 요약

### 3.1 현재 코드 기준 모델

#### Room

현재 구현 상태: 모델 초안 있음, migration 있음

현재 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `code` | `CharField(max_length=6, unique=True)` | 초대용 방 코드 |
| `status` | `CharField(max_length=30, default="waiting")` | 방 상태 |
| `max_players` | `IntegerField(default=8)` | 최대 참가 인원 |
| `created_at` | `DateTimeField(auto_now_add=True)` | 생성 시각 |

#### RoomPlayer

현재 구현 상태: 모델 초안 있음, migration 없음

현재 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `room` | `ForeignKey(Room, related_name="players")` | 참가한 방 |
| `nickname` | `CharField(max_length=20)` | 닉네임 |
| `is_host` | `BooleanField(default=False)` | 방장 여부 |
| `is_ready` | `BooleanField(default=False)` | 준비 여부 |
| `score` | `IntegerField(default=0)` | 점수 |
| `joined_at` | `DateTimeField(auto_now_add=True)` | 입장 시각 |

현재 누락된 MVP 권장 필드:

- `session_key` 또는 `player_token`: 세션/소유권 검증용 식별자

#### GameSession

현재 구현 상태: 모델 초안 있음, migration 없음

현재 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `room` | `ForeignKey(Room, related_name="games")` | 게임이 속한 방 |
| `status` | `CharField(max_length=20, default="waiting")` | 게임 상태 |
| `started_at` | `DateTimeField(auto_now_add=True)` | 시작 시각 |

MVP에서 게임 시작 API가 `game_id`를 반환하려면 `GameSession`이 필요합니다. 단순 로비 단계만 구현한다면 `Room.status`만으로도 시작할 수 있지만, 결과 조회와 라운드 기록 확장을 고려하면 `GameSession`을 유지하는 것이 좋습니다.

### 3.2 MVP 권장 모델 구조

#### Room 권장 필드

| 필드 | 권장 타입 | 설명 |
| --- | --- | --- |
| `code` | `CharField(max_length=6, unique=True, db_index=True)` | 방 코드 |
| `status` | `CharField(choices=RoomStatus, default="waiting")` | `waiting`, `playing`, `finished` |
| `max_players` | `PositiveSmallIntegerField(default=8)` | 최대 참가 인원 |
| `rounds` | `PositiveSmallIntegerField(default=3)` | 총 라운드 수 |
| `draw_time` | `PositiveSmallIntegerField(default=60)` | 라운드별 제한 시간, 초 단위 |
| `word_pack` | `CharField(max_length=30, default="basic")` | 단어 묶음 |
| `created_at` | `DateTimeField(auto_now_add=True)` | 생성 시각 |
| `updated_at` | `DateTimeField(auto_now=True)` | 수정 시각 |

#### RoomPlayer 권장 필드

| 필드 | 권장 타입 | 설명 |
| --- | --- | --- |
| `room` | `ForeignKey(Room, related_name="players")` | 참가한 방 |
| `nickname` | `CharField(max_length=20)` | 한글 포함 닉네임 |
| `is_host` | `BooleanField(default=False)` | 방장 여부 |
| `is_ready` | `BooleanField(default=False)` | 준비 여부 |
| `score` | `IntegerField(default=0)` | 점수, 서버만 수정 |
| `joined_at` | `DateTimeField(auto_now_add=True)` | 입장 시각 |

권장 제약:

- 같은 방 안에서 `nickname`은 중복 불가입니다.
- 한 방에는 `is_host=True`인 참가자가 1명만 존재해야 합니다.

#### GameSession 권장 필드

| 필드 | 권장 타입 | 설명 |
| --- | --- | --- |
| `room` | `ForeignKey(Room, related_name="games")` | 게임이 속한 방 |
| `status` | `CharField(default="playing")` | 게임 상태 |
| `round_number` | `PositiveSmallIntegerField(default=1)` | 현재 라운드 |
| `started_at` | `DateTimeField(auto_now_add=True)` | 시작 시각 |
| `finished_at` | `DateTimeField(null=True, blank=True)` | 종료 시각 |

## 4. 닉네임 기반 사용자 진입 정책

MVP에서는 회원가입/로그인을 구현하지 않습니다.

권장 방식:

- 방 생성과 방 참가 요청 body에서 `nickname`을 받습니다.
- 서버는 `RoomPlayer`를 생성합니다.
- 서버는 Django session에 `room_code -> room_player_id` 매핑을 저장합니다.
- 이후 준비 상태 변경, 게임 설정 변경, 게임 시작, 방 나가기 요청은 서버가 session을 보고 현재 참가자를 식별합니다.
- 프론트엔드는 API 응답의 `player.id`, `player.is_host`를 UI 상태 표시용으로만 사용합니다.
- 권한 판단은 클라이언트 값을 믿지 않고 서버에서 수행합니다.

개발 환경 주의:

- React/Vite가 별도 포트에서 실행되면 쿠키 세션을 위해 `credentials: "include"`, CSRF 처리, CORS 설정 또는 Vite proxy 설정이 필요합니다.
- WebSocket도 같은 브라우저 세션 쿠키를 사용해서 참가자를 식별하는 방향을 권장합니다.

## 5. REST API 목록

현재 구현 상태:

- 현재 실제 구현된 REST 엔드포인트는 `GET /api/`뿐입니다.
- 아래 MVP REST API는 모두 추가 구현 필요입니다.

| 구분 | Method | Endpoint | 현재 상태 | 용도 |
| --- | --- | --- | --- | --- |
| Smoke | GET | `/api/` | 현재 구현됨 | `"game start"` 문자열 반환 |
| Room | POST | `/api/rooms/` | 추가 구현 필요 | 방 생성 및 방장 참가자 생성 |
| Room | POST | `/api/rooms/{room_code}/join/` | 추가 구현 필요 | 방 코드로 참가 |
| Room | GET | `/api/rooms/{room_code}/` | 추가 구현 필요 | 로비 초기 상태 조회 |
| Room | PATCH | `/api/rooms/{room_code}/settings/` | 추가 구현 필요 | 게임 설정 변경 |
| Room | PATCH | `/api/rooms/{room_code}/ready/` | 추가 구현 필요 | 준비 상태 변경 |
| Room | POST | `/api/rooms/{room_code}/start/` | 추가 구현 필요 | 게임 시작 |
| Room | POST | `/api/rooms/{room_code}/leave/` | 추가 구현 필요 | 방 나가기 |
| Game | GET | `/api/games/{game_id}/results/` | 추후 구현 예정 | 게임 결과 조회 |

## 6. 공통 응답 형식

### 6.1 공통 날짜 형식

날짜/시간은 ISO 8601 문자열로 반환합니다.

예시:

```json
"2026-05-26T10:20:30Z"
```

### 6.2 Room 응답 객체

```json
{
  "code": "A1B2C3",
  "status": "waiting",
  "max_players": 8,
  "settings": {
    "rounds": 3,
    "draw_time": 60,
    "word_pack": "basic"
  },
  "created_at": "2026-05-26T10:20:30Z"
}
```

### 6.3 RoomPlayer 응답 객체

```json
{
  "id": 1,
  "nickname": "민수",
  "is_host": true,
  "is_ready": false,
  "score": 0,
  "joined_at": "2026-05-26T10:20:30Z"
}
```

### 6.4 공통 오류 응답 형식

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "존재하지 않는 방입니다.",
    "details": {}
  }
}
```

권장 공통 오류 코드:

| HTTP status | code | 설명 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 요청 값 검증 실패 |
| 401 | `PLAYER_SESSION_REQUIRED` | 현재 브라우저 세션에서 참가자를 찾을 수 없음 |
| 403 | `NOT_ROOM_HOST` | 방장 권한 필요 |
| 404 | `ROOM_NOT_FOUND` | 방 없음 |
| 404 | `GAME_NOT_FOUND` | 게임 없음 |
| 409 | `ROOM_FULL` | 인원 초과 |
| 409 | `ROOM_NOT_WAITING` | 대기 상태에서만 가능한 요청 |
| 409 | `NICKNAME_TAKEN` | 같은 방에 닉네임 중복 |
| 409 | `NOT_ENOUGH_PLAYERS` | 게임 시작 최소 인원 부족 |
| 409 | `PLAYERS_NOT_READY` | 참가자 준비 미완료 |

## 7. REST API 상세 명세

### 7.1 방 생성

현재 상태: 추가 구현 필요

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Endpoint | `/api/rooms/` |
| 기능 | 새 방을 만들고 요청자를 방장 `RoomPlayer`로 자동 등록합니다. |
| 호출 가능 조건 | 누구나 호출 가능, 로그인 불필요 |
| 프론트 호출 시점 | 사용자가 닉네임 입력 후 `Create Room` 버튼 클릭 |
| 권장 Serializer | `RoomCreateSerializer`, `RoomDetailSerializer`, `RoomPlayerSerializer` |
| 권장 View | `RoomViewSet.create` |

Request body:

```json
{
  "nickname": "민수",
  "max_players": 8,
  "settings": {
    "rounds": 3,
    "draw_time": 60,
    "word_pack": "basic"
  }
}
```

요청 값 규칙:

- `nickname`: 필수, 1자 이상 20자 이하, 한글 허용
- `max_players`: 선택, 기본값 8, 권장 범위 2-12
- `settings.rounds`: 선택, 기본값 3, 권장 범위 1-10
- `settings.draw_time`: 선택, 기본값 60, 권장 범위 30-180
- `settings.word_pack`: 선택, 기본값 `basic`

Success response:

HTTP status: `201 Created`

```json
{
  "room": {
    "code": "A1B2C3",
    "status": "waiting",
    "max_players": 8,
    "settings": {
      "rounds": 3,
      "draw_time": 60,
      "word_pack": "basic"
    },
    "created_at": "2026-05-26T10:20:30Z"
  },
  "player": {
    "id": 1,
    "nickname": "민수",
    "is_host": true,
    "is_ready": false,
    "score": 0,
    "joined_at": "2026-05-26T10:20:30Z"
  },
  "websocket_url": "/ws/rooms/A1B2C3/"
}
```

Error response:

HTTP status: `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 값이 올바르지 않습니다.",
    "details": {
      "nickname": ["닉네임은 필수입니다."]
    }
  }
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Create room`
- description: `닉네임으로 새 방을 생성하고 생성자를 방장 참가자로 등록합니다. 로그인은 사용하지 않으며 서버 세션에 참가자 정보를 저장합니다.`

### 7.2 방 코드로 참가

현재 상태: 추가 구현 필요

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Endpoint | `/api/rooms/{room_code}/join/` |
| 기능 | 방 코드로 대기 중인 방에 참가합니다. |
| 호출 가능 조건 | 방이 존재하고 `waiting` 상태이며 정원이 남아 있어야 합니다. |
| 프론트 호출 시점 | 사용자가 닉네임과 방 코드를 입력 후 `Join Game` 버튼 클릭 |
| 권장 Serializer | `RoomJoinSerializer`, `RoomDetailSerializer`, `RoomPlayerSerializer` |
| 권장 View | `RoomViewSet.join` custom action |

Request body:

```json
{
  "nickname": "지우"
}
```

Success response:

HTTP status: `201 Created`

```json
{
  "room": {
    "code": "A1B2C3",
    "status": "waiting",
    "max_players": 8,
    "settings": {
      "rounds": 3,
      "draw_time": 60,
      "word_pack": "basic"
    },
    "created_at": "2026-05-26T10:20:30Z"
  },
  "player": {
    "id": 2,
    "nickname": "지우",
    "is_host": false,
    "is_ready": false,
    "score": 0,
    "joined_at": "2026-05-26T10:21:10Z"
  },
  "players": [
    {
      "id": 1,
      "nickname": "민수",
      "is_host": true,
      "is_ready": false,
      "score": 0,
      "joined_at": "2026-05-26T10:20:30Z"
    },
    {
      "id": 2,
      "nickname": "지우",
      "is_host": false,
      "is_ready": false,
      "score": 0,
      "joined_at": "2026-05-26T10:21:10Z"
    }
  ],
  "websocket_url": "/ws/rooms/A1B2C3/"
}
```

Error responses:

HTTP status: `404 Not Found`

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "존재하지 않는 방입니다.",
    "details": {
      "room_code": "A1B2C3"
    }
  }
}
```

HTTP status: `409 Conflict`

```json
{
  "error": {
    "code": "ROOM_FULL",
    "message": "방 인원이 가득 찼습니다.",
    "details": {
      "max_players": 8
    }
  }
}
```

HTTP status: `409 Conflict`

```json
{
  "error": {
    "code": "ROOM_NOT_WAITING",
    "message": "이미 시작되었거나 종료된 방에는 참가할 수 없습니다.",
    "details": {
      "status": "playing"
    }
  }
}
```

HTTP status: `409 Conflict`

```json
{
  "error": {
    "code": "NICKNAME_TAKEN",
    "message": "이미 사용 중인 닉네임입니다.",
    "details": {
      "nickname": "지우"
    }
  }
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Join room`
- description: `방 코드와 닉네임으로 대기 중인 방에 참가합니다. 정원, 방 상태, 닉네임 중복을 서버에서 검증합니다.`

### 7.3 방 정보 조회

현재 상태: 추가 구현 필요

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Endpoint | `/api/rooms/{room_code}/` |
| 기능 | 로비 초기 렌더링에 필요한 방 상태, 참가자 목록, 설정을 조회합니다. |
| 호출 가능 조건 | 방 코드가 유효해야 합니다. |
| 프론트 호출 시점 | 로비 진입 직후, 새로고침 후 상태 복구 |
| 권장 Serializer | `RoomDetailSerializer`, `RoomPlayerSerializer` |
| 권장 View | `RoomViewSet.retrieve` |

Success response:

HTTP status: `200 OK`

```json
{
  "room": {
    "code": "A1B2C3",
    "status": "waiting",
    "max_players": 8,
    "settings": {
      "rounds": 3,
      "draw_time": 60,
      "word_pack": "basic"
    },
    "created_at": "2026-05-26T10:20:30Z"
  },
  "players": [
    {
      "id": 1,
      "nickname": "민수",
      "is_host": true,
      "is_ready": false,
      "score": 0,
      "joined_at": "2026-05-26T10:20:30Z"
    },
    {
      "id": 2,
      "nickname": "지우",
      "is_host": false,
      "is_ready": true,
      "score": 0,
      "joined_at": "2026-05-26T10:21:10Z"
    }
  ],
  "current_player": {
    "id": 1,
    "nickname": "민수",
    "is_host": true,
    "is_ready": false,
    "score": 0,
    "joined_at": "2026-05-26T10:20:30Z"
  },
  "websocket_url": "/ws/rooms/A1B2C3/"
}
```

`current_player`는 현재 Django session에서 해당 방 참가자를 찾을 수 있을 때만 포함합니다. 세션이 없으면 `null`로 반환하거나 `401`을 반환하는 정책 중 하나를 선택해야 합니다. MVP 로비 공유 링크 UX를 고려하면 조회 자체는 허용하고, 조작 API에서만 세션을 요구하는 방식을 권장합니다.

Error response:

HTTP status: `404 Not Found`

```json
{
  "error": {
    "code": "ROOM_NOT_FOUND",
    "message": "존재하지 않는 방입니다.",
    "details": {
      "room_code": "A1B2C3"
    }
  }
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Get room detail`
- description: `방 코드로 로비 초기 렌더링에 필요한 방 상태, 참가자 목록, 게임 설정, 현재 세션 참가자 정보를 조회합니다.`

### 7.4 게임 설정 변경

현재 상태: 추가 구현 필요

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| Endpoint | `/api/rooms/{room_code}/settings/` |
| 기능 | 방장이 라운드 수, 제한 시간, 단어팩을 변경합니다. |
| 호출 가능 조건 | 현재 세션 참가자가 방장이고 방 상태가 `waiting`이어야 합니다. |
| 프론트 호출 시점 | 방장이 로비 게임 설정 UI에서 값을 변경하고 저장할 때 |
| 권장 Serializer | `RoomSettingsUpdateSerializer`, `RoomDetailSerializer` |
| 권장 View | `RoomViewSet.settings` custom action |

Request body:

```json
{
  "rounds": 5,
  "draw_time": 90,
  "word_pack": "daily"
}
```

부분 업데이트를 허용합니다.

```json
{
  "draw_time": 120
}
```

Success response:

HTTP status: `200 OK`

```json
{
  "room": {
    "code": "A1B2C3",
    "status": "waiting",
    "max_players": 8,
    "settings": {
      "rounds": 5,
      "draw_time": 90,
      "word_pack": "daily"
    },
    "created_at": "2026-05-26T10:20:30Z"
  }
}
```

Error responses:

HTTP status: `403 Forbidden`

```json
{
  "error": {
    "code": "NOT_ROOM_HOST",
    "message": "방장만 게임 설정을 변경할 수 있습니다.",
    "details": {}
  }
}
```

HTTP status: `400 Bad Request`

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "허용되지 않는 설정 값입니다.",
    "details": {
      "draw_time": ["30초 이상 180초 이하로 설정해야 합니다."]
    }
  }
}
```

HTTP status: `409 Conflict`

```json
{
  "error": {
    "code": "ROOM_NOT_WAITING",
    "message": "대기 중인 방에서만 설정을 변경할 수 있습니다.",
    "details": {
      "status": "playing"
    }
  }
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Update room settings`
- description: `방장이 대기 중인 방의 라운드 수, 제한 시간, 단어팩을 변경합니다. 변경 성공 시 WebSocket room_settings_changed 이벤트를 함께 브로드캐스트합니다.`

### 7.5 준비 상태 변경

현재 상태: 추가 구현 필요

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| Endpoint | `/api/rooms/{room_code}/ready/` |
| 기능 | 현재 세션 참가자의 준비 상태를 변경합니다. |
| 호출 가능 조건 | 현재 세션 참가자가 해당 방에 참가 중이고 방 상태가 `waiting`이어야 합니다. |
| 프론트 호출 시점 | 참가자가 Ready 토글을 클릭할 때 |
| 권장 Serializer | `ReadyUpdateSerializer`, `RoomPlayerSerializer` |
| 권장 View | `RoomViewSet.ready` custom action |

Request body:

```json
{
  "is_ready": true
}
```

Success response:

HTTP status: `200 OK`

```json
{
  "player": {
    "id": 2,
    "nickname": "지우",
    "is_host": false,
    "is_ready": true,
    "score": 0,
    "joined_at": "2026-05-26T10:21:10Z"
  }
}
```

Error responses:

HTTP status: `401 Unauthorized`

```json
{
  "error": {
    "code": "PLAYER_SESSION_REQUIRED",
    "message": "현재 방의 참가자 세션을 찾을 수 없습니다.",
    "details": {}
  }
}
```

HTTP status: `409 Conflict`

```json
{
  "error": {
    "code": "ROOM_NOT_WAITING",
    "message": "대기 중인 방에서만 준비 상태를 변경할 수 있습니다.",
    "details": {
      "status": "playing"
    }
  }
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Update ready state`
- description: `현재 세션 참가자의 준비 상태를 변경합니다. 변경 성공 시 WebSocket player_ready_changed 이벤트를 브로드캐스트합니다.`

### 7.6 게임 시작

현재 상태: 추가 구현 필요

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Endpoint | `/api/rooms/{room_code}/start/` |
| 기능 | 방장이 게임을 시작하고 방 상태를 `playing`으로 변경합니다. |
| 호출 가능 조건 | 방장만 호출 가능, 방 상태는 `waiting`, 최소 2명 이상, 일반 참가자 전원 준비 완료 |
| 프론트 호출 시점 | 방장이 `Start Game` 버튼 클릭 |
| 권장 Serializer | `GameStartResponseSerializer`, `GameSessionSerializer` |
| 권장 View | `RoomViewSet.start` custom action |

Request body:

```json
{}
```

Success response:

HTTP status: `200 OK`

```json
{
  "room": {
    "code": "A1B2C3",
    "status": "playing",
    "max_players": 8,
    "settings": {
      "rounds": 3,
      "draw_time": 60,
      "word_pack": "basic"
    },
    "created_at": "2026-05-26T10:20:30Z"
  },
  "game": {
    "id": 10,
    "status": "playing",
    "round_number": 1,
    "started_at": "2026-05-26T10:25:00Z"
  }
}
```

Error responses:

HTTP status: `403 Forbidden`

```json
{
  "error": {
    "code": "NOT_ROOM_HOST",
    "message": "방장만 게임을 시작할 수 있습니다.",
    "details": {}
  }
}
```

HTTP status: `409 Conflict`

```json
{
  "error": {
    "code": "NOT_ENOUGH_PLAYERS",
    "message": "게임 시작에는 최소 2명의 참가자가 필요합니다.",
    "details": {
      "min_players": 2,
      "current_players": 1
    }
  }
}
```

HTTP status: `409 Conflict`

```json
{
  "error": {
    "code": "PLAYERS_NOT_READY",
    "message": "아직 준비하지 않은 참가자가 있습니다.",
    "details": {
      "not_ready_player_ids": [2, 3]
    }
  }
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Start game`
- description: `방장이 대기 중인 방의 게임을 시작합니다. 최소 인원과 준비 상태를 서버에서 검증하고 성공 시 GameSession을 생성한 뒤 WebSocket game_started 이벤트를 브로드캐스트합니다.`

### 7.7 방 나가기

현재 상태: 추가 구현 필요

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| Endpoint | `/api/rooms/{room_code}/leave/` |
| 기능 | 현재 세션 참가자가 방에서 나갑니다. |
| 호출 가능 조건 | 현재 세션 참가자가 해당 방에 참가 중이어야 합니다. |
| 프론트 호출 시점 | 사용자가 `Leave Room` 버튼 클릭, 로비 이탈 전 명시적 호출 |
| 권장 Serializer | `LeaveRoomResponseSerializer`, `RoomDetailSerializer` |
| 권장 View | `RoomViewSet.leave` custom action |

Request body:

```json
{}
```

방장 퇴장 정책 권장:

- `waiting` 상태에서 방장이 나가고 남은 참가자가 있으면 가장 먼저 입장한 참가자에게 방장을 위임합니다.
- `waiting` 상태에서 마지막 참가자가 나가면 방을 `finished`로 변경하거나 삭제합니다. MVP에서는 기록 단순화를 위해 `finished`로 변경하는 방식을 권장합니다.
- `playing` 상태에서 방장이 나가면 MVP에서는 방을 `finished` 처리하고 모든 참가자에게 종료 이벤트를 보내는 단순 정책을 권장합니다.

Success response:

HTTP status: `200 OK`

```json
{
  "left_player_id": 2,
  "room": {
    "code": "A1B2C3",
    "status": "waiting",
    "max_players": 8,
    "settings": {
      "rounds": 3,
      "draw_time": 60,
      "word_pack": "basic"
    },
    "created_at": "2026-05-26T10:20:30Z"
  },
  "host_changed": false,
  "new_host_player_id": 1
}
```

방이 종료된 경우:

```json
{
  "left_player_id": 1,
  "room": {
    "code": "A1B2C3",
    "status": "finished",
    "max_players": 8,
    "settings": {
      "rounds": 3,
      "draw_time": 60,
      "word_pack": "basic"
    },
    "created_at": "2026-05-26T10:20:30Z"
  },
  "host_changed": false,
  "new_host_player_id": null
}
```

Error response:

HTTP status: `401 Unauthorized`

```json
{
  "error": {
    "code": "PLAYER_SESSION_REQUIRED",
    "message": "현재 방의 참가자 세션을 찾을 수 없습니다.",
    "details": {}
  }
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Leave room`
- description: `현재 세션 참가자를 방에서 제거합니다. 방장 퇴장 시 대기 방에서는 방장을 위임하고, 진행 중인 방에서는 MVP 정책에 따라 방을 종료합니다.`

### 7.8 게임 결과 조회

현재 상태: 추후 구현 예정

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| Endpoint | `/api/games/{game_id}/results/` |
| 기능 | 게임 종료 후 최종 점수와 라운드별 결과를 조회합니다. |
| 호출 가능 조건 | 해당 게임에 참가한 사용자 또는 방 코드 접근 권한이 있는 사용자 |
| 프론트 호출 시점 | `round_finished` 또는 게임 종료 화면 진입 후 |
| 권장 Serializer | `GameResultsSerializer` |
| 권장 View | `GameViewSet.results` 또는 `GameResultsAPIView` |

Success response 예시:

HTTP status: `200 OK`

```json
{
  "game": {
    "id": 10,
    "room_code": "A1B2C3",
    "status": "finished",
    "started_at": "2026-05-26T10:25:00Z",
    "finished_at": "2026-05-26T10:35:00Z"
  },
  "players": [
    {
      "id": 1,
      "nickname": "민수",
      "score": 30
    },
    {
      "id": 2,
      "nickname": "지우",
      "score": 20
    }
  ],
  "rounds": [
    {
      "round_number": 1,
      "drawer_player_id": 1,
      "answer": "사과",
      "winner_player_id": 2
    }
  ]
}
```

OpenAPI `@extend_schema` 초안:

- summary: `Get game results`
- description: `종료된 게임의 최종 점수와 라운드별 결과를 조회합니다. MVP 이후 라운드 기록 모델이 추가된 뒤 구현합니다.`

## 8. WebSocket 명세

현재 상태: 추후 구현 예정

Swagger/OpenAPI는 HTTP REST API 문서화에 사용하고, WebSocket 메시지는 별도 명세로 관리합니다.

### 8.1 Endpoint

```text
/ws/rooms/{room_code}/
```

권장 연결 조건:

- 방 코드가 존재해야 합니다.
- MVP에서는 해당 방에 참가한 Django session이 있는 사용자만 연결을 허용합니다.
- 연결 성공 직후 서버가 현재 방 상태를 `room_snapshot` 이벤트로 한 번 내려주는 방식을 선택할 수 있습니다.

### 8.2 공통 메시지 규칙

클라이언트 -> 서버:

```json
{
  "type": "chat_message",
  "payload": {}
}
```

서버 -> 클라이언트:

```json
{
  "type": "chat_message",
  "payload": {},
  "sent_at": "2026-05-26T10:20:30Z"
}
```

서버는 권한 검사를 항상 수행해야 합니다.

- 방장만 설정 변경과 게임 시작을 수행할 수 있습니다.
- 현재 그림 담당자만 `draw_line`, `canvas_cleared`를 보낼 수 있습니다.
- 점수는 서버만 변경합니다.
- 정답 단어는 그림 담당자 외 참가자에게 노출하면 안 됩니다.

### 8.3 chat_message

용도: 로비 또는 게임 중 채팅 메시지 송수신

MVP 정책:

- 처음에는 DB에 저장하지 않고 같은 방 WebSocket 그룹에 실시간 전달만 합니다.
- 욕설 필터, 신고, 채팅 저장은 추후 확장 항목입니다.

Client -> Server:

```json
{
  "type": "chat_message",
  "payload": {
    "message": "안녕하세요"
  }
}
```

Server -> Clients:

```json
{
  "type": "chat_message",
  "payload": {
    "player_id": 2,
    "nickname": "지우",
    "message": "안녕하세요",
    "sent_at": "2026-05-26T10:22:00Z"
  }
}
```

### 8.4 player_joined

용도: 새 참가자 입장 실시간 반영

발생 시점:

- `POST /api/rooms/{room_code}/join/` 성공 후 서버가 브로드캐스트합니다.

Server -> Clients:

```json
{
  "type": "player_joined",
  "payload": {
    "player": {
      "id": 2,
      "nickname": "지우",
      "is_host": false,
      "is_ready": false,
      "score": 0,
      "joined_at": "2026-05-26T10:21:10Z"
    },
    "players_count": 2
  }
}
```

### 8.5 player_left

용도: 참가자 퇴장 실시간 반영

발생 시점:

- `POST /api/rooms/{room_code}/leave/` 성공 후 서버가 브로드캐스트합니다.
- WebSocket 연결 종료만으로 즉시 퇴장 처리할지는 별도 정책이 필요합니다. MVP에서는 명시적 Leave API 호출을 기준으로 처리하는 것을 권장합니다.

Server -> Clients:

```json
{
  "type": "player_left",
  "payload": {
    "left_player_id": 2,
    "players_count": 1,
    "host_changed": false,
    "new_host_player_id": 1
  }
}
```

### 8.6 player_ready_changed

용도: 준비 상태 변경 실시간 반영

발생 시점:

- `PATCH /api/rooms/{room_code}/ready/` 성공 후 서버가 브로드캐스트합니다.

Server -> Clients:

```json
{
  "type": "player_ready_changed",
  "payload": {
    "player_id": 2,
    "is_ready": true
  }
}
```

### 8.7 room_settings_changed

용도: 방장이 변경한 설정을 참가자 화면에 즉시 반영

발생 시점:

- `PATCH /api/rooms/{room_code}/settings/` 성공 후 서버가 브로드캐스트합니다.

Server -> Clients:

```json
{
  "type": "room_settings_changed",
  "payload": {
    "settings": {
      "rounds": 5,
      "draw_time": 90,
      "word_pack": "daily"
    },
    "updated_by_player_id": 1
  }
}
```

### 8.8 game_started

용도: 모든 참가자 화면을 게임 화면으로 전환

발생 시점:

- `POST /api/rooms/{room_code}/start/` 성공 후 서버가 브로드캐스트합니다.

Server -> Clients:

```json
{
  "type": "game_started",
  "payload": {
    "room": {
      "code": "A1B2C3",
      "status": "playing"
    },
    "game": {
      "id": 10,
      "status": "playing",
      "round_number": 1,
      "started_at": "2026-05-26T10:25:00Z"
    }
  }
}
```

### 8.9 draw_line

용도: 실시간 그림 선 좌표 전송

정책:

- PNG 전체 이미지를 계속 보내지 않습니다.
- 선 좌표와 스타일만 전송합니다.
- 서버는 현재 라운드의 그림 담당자인지 확인해야 합니다.

Client -> Server:

```json
{
  "type": "draw_line",
  "payload": {
    "game_id": 10,
    "round_number": 1,
    "x1": 120,
    "y1": 80,
    "x2": 125,
    "y2": 84,
    "color": "#111827",
    "width": 4
  }
}
```

Server -> Clients:

```json
{
  "type": "draw_line",
  "payload": {
    "player_id": 1,
    "game_id": 10,
    "round_number": 1,
    "x1": 120,
    "y1": 80,
    "x2": 125,
    "y2": 84,
    "color": "#111827",
    "width": 4
  }
}
```

### 8.10 canvas_cleared

용도: 그림판 전체 삭제 동기화

정책:

- 서버는 현재 그림 담당자인지 확인해야 합니다.

Client -> Server:

```json
{
  "type": "canvas_cleared",
  "payload": {
    "game_id": 10,
    "round_number": 1
  }
}
```

Server -> Clients:

```json
{
  "type": "canvas_cleared",
  "payload": {
    "player_id": 1,
    "game_id": 10,
    "round_number": 1
  }
}
```

### 8.11 answer_submitted

용도: 정답 제출 및 서버 판정

정책:

- 정답 검사는 반드시 서버에서 수행합니다.
- 정답 단어는 그림 담당자 외에는 노출하지 않습니다.
- 클라이언트가 보낸 채팅 메시지를 정답 후보로 함께 판정할 수 있습니다.

Client -> Server:

```json
{
  "type": "answer_submitted",
  "payload": {
    "game_id": 10,
    "round_number": 1,
    "answer": "사과"
  }
}
```

오답일 때 Server -> Clients:

```json
{
  "type": "chat_message",
  "payload": {
    "player_id": 2,
    "nickname": "지우",
    "message": "사과",
    "is_correct_answer": false,
    "sent_at": "2026-05-26T10:26:10Z"
  }
}
```

정답일 때 Server -> Clients:

```json
{
  "type": "answer_submitted",
  "payload": {
    "player_id": 2,
    "nickname": "지우",
    "is_correct": true,
    "score_delta": 10
  }
}
```

정답 이후에는 서버가 `round_finished`를 브로드캐스트합니다.

### 8.12 round_finished

용도: 제한 시간 종료 또는 정답 발생 후 라운드 종료

Server -> Clients:

```json
{
  "type": "round_finished",
  "payload": {
    "game_id": 10,
    "round_number": 1,
    "reason": "correct_answer",
    "answer": "사과",
    "winner_player_id": 2,
    "scores": [
      {
        "player_id": 1,
        "score": 0
      },
      {
        "player_id": 2,
        "score": 10
      }
    ],
    "next_round_starts_at": "2026-05-26T10:26:20Z"
  }
}
```

`reason` 값:

- `time_up`
- `correct_answer`
- `room_closed`

## 9. 상태 전이 흐름

### 9.1 Room 상태

```text
waiting -> playing -> finished
```

상태별 허용 작업:

| 상태 | 허용 작업 |
| --- | --- |
| `waiting` | 참가, 정보 조회, 설정 변경, 준비 상태 변경, 게임 시작, 방 나가기 |
| `playing` | 정보 조회, 그림/채팅 WebSocket, 정답 제출, 라운드 진행, 방 나가기 |
| `finished` | 정보 조회, 결과 조회 |

### 9.2 로비 상태 흐름

```text
사용자 A가 방 생성
-> Room 생성
-> A를 RoomPlayer로 저장하고 host 처리
-> 사용자 B, C가 방 코드로 참가
-> 로비 화면에서 참가자 목록 확인
-> 참가자들이 ready 변경
-> 방장이 settings 변경 가능
-> 방장이 game start 호출
-> playing 상태로 변경
-> 모든 참가자에게 game_started 이벤트 전달
```

### 9.3 통신 역할 분리

REST API:

- 방 생성
- 방 참가
- 방 상세 초기 조회
- 설정 변경
- 준비 상태 변경
- 게임 시작
- 방 나가기
- 결과 조회

WebSocket:

- 실시간 채팅
- 참가자 목록 실시간 갱신
- 준비 상태 즉시 반영
- 게임 시작 알림
- 그림 선 좌표 전송
- 라운드 종료 알림

## 10. 프론트엔드 호출 흐름

### 10.1 방 생성자 흐름

1. 닉네임 입력
2. `POST /api/rooms/`
3. 응답의 `room.code`, `player`, `websocket_url` 저장
4. `/rooms/{room_code}` 로비 화면으로 이동
5. `GET /api/rooms/{room_code}/`로 초기 상태 조회
6. `/ws/rooms/{room_code}/` WebSocket 연결
7. 방장이 설정 변경 시 `PATCH /api/rooms/{room_code}/settings/`
8. 방장이 시작 버튼 클릭 시 `POST /api/rooms/{room_code}/start/`
9. WebSocket `game_started` 수신 후 게임 화면으로 전환

### 10.2 참가자 흐름

1. 닉네임과 방 코드 입력
2. `POST /api/rooms/{room_code}/join/`
3. 응답의 `player`, `websocket_url` 저장
4. 로비 화면으로 이동
5. `GET /api/rooms/{room_code}/`로 초기 상태 조회
6. `/ws/rooms/{room_code}/` WebSocket 연결
7. Ready 토글 시 `PATCH /api/rooms/{room_code}/ready/`
8. WebSocket `game_started` 수신 후 게임 화면으로 전환

### 10.3 새로고침 복구 흐름

1. URL의 `room_code`로 `GET /api/rooms/{room_code}/` 호출
2. 서버 session에서 `current_player`가 확인되면 로비 복구
3. `current_player`가 없으면 닉네임 입력 또는 재참가 화면 표시
4. WebSocket 재연결

## 11. Swagger / OpenAPI 문서화 방향

현재 `config.urls` 기준 Swagger URL은 올바르게 연결되어 있습니다.

- `/api/schema/`: `SpectacularAPIView`
- `/api/docs/`: `SpectacularSwaggerView`
- `/api/redoc/`: `SpectacularRedocView`

권장 구현 구조:

- `RoomViewSet`
  - `create`
  - `retrieve`
  - `join`
  - `settings`
  - `ready`
  - `start`
  - `leave`
- `GameViewSet` 또는 `GameResultsAPIView`
  - `results`

권장 Serializer:

- `ErrorResponseSerializer`
- `RoomCreateSerializer`
- `RoomJoinSerializer`
- `RoomSettingsSerializer`
- `RoomDetailSerializer`
- `RoomPlayerSerializer`
- `ReadyUpdateSerializer`
- `GameSessionSerializer`
- `GameStartResponseSerializer`
- `LeaveRoomResponseSerializer`
- `GameResultsSerializer`

Swagger에 먼저 노출할 최소 REST API:

- `POST /api/rooms/`
- `POST /api/rooms/{room_code}/join/`
- `GET /api/rooms/{room_code}/`
- `PATCH /api/rooms/{room_code}/ready/`
- `POST /api/rooms/{room_code}/start/`

## 12. MVP 구현 우선순위

1. 의존성 파일과 실행 환경 정리
2. 현재 모델 오류 수정
3. `Room`, `RoomPlayer`, `GameSession` migration 생성
4. Serializer 추가
5. `POST /api/rooms/` 구현
6. `POST /api/rooms/{room_code}/join/` 구현
7. `GET /api/rooms/{room_code}/` 구현
8. `PATCH /api/rooms/{room_code}/ready/` 구현
9. `PATCH /api/rooms/{room_code}/settings/` 구현
10. `POST /api/rooms/{room_code}/start/` 구현
11. `POST /api/rooms/{room_code}/leave/` 구현
12. Swagger schema 검증
13. Channels 설치 및 WebSocket Consumer 추가
14. 로비 WebSocket 이벤트 구현
15. 그림 좌표, 정답 판정, 라운드 진행 구현

## 13. 추후 확장 항목

- Django Channels + Redis channel layer
- PostgreSQL 전환
- 라운드 모델 추가
- 그림 담당자 순서 배정
- 정답 단어팩 관리
- 점수 계산 정책
- 게임 결과 저장
- Canvas snapshot 저장
- 재접속 처리
- 관전자 모드
- 채팅 저장 및 신고
- 단어 난이도 설정
- OAuth 또는 사용자 계정
- Rate limit
- 방 코드 만료 정책
