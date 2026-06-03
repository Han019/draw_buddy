# DrawBuddy MVP API 명세서

작성 기준일: 2026-05-27

이 문서는 현재 `backend/`와 `frontend/` 코드를 확인한 뒤, DrawBuddy를 **갈틱폰식 글/그림 릴레이 게임**으로 만들기 위한 MVP API 방향을 정리합니다. 현재 구현된 API와 앞으로 추가할 API를 구분합니다.

## 1. 서비스 방향

DrawBuddy는 Discord 로그인 또는 게스트 닉네임으로 방에 참가하는 웹 기반 그림 릴레이 게임입니다.

최종 목표 흐름:

```text
방 입장
→ 로비 채팅
→ 방장이 게임 시작
→ 모든 참가자가 첫 문장 작성
→ 다음 사람이 문장을 보고 그림
→ 다음 사람이 그림을 보고 문장으로 설명
→ 다시 그림
→ 참가자 수만큼 반복
→ 결과 앨범 공개
→ 결과 화면 채팅
→ 그림 리플레이 재생
```

핵심 정책:

- 캐치마인드식 정답 판정 게임이 아니라, 글/그림이 번갈아 이어지는 릴레이 게임으로 설계합니다.
- 게임 진행 중에는 누가 쓴 문장인지, 누가 그린 그림인지 숨깁니다.
- 작성자 정보는 서버 DB에는 저장하지만, 진행 중 응답에서는 내려주지 않습니다.
- 마지막 결과 공개 화면에서만 작성자 닉네임을 공개합니다.
- 채팅은 로비와 결과 공개 화면에서만 허용합니다.
- 게임 진행 중 채팅은 스포일러 방지를 위해 MVP에서는 비활성화합니다.
- 그림 리플레이는 PNG/영상 저장이 아니라 선 이벤트 로그를 저장해서 재생합니다.
- Discord Activity는 현재 범위에서 제외하고, 일반 웹 앱의 Discord OAuth 로그인만 지원합니다.
- Discord 로그인을 한 사용자는 Discord 프로필 이름/아바타를 기본 표시 정보로 사용할 수 있습니다.

## 2. 현재 구현 상태

### 2.1 현재 구현됨

백엔드:

- Django 프로젝트 `backend/config`
- Django 앱 `backend/game`
- Django REST Framework
- drf-spectacular / Swagger UI
- SQLite 개발 DB
- `CSRF_TRUSTED_ORIGINS`에 Vite 개발 서버 포트 `5173`, `5174`, `5175` 등록
- OpenAPI 문서 URL
  - `GET /api/schema/`
  - `GET /api/docs/`
  - `GET /api/redoc/`
- 모델
  - `Room`
  - `RoomPlayer`
  - `GameSession`
  - `GameChain`
  - `GameTurn`
  - `DrawingReplay`
  - `DiscordUser`
- Serializer
  - `RoomPlayerSerializer`
  - `RoomSerializer`
  - `RoomCreateRequestSerializer`
  - `RoomJoinRequestSerializer`
  - `ReadyUpdateSerializer`
  - `RoomSettingsUpdateSerializer`
  - `GameStartResponseSerializer`
  - `GameStateResponseSerializer`
  - `PromptSubmitSerializer`
- REST API
  - `GET /api/`
  - `POST /api/rooms/`
  - `GET /api/rooms/{room_code}/`
  - `POST /api/rooms/{room_code}/join/`
  - `PATCH /api/rooms/{room_code}/ready/`
  - `PATCH /api/rooms/{room_code}/settings/`
  - `POST /api/rooms/{room_code}/leave/`
  - `POST /api/rooms/{room_code}/players/{player_id}/kick/`
  - `POST /api/rooms/{room_code}/start/`
  - `GET /api/games/{game_id}/state/`
  - `POST /api/games/{game_id}/turns/{turn_id}/prompt/`
  - `POST /api/games/{game_id}/turns/{turn_id}/drawing/complete/`
  - `POST /api/games/{game_id}/turns/{turn_id}/guess/`
  - `GET /api/games/{game_id}/results/`
  - `GET /api/replays/{replay_id}/`
  - `GET /api/health/`
  - `GET /api/auth/discord/login/`
  - `GET /api/auth/discord/callback/`
  - `GET /api/auth/me/`
  - `POST /api/auth/logout/`
- 게임 시작 서비스
  - 참가자별 `GameChain` 생성
  - 참가자별 첫 문장용 `GameTurn` 생성
  - `DEFAULT_PROMPTS`에서 `random.sample()`로 서로 다른 기본 문장 배정
- WebSocket (Django Channels)
  - 개발용 InMemoryChannelLayer 설정
  - `ws/rooms/{room_code}/` 로비 실시간 채팅 및 방 상태 동기화
  - 결과 공개 화면 슬라이드 동기화 및 결과 채팅 기능
- migration 파일
  - `0001_initial.py`
  - `0002_rename_room_fields.py`
  - `0003_rename_created_at_room_created_time_and_more.py`
  - `0004_reapply_room_api_field_names.py`
  - `0005_room_draw_time_room_updated_at_room_write_time_and_more.py`
  - `0006_gamesession_current_turn_number_and_more.py`

프론트엔드:

- React + Vite + TypeScript + Tailwind CSS
- `LobbyScreen`
- `RoomScreen`
- 방 생성 API 연결
- 방 참가 API 연결
- 방 조회 API 연결
- 로비/방 화면 디자인 적용
- 인게임 프롬프트, 드로잉, 예측, 결과창 API 연동 완료

### 2.2 추가 구현 필요 (향후 계획)

- 그림 선 이벤트 저장 WebSocket

## 3. 현재 데이터 모델

### DiscordUser (현재 구현됨)

Discord OAuth 로그인 사용자를 저장하는 모델입니다. Discord Activity는 구현하지 않습니다.

권장 필드:

| 필드 | 설명 |
| --- | --- |
| `discord_id` | Discord user id, unique |
| `username` | Discord username |
| `global_name` | Discord display name |
| `avatar_hash` | Discord avatar hash |
| `avatar_url` | 프론트 표시용 avatar URL |
| `created_at` | 생성 시각 |
| `updated_at` | 수정 시각 |

정책:

- OAuth scope는 MVP에서 `identify`만 사용합니다.
- 이메일은 MVP에서 요청하지 않습니다.
- Discord access token/refresh token은 꼭 필요할 때만 암호화 저장을 고려합니다.
- 현재 앱에서는 로그인 직후 Django session에 `discord_user_id`를 저장하는 방식이 단순합니다.

### Room

현재 구현됨.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `code` | `CharField(max_length=6, unique=True)` | 초대용 방 코드 |
| `status` | `CharField(choices=RoomStatus, default="waiting")` | `waiting`, `playing`, `finished` |
| `max_players` | `IntegerField(default=8)` | 최대 참가 인원 |
| `draw_time` | `PositiveIntegerField(default=180)` | 그림 제한 시간, 초 단위 |
| `write_time` | `PositiveIntegerField(default=60)` | 문장 작성 제한 시간, 초 단위 |
| `created_at` | `DateTimeField(auto_now_add=True)` | 생성 시각 |
| `updated_at` | `DateTimeField(auto_now=True)` | 수정 시각 |

추가 권장:

- `rounds`: 릴레이 턴 수. 기본값은 참가자 수와 같게 둘 수 있습니다.
- `word_pack`: 단어팩을 사용할 경우 필요합니다.

### RoomPlayer

현재 구현됨.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `room` | `ForeignKey(Room, related_name="players")` | 참가한 방 |
| `nickname` | `CharField(max_length=20)` | 닉네임 |
| `is_host` | `BooleanField(default=False)` | 방장 여부 |
| `is_ready` | `BooleanField(default=False)` | 준비 여부 |
| `score` | `IntegerField(default=0)` | 현재 코드에 존재하지만 릴레이 MVP에서는 필수 아님 |
| `joined_at` | `DateTimeField(auto_now_add=True)` | 입장 시각 |

추가 권장:

- `session_key` 또는 `player_token`: 요청자가 본인인지 확인하기 위한 값.
- `discord_user`: `ForeignKey(DiscordUser, null=True, blank=True)`.

현재 제약:

- `unique_room_nickname`: 같은 방 안에서 `nickname` 중복 방지.

현재 session 처리:

- `game/services/session_player.py`의 `bind_room_player()`가 create/join 성공 후 session에 `room_code -> room_player_id`를 저장합니다.
- `get_current_room_player()`가 ready/settings API에서 현재 요청자의 `RoomPlayer`를 찾습니다.

정책:

- 게스트 참가자는 `discord_user = null`입니다.
- Discord 로그인 참가자는 `discord_user`를 연결합니다.
- Discord 로그인 상태에서는 `nickname` 요청값이 없으면 `global_name` 또는 `username`을 기본 닉네임으로 사용합니다.
- 결과 공개 화면에서 작성자 표시 시 Discord 아바타를 함께 보여줄 수 있습니다.

### GameSession

현재 구현됨.

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `room` | `ForeignKey(Room, related_name="games")` | 게임이 속한 방 |
| `status` | `CharField(choices=GameSession.Status, default="collecting_prompts")` | 게임 상태 |
| `current_turn_number` | `PositiveIntegerField(default=0)` | 현재 턴 번호 |
| `started_at` | `DateTimeField(auto_now_add=True)` | 시작 시각 |
| `finished_at` | `DateTimeField(null=True, blank=True)` | 종료 시각 |

현재 상태값:

- `collecting_prompts`
- `playing`
- `revealing`
- `finished`

### GameChain

현재 구현됨.

한 명이 시작한 첫 문장에서 출발하는 결과 앨범 하나를 의미합니다.

예시:

```text
A의 첫 문장
→ B의 그림
→ C의 설명
→ D의 그림
```

현재 필드:

| 필드 | 설명 |
| --- | --- |
| `game_session` | 소속 게임 |
| `starter_player` | 첫 문장을 쓴 참가자 |
| `order_index` | 결과 공개 순서 |
| `created_at` | 생성 시각 |

### GameTurn

현재 구현됨.

각 체인 안의 한 턴 제출물입니다.

현재 필드:

| 필드 | 설명 |
| --- | --- |
| `game_session` | 소속 게임 |
| `chain` | 소속 체인 |
| `turn_number` | 0부터 시작하는 턴 번호 |
| `player` | 작성자 또는 그림 작성자 |
| `kind` | `prompt`, `drawing`, `guess` |
| `text` | `prompt` 또는 `guess` 내용 |
| `drawing_replay` | 그림 이벤트 로그 |
| `submitted_at` | 제출 시각 |

진행 중 API에서는 `player` 정보를 숨기고, 결과 공개 API에서만 공개합니다.

현재 제약:

- `unique_chain_turn_number`: 같은 체인 안에서 같은 턴 번호 중복 방지.

### DrawingReplay

현재 구현됨.

그림이 어떻게 그려졌는지 재생하기 위한 이벤트 로그입니다.

현재 필드:

| 필드 | 설명 |
| --- | --- |
| `game_turn` | 연결된 그림 턴 |
| `canvas_width` | 저장 기준 캔버스 너비 |
| `canvas_height` | 저장 기준 캔버스 높이 |
| `events` | 선 이벤트 JSON 배열 |
| `created_at` | 생성 시각 |

예시 이벤트:

```json
{
  "type": "draw_line",
  "t": 1240,
  "x1": 120,
  "y1": 80,
  "x2": 128,
  "y2": 86,
  "color": "#111111",
  "width": 6
}
```

`t`는 라운드 시작 후 경과 시간 ms입니다.

## 4. REST API 목록

| Method | Endpoint | 현재 상태 | 설명 |
| --- | --- | --- | --- |
| `GET` | `/api/` | 현재 구현됨 | smoke 응답 |
| `GET` | `/api/auth/me/` | 현재 구현됨 | 현재 로그인 사용자 조회 |
| `GET` | `/api/auth/discord/login/` | 현재 구현됨 | Discord OAuth 시작 |
| `GET` | `/api/auth/discord/callback/` | 현재 구현됨 | Discord OAuth callback |
| `POST` | `/api/auth/logout/` | 현재 구현됨 | 로그아웃 |
| `POST` | `/api/rooms/` | 현재 구현됨 | 방 생성 + 방장 참가 |
| `GET` | `/api/rooms/{room_code}/` | 현재 구현됨 | 방 정보 조회 |
| `POST` | `/api/rooms/{room_code}/join/` | 현재 구현됨 | 방 코드 참가 |
| `PATCH` | `/api/rooms/{room_code}/settings/` | 현재 구현됨 | 방 설정 변경 |
| `PATCH` | `/api/rooms/{room_code}/ready/` | 현재 구현됨 | 준비 상태 변경 |
| `POST` | `/api/rooms/{room_code}/leave/` | 현재 구현됨 | 방 나가기 |
| `POST` | `/api/rooms/{room_code}/players/{player_id}/kick/` | 현재 구현됨 | 방장이 참가자 내보내기 |
| `POST` | `/api/rooms/{room_code}/start/` | 현재 구현됨 | 게임 시작 및 릴레이 체인 생성 |
| `GET` | `/api/games/{game_id}/state/` | 현재 구현됨 | 현재 플레이어의 진행 상태 조회 |
| `POST` | `/api/games/{game_id}/turns/{turn_id}/prompt/` | 현재 구현됨 | 첫 문장 제출 |
| `GET` | `/api/health/` | 현재 구현됨 | 시스템 헬스체크 조회 |
| `POST` | `/api/games/{game_id}/turns/{turn_id}/guess/` | 현재 구현됨 | 그림 설명 문장 제출 |
| `POST` | `/api/games/{game_id}/turns/{turn_id}/drawing/complete/` | 현재 구현됨 | 그림 제출 완료 |
| `GET` | `/api/games/{game_id}/results/` | 현재 구현됨 | 결과 앨범 조회, 작성자 공개 |
| `GET` | `/api/replays/{replay_id}/` | 현재 구현됨 | 그림 리플레이 이벤트 조회 |

## 5. 현재 구현 API 상세

### 5.1 방 생성

Method: `POST`

Endpoint: `/api/rooms/`

현재 상태: 구현됨

기능:

- 방 코드를 생성합니다.
- `Room`을 생성합니다.
- 요청한 닉네임으로 `RoomPlayer`를 생성하고 `is_host=True`로 저장합니다.

Request body:

```json
{
  "nickname": "민수",
  "max_players": 6
}
```

Success response: `201 Created`

```json
{
  "id": 1,
  "code": "A1B2C3",
  "status": "waiting",
  "max_players": 6,
  "created_at": "2026-05-27T10:20:30Z",
  "players": [
    {
      "id": 1,
      "nickname": "민수",
      "is_host": true,
      "is_ready": false,
      "score": 0,
      "joined_at": "2026-05-27T10:20:30Z"
    }
  ]
}
```

프론트 호출 시점:

- 첫 화면에서 닉네임 입력 후 `방 만들기` 클릭.

현재 Serializer:

- `RoomCreateRequestSerializer`
- `RoomSerializer`

현재 View:

- `RoomCreateAPIView`

Swagger summary:

- `방 생성`

### 5.2 방 정보 조회

Method: `GET`

Endpoint: `/api/rooms/{room_code}/`

현재 상태: 구현됨

기능:

- 방 코드에 해당하는 방 상태와 참가자 목록을 조회합니다.

Success response: `200 OK`

```json
{
  "id": 1,
  "code": "A1B2C3",
  "status": "waiting",
  "max_players": 6,
  "created_at": "2026-05-27T10:20:30Z",
  "players": []
}
```

Error response:

- `404 Not Found`: 존재하지 않는 방.

프론트 호출 시점:

- 방 입장 직후.
- 새로고침 버튼 클릭.
- 나중에는 WebSocket reconnect 후 상태 동기화할 때.

현재 Serializer:

- `RoomSerializer`

현재 View:

- `RoomDetailAPIView`

Swagger summary:

- `방 정보 조회`

### 5.3 방 참가

Method: `POST`

Endpoint: `/api/rooms/{room_code}/join/`

현재 상태: 구현됨

기능:

- 방 코드로 방을 찾습니다.
- 방 상태가 `waiting`인지 확인합니다.
- 정원이 가득 찼는지 확인합니다.
- 같은 방에서 닉네임이 중복되는지 확인합니다.
- 참가자를 `RoomPlayer`로 생성합니다.

Request body:

```json
{
  "nickname": "지수"
}
```

Success response: `201 Created`

```json
{
  "id": 1,
  "code": "A1B2C3",
  "status": "waiting",
  "max_players": 6,
  "created_at": "2026-05-27T10:20:30Z",
  "players": [
    {
      "id": 1,
      "nickname": "민수",
      "is_host": true,
      "is_ready": false,
      "score": 0,
      "joined_at": "2026-05-27T10:20:30Z"
    },
    {
      "id": 2,
      "nickname": "지수",
      "is_host": false,
      "is_ready": false,
      "score": 0,
      "joined_at": "2026-05-27T10:21:02Z"
    }
  ]
}
```

Error response:

- `404 Not Found`: 존재하지 않는 방.
- `409 Conflict`: 이미 시작되었거나 종료된 방.
- `409 Conflict`: 방 인원 초과.
- `409 Conflict`: 닉네임 중복.

프론트 호출 시점:

- 첫 화면에서 방 코드와 닉네임 입력 후 `참가하기` 클릭.

현재 Serializer:

- `RoomJoinRequestSerializer`
- `RoomSerializer`

현재 View:

- `RoomJoinAPIView`

Swagger summary:

- 현재 코드: `방 참가하는 api`
- 권장 문구: `방 참가`

### 5.4 준비 상태 변경

Method: `PATCH`

Endpoint: `/api/rooms/{room_code}/ready/`

현재 상태: 구현됨

기능:

- 현재 session에 연결된 `RoomPlayer`를 찾습니다.
- 방 상태가 `waiting`일 때만 준비 상태를 변경합니다.
- `is_ready` 값을 저장합니다.

Request body:

```json
{
  "is_ready": true
}
```

Success response: `200 OK`

```json
{
  "id": 1,
  "code": "A1B2C3",
  "status": "waiting",
  "max_players": 6,
  "created_at": "2026-05-27T10:20:30Z",
  "players": [
    {
      "id": 2,
      "nickname": "지수",
      "is_host": false,
      "is_ready": true,
      "score": 0,
      "joined_at": "2026-05-27T10:21:02Z"
    }
  ]
}
```

Error response:

- `401 Unauthorized`: 해당 방에 참가한 사용자 세션이 없음.
- `404 Not Found`: 존재하지 않는 방.
- `409 Conflict`: 대기 중인 방이 아님.

현재 Serializer:

- `ReadyUpdateSerializer`
- `RoomSerializer`

현재 View:

- `RoomReadyAPIView`

Swagger summary:

- `준비단계 설정`

### 5.5 방 설정 변경

Method: `PATCH`

Endpoint: `/api/rooms/{room_code}/settings/`

현재 상태: 구현됨

기능:

- 현재 session에 연결된 `RoomPlayer`를 찾습니다.
- 방장만 설정을 변경할 수 있습니다.
- 방 상태가 `waiting`일 때만 변경할 수 있습니다.
- `draw_time`, `write_time`을 부분 수정합니다.

Request body:

```json
{
  "draw_time": 180,
  "write_time": 60
}
```

Success response: `200 OK`

현재 `RoomSerializer`에 `draw_time`, `write_time`, `updated_at`이 포함되어 있으므로 변경된 설정값도 응답에 내려갑니다.

Error response:

- `400 Bad Request`: 변경할 설정값이 없음 또는 값 범위 오류.
- `401 Unauthorized`: 해당 방에 참가한 사용자 세션이 없음.
- `403 Forbidden`: 방장이 아님.
- `404 Not Found`: 존재하지 않는 방.
- `409 Conflict`: 대기 중인 방이 아님.

현재 Serializer:

- `RoomSettingsUpdateSerializer`
- `RoomSerializer`

현재 View:

- `RoomSettingsAPIView`

Swagger summary:

- `방 설정 변경`

## 6. Discord 로그인 API 상세

Discord Activity는 제외합니다. 일반 웹 브라우저에서 Discord OAuth2 로그인만 처리합니다.

### 6.1 현재 로그인 사용자 조회

Method: `GET`

Endpoint: `/api/auth/me/`

현재 상태: 구현됨

기능:

- Django session에 저장된 Discord 로그인 사용자를 반환합니다.
- 로그인하지 않은 경우 `user: null`을 반환합니다.

Success response:

```json
{
  "user": {
    "id": 1,
    "provider": "discord",
    "discord_id": "123456789012345678",
    "username": "drawbuddy_user",
    "global_name": "민수",
    "avatar_url": "https://cdn.discordapp.com/avatars/123456789012345678/avatar_hash.png"
  }
}
```

비로그인 응답:

```json
{
  "user": null
}
```

Swagger summary:

- `현재 로그인 사용자 조회`

### 6.2 Discord 로그인 시작

Method: `GET`

Endpoint: `/api/auth/discord/login/`

현재 상태: 구현됨

기능:

- Discord OAuth authorize URL로 redirect합니다.
- `state`를 생성해서 session에 저장합니다.
- scope는 `identify`를 사용합니다.

Query parameters:

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `next` | 선택 | 로그인 성공 후 프론트로 돌아갈 경로 |

동작:

```text
GET /api/auth/discord/login/?next=/rooms/A1B2C3
→ Discord authorize URL로 302 redirect
```

필요 환경 변수:

```text
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI
FRONTEND_BASE_URL
```

Swagger summary:

- `Discord 로그인 시작`

### 6.3 Discord OAuth callback

Method: `GET`

Endpoint: `/api/auth/discord/callback/`

현재 상태: 구현됨

기능:

- Discord에서 받은 `code`, `state`를 검증합니다.
- 백엔드가 Discord token endpoint에 code를 교환합니다.
- Discord user endpoint에서 기본 프로필을 조회합니다.
- `DiscordUser`를 생성 또는 갱신합니다.
- Django session에 `discord_user_id`를 저장합니다.
- 로그인 성공 후 프론트 URL로 redirect합니다.

Query parameters:

| 이름 | 필수 | 설명 |
| --- | --- | --- |
| `code` | 필수 | Discord authorization code |
| `state` | 필수 | CSRF 방지용 state |

성공 동작:

```text
302 Redirect: {FRONTEND_BASE_URL}{next}
```

오류:

- `400 Bad Request`: state 불일치.
- `400 Bad Request`: Discord code 교환 실패.
- `502 Bad Gateway`: Discord API 응답 실패.

Swagger summary:

- `Discord OAuth callback`

### 6.4 로그아웃

Method: `POST`

Endpoint: `/api/auth/logout/`

현재 상태: 구현됨

기능:

- Django session에서 `discord_user_id`를 제거합니다.
- 필요하면 방 참가 세션 정보도 함께 제거할지 정책 결정이 필요합니다.

Success response:

```json
{
  "logged_out": true
}
```

Swagger summary:

- `로그아웃`

## 7. 게임 REST API 상세

### 7.1 게임 시작

Method: `POST`

Endpoint: `/api/rooms/{room_code}/start/`

현재 상태: 구현됨

권한:

- 방장만 호출 가능.
- 방 상태가 `waiting`이어야 합니다.
- 최소 참가자 수는 2명 이상을 권장합니다.
- 준비 기능을 쓰는 경우 방장을 제외한 모든 참가자가 준비 완료여야 합니다.

기능:

- `Room.status`를 `playing`으로 변경합니다.
- `GameSession`을 생성합니다.
- 각 참가자마다 `GameChain`을 하나씩 생성합니다.
- 첫 턴은 모든 참가자에게 `prompt` 제출 턴으로 배정합니다.
- 각 체인의 첫 문장용 `GameTurn`을 서버에서 생성합니다.
- `DEFAULT_PROMPTS` 목록에서 참가자 수만큼 문장을 중복 없이 선택합니다.
- 선택된 문장을 각 `GameTurn.text`에 기본값으로 저장합니다.
- 사용자는 기본 문장을 그대로 제출하거나 원하는 문장으로 덮어쓸 수 있습니다.
- 제한 시간 내에 제출하지 않은 사용자의 기본 문장을 자동 확정하는 처리는 아직 추가 구현이 필요합니다.
- 후속 턴 배정은 게임 진행 API 구현 시 서버에서 처리합니다.

Success response:

```json
{
  "game_id": 10,
  "room_code": "A1B2C3",
  "room_status": "playing",
  "game_status": "collecting_prompts",
  "current_turn_number": 0
}
```

Swagger summary:

- `게임 시작`

### 7.2 현재 게임 상태 조회

Method: `GET`

Endpoint: `/api/games/{game_id}/state/`

현재 상태: 구현됨

기능:

- 현재 session에 연결된 참가자의 이번 턴 작업을 반환합니다.
- 작성자 정보는 숨깁니다.
- 본인이 처리해야 할 입력 타입, 제한 시간, 현재 저장된 문장을 반환합니다.
- 첫 문장 작성 단계에서는 서버가 배정한 랜덤 기본 문장이 `turn.text`로 반환됩니다.

예시 응답:

```json
{
  "game_id": 10,
  "game_status": "collecting_prompts",
  "current_turn_number": 0,
  "turn": {
    "id": 31,
    "turn_number": 0,
    "kind": "prompt",
    "time_limit": 60,
    "text": "우주에서 라면 먹는 사람"
  }
}
```

주의:

- 현재 구현은 `turn.text`를 반환합니다.
- 그림 턴에서 이전 문장을 별도 `source.text`로 반환하는 구조는 후속 턴 배정 API 구현 시 추가합니다.
- `player`, `nickname`, `author`는 포함하지 않습니다.
- 결과 공개 전까지 누가 쓴 문장인지 알 수 없어야 합니다.

Swagger summary:

- `현재 게임 상태 조회`

### 7.3 첫 문장 제출

Method: `POST`

Endpoint: `/api/games/{game_id}/turns/{turn_id}/prompt/`

현재 상태: 구현됨

Request body:

```json
{
  "text": "우주에서 라면 먹는 사람"
}
```

Success response:

```json
{
  "turn_id": 31,
  "kind": "prompt",
  "submitted": true
}
```

Swagger summary:

- `첫 문장 제출`

### 7.4 그림 제출 완료

Method: `POST`

Endpoint: `/api/games/{game_id}/turns/{turn_id}/drawing/complete/`

현재 상태: 구현됨

기능:

- WebSocket으로 저장된 drawing event 로그를 해당 턴의 최종 그림으로 확정합니다.
- 선택적으로 마지막 PNG snapshot을 생성할 수 있지만, 리플레이 기준 데이터는 선 이벤트입니다.

Request body:

```json
{
  "replay_id": 77
}
```

Success response:

```json
{
  "turn_id": 32,
  "kind": "drawing",
  "submitted": true,
  "replay_id": 77
}
```

Swagger summary:

- `그림 제출 완료`

### 7.5 그림 설명 문장 제출

Method: `POST`

Endpoint: `/api/games/{game_id}/turns/{turn_id}/guess/`

현재 상태: 구현됨

Request body:

```json
{
  "text": "우주복을 입고 라면을 먹는 사람"
}
```

Success response:

```json
{
  "turn_id": 33,
  "kind": "guess",
  "submitted": true
}
```

Swagger summary:

- `그림 설명 제출`

### 7.6 결과 조회

Method: `GET`

Endpoint: `/api/games/{game_id}/results/`

현재 상태: 구현됨

기능:

- 모든 체인의 결과 앨범을 순서대로 반환합니다.
- 이 API에서만 작성자 정보를 공개합니다.
- 그림 턴에는 `replay_id`를 포함합니다.

Success response:

```json
{
  "game_id": 10,
  "room_code": "A1B2C3",
  "chains": [
    {
      "chain_id": 1,
      "turns": [
        {
          "turn_number": 0,
          "kind": "prompt",
          "author": {
            "id": 1,
            "nickname": "민수"
          },
          "text": "우주에서 라면 먹는 사람"
        },
        {
          "turn_number": 1,
          "kind": "drawing",
          "author": {
            "id": 2,
            "nickname": "지수"
          },
          "replay_id": 77
        }
      ]
    }
  ]
}
```

Swagger summary:

- `게임 결과 조회`

### 7.7 리플레이 조회

Method: `GET`

Endpoint: `/api/replays/{replay_id}/`

현재 상태: 구현됨

Success response:

```json
{
  "replay_id": 77,
  "canvas_width": 800,
  "canvas_height": 600,
  "events": [
    {
      "type": "draw_line",
      "t": 1240,
      "x1": 120,
      "y1": 80,
      "x2": 128,
      "y2": 86,
      "color": "#111111",
      "width": 6
    }
  ]
}
```

Swagger summary:

- `그림 리플레이 조회`

## 8. WebSocket 명세

Django Channels가 도입되었습니다 (로비 채널 프론트/백 연동 완료).

### 8.1 로비 WebSocket

Endpoint:

상태: 구현됨

```text
/ws/rooms/{room_code}/
```

사용 시점:

- 방 입장 후 게임 시작 전.

허용 이벤트:

- `chat_message`
- `player_joined`
- `player_left`
- `player_ready_changed`
- `room_settings_changed`
- `game_started`

채팅 메시지 예시:

```json
{
  "type": "chat_message",
  "nickname": "민수",
  "message": "다들 준비됐나요?",
  "sent_at": "2026-05-27T10:30:00Z"
}
```

MVP 정책:

- 로비 채팅은 처음에는 DB 저장 없이 실시간 전달만 해도 됩니다.
- 필요해지면 `ChatMessage` 모델로 저장합니다.

### 8.2 게임 진행 WebSocket

Endpoint:

```text
/ws/games/{game_id}/
```

사용 시점:

- 실제 게임 진행 중.

주의:

- 게임 진행 중 일반 채팅은 허용하지 않습니다.
- 그림 선 이벤트는 다른 참가자에게 실시간 공개하지 않는 것을 기본 정책으로 합니다.
- 서버는 그림 작성자의 이벤트를 저장하고, 필요하면 작성자 본인에게만 ack를 보냅니다.

그림 선 이벤트:

```json
{
  "type": "draw_line",
  "turn_id": 32,
  "client_event_id": "evt-001",
  "x1": 120,
  "y1": 80,
  "x2": 128,
  "y2": 86,
  "color": "#111111",
  "width": 6
}
```

서버 저장 이벤트:

```json
{
  "type": "draw_line",
  "t": 1240,
  "x1": 120,
  "y1": 80,
  "x2": 128,
  "y2": 86,
  "color": "#111111",
  "width": 6
}
```

전체 지우기:

```json
{
  "type": "canvas_cleared",
  "turn_id": 32,
  "client_event_id": "evt-002"
}
```

턴 종료 알림:

```json
{
  "type": "turn_finished",
  "game_id": 10,
  "turn_number": 1
}
```

### 8.3 결과 WebSocket

Endpoint:

```text
/ws/games/{game_id}/results/
```

사용 시점:

- 모든 턴이 끝나고 결과 공개 화면에 들어간 뒤.

허용 이벤트:

- `result_chat_message`
- `result_reveal_started`
- `result_reveal_step_changed`

결과 채팅 예시:

```json
{
  "type": "result_chat_message",
  "nickname": "지수",
  "message": "이 그림 진짜 웃기네요",
  "sent_at": "2026-05-27T10:40:00Z"
}
```

## 9. 상태 흐름

### 9.1 방 상태

```text
waiting
→ playing
→ finished
```

현재 `Room.status`는 위 세 상태만 사용합니다.

### 9.2 게임 세션 상태

권장:

```text
collecting_prompts
→ playing
→ revealing
→ finished
```

### 9.3 로비 흐름

```text
사용자 A가 방 생성
→ Room 생성
→ A를 RoomPlayer로 저장하고 host 처리
→ 사용자 B, C가 방 코드로 참가
→ 로비 채팅 가능
→ 참가자들이 ready 변경
→ 방장이 settings 변경
→ 방장이 game start 호출
→ Room.status = playing
→ GameSession 생성
→ 참가자별 GameChain 생성
→ 모든 참가자에게 game_started 이벤트 전달
```

### 9.4 릴레이 흐름

4명 기준 예시:

```text
Turn 0: A, B, C, D가 각자 첫 문장 작성
Turn 1: 각자 다른 사람의 문장을 보고 그림
Turn 2: 각자 다른 사람의 그림을 보고 문장 작성
Turn 3: 각자 다른 사람의 문장을 보고 그림
결과 공개: 각 체인의 모든 작성자와 제출물 공개
```

## 10. 프론트엔드 호출 흐름

### 10.1 로그인 확인

```text
앱 시작
→ GET /api/auth/me/
→ 로그인 상태면 Discord 프로필 표시
→ 비로그인 상태면 게스트 닉네임 입력 또는 Discord 로그인 버튼 표시
```

### 10.2 Discord 로그인

```text
Discord로 로그인 버튼 클릭
→ 브라우저 이동: /api/auth/discord/login/?next=현재경로
→ Discord 인증/동의
→ /api/auth/discord/callback/
→ 백엔드 session 저장
→ 프론트로 redirect
→ GET /api/auth/me/ 재호출
```

### 10.3 로비 진입

```text
LobbyScreen
→ POST /api/rooms/ 또는 POST /api/rooms/{room_code}/join/
→ RoomScreen 이동
→ GET /api/rooms/{room_code}/
→ /ws/rooms/{room_code}/ 연결
```

Discord 로그인 상태에서 방 생성/참가 시:

- `nickname`이 비어 있으면 Discord `global_name` 또는 `username`을 기본값으로 사용합니다.
- 생성된 `RoomPlayer.discord_user`를 로그인 사용자와 연결합니다.

게스트 상태에서 방 생성/참가 시:

- 기존처럼 request body의 `nickname`을 사용합니다.
- `RoomPlayer.discord_user`는 `null`입니다.

### 10.4 게임 시작

```text
방장: POST /api/rooms/{room_code}/start/
→ 모든 참가자에게 game_started WebSocket 이벤트
→ PromptScreen 이동
```

### 10.5 게임 진행

```text
GET /api/games/{game_id}/state/
→ kind가 prompt면 PromptScreen
→ kind가 drawing이면 DrawingScreen
→ kind가 guess면 GuessScreen
→ 제출 완료 후 WaitingScreen
→ 다음 턴 시작 시 다시 state 조회
```

### 10.6 결과 공개

```text
GET /api/games/{game_id}/results/
→ ResultScreen
→ /ws/games/{game_id}/results/ 연결
→ 그림 턴 선택 시 GET /api/replays/{replay_id}/
→ Canvas에 이벤트 재생
```

## 11. MVP 구현 우선순위

Room/로비 API, 게임 시작 API, 현재 게임 상태 조회 API 및 **첫 문장 제출 API**까지 구현 완료되었습니다.

완료:

- `RoomSerializer` 설정 필드 추가
- `POST /api/rooms/{room_code}/leave/`
- `POST /api/rooms/{room_code}/players/{player_id}/kick/`
- `POST /api/rooms/{room_code}/start/`
- 시작 시 `GameSession`, 참가자별 `GameChain`, 첫 문장용 `GameTurn` 생성
- `DEFAULT_PROMPTS`에서 참가자별 랜덤 기본 문장을 중복 없이 배정
- `GET /api/games/{game_id}/state/`
- `POST /api/games/{game_id}/turns/{turn_id}/prompt/`
- 모든 참가자의 턴 제출 완료 여부 검사 로직 (`turn_manager.py`)
- 후속 턴 배정 서비스 함수 구현 (백트래킹 알고리즘을 활용하여 이전 체인과 겹치지 않게 랜덤으로 릴레이 배정)
- 제출 완료 시 첫 그림 턴 자동 생성
- 그림 턴의 `state` 응답에 작성자 없는 `source.text`(이전 문장) 추가
- `POST /api/games/{game_id}/turns/{turn_id}/drawing/complete/` (그림 제출 완료 API)
- `POST /api/games/{game_id}/turns/{turn_id}/guess/` (그림 설명 제출 API)
- Guess 턴의 `state` 응답에 `source_replay_id`(이전 그림 식별자) 추가
- `GET /api/replays/{replay_id}/` (리플레이 조회)
- `GET /api/games/{game_id}/results/` (게임 결과 앨범 조회)
- Discord 로그인 API (`/api/auth/me/`, `/api/auth/logout/`)
- `GET /api/health/`

다음 작업:

1. 특정 참가자 턴 제한 시간 만료 시 서버 자동 제출(Auto Submit) 처리
2. 방 퇴장(Leave) API 호출 시 웹소켓 방 정보 업데이트(Room Update) 브로드캐스트
3. 디스코드 사용자 프로필 이미지 직렬화/렌더링 디버깅
4. (선택) 그림 그리기 과정 실시간 웹소켓 연동

## 12. 공통 오류 응답

현재 구현은 DRF 기본 오류 형식 또는 `{"detail": "..."}` 형식을 사용합니다.

현재 예시:

```json
{
  "detail": "이미 사용 중인 닉네임입니다."
}
```

장기적으로 권장하는 공통 오류 형식:

```json
{
  "error": {
    "code": "DUPLICATE_NICKNAME",
    "message": "이미 사용 중인 닉네임입니다.",
    "details": {}
  }
}
```

우선은 현재 코드와 맞추기 위해 `detail` 형식을 유지해도 됩니다.

## 13. 방 코드 충돌 및 비정상 종료 정리 정책

### 13.1 방 코드 충돌

현재 구현:

- `Room.code`는 `unique=True`이므로 DB에 같은 방 코드가 동시에 저장될 수 없습니다.
- 방 생성 시 `generate_room_code()`가 이미 존재하는 코드를 피해서 6자리 코드를 생성합니다.

추가 구현 필요:

- 동시에 생성된 요청이 같은 코드를 선택하는 드문 경우를 대비해 `Room.objects.create()`의 `IntegrityError`를 처리합니다.
- 방 코드 충돌이 발생하면 새로운 코드를 다시 생성해서 방 생성을 재시도합니다.
- 재시도 횟수에는 제한을 둡니다.

### 13.2 사용자의 비정상 종료

브라우저 강제 종료, 인터넷 연결 끊김, 노트북 절전처럼 `/leave/` API가 호출되지 않는 상황이 발생할 수 있습니다.

정책:

- 연결이 끊겼다고 즉시 `RoomPlayer`를 삭제하지 않습니다.
- 짧은 네트워크 장애나 새로고침 후 재접속할 수 있도록 유예 시간을 둡니다.
- REST API만 사용하는 현재 단계에서는 오래된 `Room`을 주기적으로 정리합니다.
- Django Channels 도입 후에는 WebSocket `disconnect`와 heartbeat를 활용합니다.
- heartbeat마다 DB를 갱신하지 않고, 실시간 접속 상태는 Redis 사용을 고려합니다.

### 13.3 오래된 데이터 정리

추가 구현 예정:

```bash
python manage.py cleanup_stale_rooms
```

권장 초기 정책:

| 방 상태 | 정리 기준 예시 |
| --- | --- |
| `waiting` | 마지막 수정 후 6시간 |
| `playing` | 마지막 수정 후 24시간 |
| `finished` | 결과 보관 정책에 따라 7일 |

현재 `Room.updated_at`을 기본 정리 기준으로 사용합니다. 참가자 단위 접속 상태가 필요해지면 `RoomPlayer.last_seen_at` 추가를 검토합니다.
