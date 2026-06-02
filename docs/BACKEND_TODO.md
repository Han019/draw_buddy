# DrawBuddy Backend TODO

작성 기준일: 2026-05-27

이 문서는 현재 코드 기준 구현 상태와 앞으로의 백엔드 구현 순서를 정리합니다. DrawBuddy의 게임 방향은 **갈틱폰식 글/그림 릴레이 + 로비/결과 채팅 + 마지막 작성자 공개**입니다.

Discord Activity는 현재 범위에서 제외합니다. 대신 일반 웹 앱에서 Discord OAuth 로그인을 지원합니다.

## 0. 개발 서버 실행/종료 방법

### 백엔드 서버 켜기

백엔드는 `conda`의 `ex` 환경을 사용합니다.

```bash
conda activate ex
cd backend
python manage.py runserver 127.0.0.1:8000
```

확인 URL:

```text
http://127.0.0.1:8000/api/docs/
http://127.0.0.1:8000/api/schema/
http://127.0.0.1:8000/api/redoc/
```

### 프론트엔드 서버 켜기

```bash
cd frontend
npm run dev -- --host 127.0.0.1
```

기본 URL:

```text
http://127.0.0.1:5173/
```

`5173` 포트를 이미 사용 중이면 Vite가 `5174`, `5175`처럼 다음 포트로 실행할 수 있습니다. 프론트에서 API를 호출할 때는 `http://127.0.0.1:8000/api/...`를 직접 쓰지 않고 `/api/...`를 사용합니다.

### 서버 끄기

서버를 실행 중인 터미널에서 아래 키를 누릅니다.

```text
Ctrl + C
```

터미널을 닫았는데 포트가 계속 잡혀 있으면 아래 명령으로 확인합니다.

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:5174 -sTCP:LISTEN
lsof -nP -iTCP:5175 -sTCP:LISTEN
```

출력된 `PID`를 종료합니다.

```bash
kill <PID>
```

마지막 수단으로만 강제 종료합니다.

```bash
kill -9 <PID>
```

## 1. 현재 구현된 부분

### 1.1 Django 설정

- `game` 앱 등록됨.
- `rest_framework` 등록됨.
- `drf_spectacular` 등록됨.
- SQLite 사용.
- `REST_FRAMEWORK["DEFAULT_SCHEMA_CLASS"]` 설정됨.
- `CSRF_TRUSTED_ORIGINS`에 Vite 개발 서버 포트 등록됨.
  - `5173`
  - `5174`
  - `5175`

### 1.2 Swagger / OpenAPI

| URL | 상태 |
| --- | --- |
| `/api/schema/` | 구현됨 |
| `/api/docs/` | 구현됨 |
| `/api/redoc/` | 구현됨 |

### 1.3 모델

현재 `backend/game/models.py` 기준:

- `Room`
- `RoomPlayer`
- `GameSession`
- `GameChain`
- `GameTurn`
- `DrawingReplay`

최근 반영된 모델 변경:

- `Room.draw_time`
- `Room.write_time`
- `Room.updated_at`
- `RoomPlayer`의 `unique_room_nickname` 제약
- `GameSession.current_turn_number`
- `GameSession.finished_at`
- `GameChain`
- `GameTurn`
- `DrawingReplay`

현재 `related_name` 상태:

- `RoomPlayer.room`: `related_name="players"`
- `GameSession.room`: `related_name="games"`

따라서 예전에 발생했던 `related_name="players"` 중복 충돌은 현재 코드에는 없습니다.

### 1.4 Serializer

현재 `backend/game/serializers.py` 기준:

- `RoomPlayerSerializer`
- `RoomSerializer`
- `RoomCreateRequestSerializer`
- `RoomJoinRequestSerializer`
- `ReadyUpdateSerializer`
- `RoomSettingsUpdateSerializer`
- `GameStartResponseSerializer`
- `GameStateResponseSerializer`

### 1.5 REST API

현재 `backend/game/urls.py` 기준:

| Method | Endpoint | View | 상태 |
| --- | --- | --- | --- |
| `GET` | `/api/` | `index` | 구현됨 |
| `POST` | `/api/rooms/` | `RoomCreateAPIView` | 구현됨 |
| `GET` | `/api/rooms/{room_code}/` | `RoomDetailAPIView` | 구현됨 |
| `POST` | `/api/rooms/{room_code}/join/` | `RoomJoinAPIView` | 구현됨 |
| `PATCH` | `/api/rooms/{room_code}/ready/` | `RoomReadyAPIView` | 구현됨 |
| `PATCH` | `/api/rooms/{room_code}/settings/` | `RoomSettingsAPIView` | 구현됨 |
| `POST` | `/api/rooms/{room_code}/leave/` | `RoomLeaveAPIView` | 구현됨 |
| `POST` | `/api/rooms/{room_code}/players/{player_id}/kick/` | `RoomKickAPIView` | 구현됨 |
| `POST` | `/api/rooms/{room_code}/start/` | `RoomStartAPIView` | 구현됨 |
| `GET` | `/api/games/{game_id}/state/` | `GameStateAPIView` | 구현됨 |
| `POST` | `/api/games/{game_id}/turns/{turn_id}/prompt/` | `PromptSubmitAPIView` | 구현됨 |
| `GET` | `/api/health/` | `HealthCheckAPIView` | 구현됨 |

### 1.6 세션 기반 참가자 식별

현재 `backend/game/services/session_player.py` 기준:

- `bind_room_player(request, player)`
- `get_current_room_player(request, room)`
- `unbind_room_player(request, room)`

현재 동작:

- create/join 성공 시 session의 `room_player_ids`에 `{room_code: room_player_id}` 저장.
- ready/settings/leave/kick/start API에서 session을 보고 현재 요청자의 `RoomPlayer`를 조회.

### 1.7 프론트엔드

현재 `frontend/src` 기준:

- `App.tsx`
- `api.ts`
- `screens/LobbyScreen.tsx`
- `screens/RoomScreen.tsx`
- `styles.css`

현재 프론트 연결 상태:

- 방 생성 API 연결됨.
- 방 참가 API 연결됨.
- 방 조회 API 연결됨.
- 로비/방 화면 디자인 적용됨.
- 실제 플레이 화면은 아직 없음.

## 2. 현재 수정 또는 정리가 필요한 부분

### 2.1 게임 방향 변경 반영

이전 문서와 일부 UI에는 캐치마인드식 요소가 섞여 있었습니다.

앞으로는 아래 방향으로 고정합니다.

```text
첫 문장 작성
→ 그림
→ 그림 설명 문장
→ 다시 그림
→ 결과 공개
```

우선순위가 낮아진 기능:

- 실시간 정답 제출
- 정답 판정
- 현재 그림 담당자 한 명만 그리는 캐치마인드식 라운드
- 점수 중심 게임 진행

우선순위가 높아진 기능:

- `GameChain`
- `GameTurn`
- 작성자 익명 처리
- 결과 공개 시 작성자 공개
- Drawing replay

### 2.2 참가자 식별 방식 보강 필요

현재 create/join API는 `RoomPlayer`를 만들고 session에 `room_code -> room_player_id`를 저장합니다.

남은 작업:

- Discord 로그인 사용자는 session의 `discord_user_id`로 식별
- `RoomPlayer.discord_user` 연결
- session 만료/유효하지 않은 player id 처리 테스트
- 여러 방에 동시에 참가했을 때 동작 확인

MVP에서는 session 기반을 우선 권장합니다. Discord 로그인을 해도 방 참가 단위의 권한 검사는 `RoomPlayer` 기준으로 해야 합니다.

### 2.3 Discord 로그인 현황

Discord OAuth 로그인의 핵심 모델과 로그인/콜백 API가 구현되었습니다.

추가 필요 (구현 완료):

- ~~현재 로그인 사용자 조회 API~~
- ~~로그아웃 API~~
- ~~`RoomPlayer.discord_user` 연결~~

정책:

- Activity는 구현하지 않습니다.
- OAuth scope는 우선 `identify`만 사용합니다.
- 이메일은 요청하지 않습니다.
- 로그인 성공 시 Django session에 `discord_user_id`를 저장합니다.
- 게스트 닉네임 참가도 당분간 유지합니다.
- Discord 로그인 상태에서 방 생성/참가 시 `nickname`이 없으면 Discord `global_name` 또는 `username`을 기본 닉네임으로 사용합니다.

필요 환경 변수:

```text
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
DISCORD_REDIRECT_URI
FRONTEND_BASE_URL
```

### 2.4 Room 설정 필드 현황

현재 `Room`에 아래 필드는 추가되었습니다.

- `draw_time`
- `write_time`
- `updated_at`

정확한 현재 상태:

- `draw_time`: 구현됨
- `write_time`: 구현됨
- `updated_at`: 구현됨
- `rounds`: 미구현
- `word_pack`: 미구현

갈틱폰식 릴레이에서는 `rounds`를 직접 받기보다 기본적으로 참가자 수만큼 턴을 돌리는 방식도 가능합니다. 그래서 `rounds`는 필수는 아니고, `word_pack`도 첫 문장을 사용자가 직접 쓰는 구조라면 우선순위가 낮습니다.

### 2.5 게임 시작 API 구현됨

`POST /api/rooms/{room_code}/start/`가 구현되었습니다.

- 방장 권한 검사
- 최소 인원 검사
- 방장을 제외한 참가자 준비 상태 검사
- `Room.status = playing`
- `GameSession` 생성
- 참가자별 `GameChain` 생성
- 참가자별 첫 문장용 `GameTurn` 생성
- `DEFAULT_PROMPTS`에서 `random.sample()`로 참가자별 기본 문장을 중복 없이 선택
- 선택한 기본 문장을 첫 `GameTurn.text`에 저장

현재 서비스 파일:

- `backend/game/services/game_start.py`
- `backend/game/services/default_prompts.py`

현재 `default_prompts.py`의 문장은 `"예시1"` 형태의 임시 값입니다. 기능 흐름 확인 후 실제 문장 목록으로 교체해야 합니다.

추가 정리:

- 현재 함수명은 `get_random_prompt(count)`이지만 여러 문장을 반환하므로 `get_random_prompts(count)`로 변경 권장.
- 제한 시간 종료 시 미제출 사용자의 기본 문장을 자동 확정하는 처리는 아직 미구현.

### 2.6 현재 게임 상태 조회 API 구현됨

`GET /api/games/{game_id}/state/`가 구현되었습니다.

- session에서 현재 `RoomPlayer` 조회
- 현재 `GameSession.current_turn_number`에 해당하는 본인 턴 조회
- `turn.id`, `turn.kind`, `turn.turn_number`, `time_limit`, `turn.text` 반환
- 응답에 다른 참가자의 닉네임이나 작성자 정보 미포함

추가로 필요한 보완:

- 그림 턴에서는 이전 문장을 `source.text`로 구분해서 반환
- 그림 설명 턴에서는 이전 그림 식별 정보를 반환
- 제출 완료 후 대기 상태 표현 검토

### 2.7 게임 진행 API/Serializer (구현 완료)

갈틱폰식 릴레이 모델 및 관련 API는 현재 코드에 모두 추가되었습니다.

현재 구현된 모델:

- `GameChain`
- `GameTurn`
- `DrawingReplay`


### 2.8 작성자 익명 처리 필요

게임 진행 중 API는 이전 턴의 내용만 보여주고, 작성자 정보는 숨겨야 합니다.

서버 내부 저장:

- `GameTurn.player` 저장 필요.

진행 중 응답:

- `player`
- `nickname`
- `author`

위 필드를 내려주면 안 됩니다.

결과 조회 응답:

- 작성자 정보를 공개합니다.

### 2.9 RoomSerializer 설정 필드 반영 완료

`RoomSerializer`에 `draw_time`, `write_time`, `updated_at`이 포함되어 있습니다.

현재 필드:

```python
fields = [
    "id",
    "code",
    "status",
    "max_players",
    "draw_time",
    "write_time",
    "created_at",
    "updated_at",
    "players",
]
```

이 작업을 하지 않으면 settings API로 값을 변경해도 프론트 응답에서 바로 확인하기 어렵습니다.

### 2.9 Admin 등록 필요

`backend/game/admin.py`에 모델 등록이 필요합니다.

현재 모델:

- `Room`
- `RoomPlayer`
- `GameSession`
- `GameChain`
- `GameTurn`
- `DrawingReplay`

추가 예정 모델:

- `DiscordUser`
- `ChatMessage`

### 2.10 의존성 파일 부재

현재 프로젝트 루트 또는 `backend/`에 Python 의존성 파일이 없습니다.

추가 권장:

- `requirements.txt`

최소 항목:

- `Django`
- `djangorestframework`
- `drf-spectacular`

추후 항목:

- `channels`
- `channels-redis`
- `requests` 또는 `httpx`

Discord OAuth를 직접 구현한다면 `requests` 또는 `httpx`가 필요합니다. `django-allauth` 같은 패키지를 쓰는 방법도 있지만, 현재 프로젝트 규모에서는 직접 OAuth code exchange를 구현하는 편이 이해하기 쉽습니다.

### 2.11 OpenAPI 제목 정리

현재 `SPECTACULAR_SETTINGS["TITLE"]`은 `Mini Drawing Game API`입니다.

권장:

```python
SPECTACULAR_SETTINGS = {
    "TITLE": "DrawBuddy API",
    "DESCRIPTION": "갈틱폰식 글/그림 릴레이 게임 API",
    "VERSION": "1.0.0",
}
```

## 3. 모델 구현 순서

### 3.1 Discord 로그인 모델 (구현 완료)

추가된 모델:

```text
DiscordUser
```

권장 필드:

```text
discord_id unique
username
global_name
avatar_hash
avatar_url
created_at
updated_at
```

`RoomPlayer`에는 아래 필드를 추가합니다.

```text
discord_user nullable ForeignKey(DiscordUser)
```

주의:

- Discord 사용자가 여러 방에 참가할 수 있으므로 `DiscordUser`와 `RoomPlayer`는 1:N 관계입니다.
- 한 방 안에서는 같은 Discord 사용자가 중복 참가하지 못하게 하는 제약을 고려합니다.
- 게스트 사용자는 `discord_user = null`입니다.

### 3.2 현재 모델 안정화

1. `RoomSerializer` 설정 필드 추가 완료
   - `draw_time`
   - `write_time`
   - `updated_at`
2. `RoomPlayer.discord_user` 추가
3. session 기반 참가자 식별 테스트 추가
4. 같은 방 안에서 닉네임 중복 방지 제약 검증
5. 같은 방 안에서 Discord 사용자 중복 참가 방지 정책 검토
6. 필요 시 추가 migration 생성
7. migration 적용

명령:

```bash
conda activate ex
cd backend
python manage.py makemigrations game
python manage.py migrate
```

현재 생성된 최신 migration:

```text
backend/game/migrations/0006_gamesession_current_turn_number_and_more.py
```

현재 `game` 앱 migration은 `0006`까지 적용된 상태입니다.

`0005`에는 아래 변경이 들어 있습니다.

- `Room.draw_time`
- `Room.write_time`
- `Room.updated_at`
- `RoomPlayer.unique_room_nickname`

`0006`에는 아래 변경이 들어 있습니다.

- `GameSession.current_turn_number`
- `GameSession.finished_at`
- `GameSession.status` choices 변경
- `GameChain`
- `GameTurn`
- `DrawingReplay`
- `GameTurn.unique_chain_turn_number`

### 3.3 갈틱폰식 릴레이 모델

현재 구현된 모델:

```text
GameChain
GameTurn
DrawingReplay
```

`GameChain` 역할:

- 한 사람이 시작한 첫 문장에서 출발한 결과 앨범 하나.

`GameTurn` 역할:

- 각 체인 안의 한 단계 제출물.
- `prompt`, `drawing`, `guess` 중 하나.

`DrawingReplay` 역할:

- 그림을 이미지가 아니라 선 이벤트 로그로 저장.
- 결과 화면에서 그림 과정을 재생.

## 4. REST API 구현 순서

### 4.0 현 시점 추천 순서

갈틱폰식 게임 모델, 게임 시작 API, 현재 게임 상태 조회 API까지 구현되었습니다. 이제 첫 문장 제출부터 순서대로 진행합니다.

진행 상황: (전부 구현 완료)

1. ~~`POST /api/games/{game_id}/turns/{turn_id}/prompt/`~~ (구현 완료)
2. ~~모든 참가자의 첫 문장 제출 완료 여부 검사~~ (구현 완료)
3. ~~후속 턴 배정 service 함수 작성~~ (구현 완료)
4. ~~첫 그림 턴 생성~~ (구현 완료)
5. ~~그림 턴의 `state` 응답에 작성자 없는 `source.text` 추가~~ (구현 완료)
6. ~~`POST /api/games/{game_id}/turns/{turn_id}/guess/`~~ (구현 완료)
7. ~~`POST /api/games/{game_id}/turns/{turn_id}/drawing/complete/`~~ (구현 완료)
8. ~~`GET /api/games/{game_id}/results/`~~ (구현 완료)
9. ~~`GET /api/replays/{replay_id}/`~~ (구현 완료)

### 4.1 Discord 로그인 API

1. `GET /api/auth/me/` (구현 완료)
   - 현재 session의 Discord 로그인 사용자 조회 완료.
   - 비로그인 상태면 `{"user": null}` 반환 처리 완료.

2. `GET /api/auth/discord/login/`
   - Discord authorize URL로 redirect.
   - `state` 생성 후 session에 저장.
   - `next` query parameter를 session에 저장.

3. `GET /api/auth/discord/callback/` (구현 완료)
   - Discord에서 받은 `code`, `state` 검증.
   - Discord token endpoint에 code 교환.
   - Discord user endpoint에서 프로필 조회.
   - `DiscordUser` 생성 또는 갱신.
   - session에 `discord_user_id` 저장.
   - 프론트 URL로 redirect.

4. `POST /api/auth/logout/` (구현 완료)
   - session 만료 및 `discord_user_id` 제거 처리 완료.

### 4.2 Room API 보강

1. `PATCH /api/rooms/{room_code}/settings/`
   - 방장만 가능.
   - `waiting` 상태에서만 가능.
   - `draw_time`, `write_time` 수정.
   - 현재 view/serializer 구현됨.
   - `RoomSerializer` 설정 필드 반영 완료.

2. `PATCH /api/rooms/{room_code}/ready/`
   - 본인 준비 상태 변경.
   - 방장은 준비 예외로 둘지 정책 결정 필요.
   - 현재 view/serializer 구현됨.

3. `POST /api/rooms/{room_code}/leave/`
   - 일반 참가자 퇴장.
   - 방장 퇴장 시 다음 참가자에게 방장 위임.
   - 참가자가 0명이면 방 삭제 또는 종료.
   - 현재 구현됨.

4. `POST /api/rooms/{room_code}/start/`
   - 방장만 가능.
   - 최소 참가자 수 확인.
   - 준비 상태 확인.
   - `Room.status = playing`
   - `GameSession`, `GameChain`, 첫 `GameTurn` 생성.
   - 현재 구현됨.

5. `POST /api/rooms/{room_code}/players/{player_id}/kick/`
   - 방장만 가능.
   - 대기 중인 방에서만 가능.
   - 현재 구현됨.

추가 수정:

- `POST /api/rooms/`
  - Discord 로그인 상태에서는 `RoomPlayer.discord_user`를 연결.
  - `nickname`이 없으면 Discord 프로필 이름을 기본값으로 사용.

- `POST /api/rooms/{room_code}/join/`
  - Discord 로그인 상태에서는 같은 방에 같은 Discord 사용자가 이미 참가했는지 확인.
  - 게스트는 기존 닉네임 중복 검사를 유지.

### 4.3 게임 진행 API

1. `GET /api/games/{game_id}/state/`
   - 현재 플레이어가 해야 할 작업 반환.
   - 작성자 정보 숨김.
   - 현재 구현됨.

2. `POST /api/games/{game_id}/turns/{turn_id}/prompt/`
   - 첫 문장 제출.
   - 현재 구현됨.
   - 사용자가 입력하지 못한 경우 서버에 미리 저장된 랜덤 기본 문장을 사용할 예정.

3. `POST /api/games/{game_id}/turns/{turn_id}/guess/` (구현 완료)
   - 그림 보고 설명 문장 제출.
   - 제출 완료 시 다음 턴 자동 생성 로직 연동 완료.

4. `POST /api/games/{game_id}/turns/{turn_id}/drawing/complete/` (구현 완료)
   - 그림 제출 완료 처리.
   - 실제 선 이벤트는 향후 WebSocket으로 저장 예정 (현재는 API로 수신 완료 처리).

5. 턴 전환 처리 (구현 완료)
   - 모든 참가자가 현재 턴을 제출했는지 확인 (`turn_manager.py`).
   - 백트래킹 알고리즘을 활용하여 참가자가 이전에 참여했던 체인(릴레이)과 겹치지 않도록 무작위로 다음 턴을 배정.
   - 마지막 턴이면 결과 공개 상태로 변경.

### 4.4 결과 API

1. `GET /api/games/{game_id}/results/` (구현 완료)
   - 모든 체인과 턴 반환.
   - 이 API에서만 작성자 공개.

2. `GET /api/replays/{replay_id}/` (구현 완료)
   - 그림 리플레이 이벤트 반환.

## 5. WebSocket 구현 순서

### 5.1 Channels 기본 설정

1. `channels` 설치.
2. `INSTALLED_APPS`에 `channels` 추가.
3. `ASGI_APPLICATION` 설정.
4. `routing.py` 추가.
5. 개발 단계에서는 InMemory channel layer로 시작 가능.
6. 배포 또는 멀티 프로세스 환경에서는 Redis 필요.

### 5.2 로비 WebSocket

Endpoint:

```text
/ws/rooms/{room_code}/
```

이벤트:

- `chat_message`
- `player_joined`
- `player_left`
- `player_ready_changed`
- `room_settings_changed`
- `game_started`

정책:

- 로비 채팅은 허용.
- MVP에서는 DB 저장 없이 실시간 전달만 가능.

### 5.3 게임 진행 WebSocket

Endpoint:

```text
/ws/games/{game_id}/
```

이벤트:

- `draw_line`
- `canvas_cleared`
- `turn_finished`

정책:

- 게임 진행 중 일반 채팅은 비활성.
- 그림 이벤트는 다른 참가자에게 실시간 공개하지 않는 것을 기본값으로 함.
- 서버는 이벤트를 `DrawingReplay.events`에 저장.
- 서버가 timestamp를 찍는 것을 권장.

### 5.4 결과 WebSocket

Endpoint:

```text
/ws/games/{game_id}/results/
```

이벤트:

- `result_chat_message`
- `result_reveal_started`
- `result_reveal_step_changed`

정책:

- 결과 화면 채팅은 허용.
- 결과 공개 순서 동기화가 필요하면 `result_reveal_step_changed`를 사용.

## 6. 프론트엔드 화면 추가 순서

현재 있음:

- `LobbyScreen`
- `RoomScreen`

추가 필요:

1. 로그인 UI
   - Discord 로그인 버튼.
   - 게스트 닉네임 입력 유지.
   - 로그인 상태면 Discord 이름/아바타 표시.
2. `PromptScreen`
   - 첫 문장 작성.
3. `DrawingScreen`
   - Canvas 그림.
   - 선 이벤트를 WebSocket으로 전송.
4. `GuessScreen`
   - 그림을 보고 설명 문장 작성.
5. `WaitingScreen`
   - 다른 참가자 제출 대기.
6. `ResultScreen`
   - 결과 앨범 공개.
   - 작성자 공개.
   - 리플레이 재생.
   - 결과 채팅.

## 7. Swagger 노출 체크리스트

현재 Swagger 노출됨:

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
- `POST /api/games/{game_id}/turns/{turn_id}/guess/`
- `POST /api/games/{game_id}/turns/{turn_id}/drawing/complete/`
- `GET /api/games/{game_id}/results/`
- `GET /api/replays/{replay_id}/`
- `GET /api/health/`
- `GET /api/auth/me/`
- `GET /api/auth/discord/login/`
- `GET /api/auth/discord/callback/`
- `POST /api/auth/logout/`

권장 Serializer:

- `DiscordUserSerializer`
- `AuthMeResponseSerializer`
- `RoomSettingsSerializer`
- `ReadyUpdateSerializer`
- `RoomLeaveResponseSerializer`
- `GameStartResponseSerializer`
- `GameStateResponseSerializer`
- `PromptSubmitSerializer`
- `GuessSubmitSerializer`
- `DrawingCompleteSerializer`
- `GameResultSerializer`
- `DrawingReplaySerializer`

## 8. 가장 가까운 다음 작업

현재 게임 사이클인 턴 제출 로직 및 결과, 리플레이, 인증 API 등 **백엔드 REST API 전체 개발이 완료**되었습니다.

~~1. 모든 참가자의 첫 문장 제출 완료 여부 검사 로직~~ (완료)
~~2. 후속 턴 배정 service 함수 작성~~ (완료: 백트래킹 알고리즘을 통한 겹치지 않는 랜덤 턴 배정 적용)
~~3. 첫 그림 턴 생성~~ (완료)
~~4. 그림 턴의 `state` 응답에 작성자 없는 `source.text` 추가~~ (완료)
~~5. `POST /api/games/{game_id}/turns/{turn_id}/drawing/complete/` (그림 제출 완료)~~ (완료)
~~6. `POST /api/games/{game_id}/turns/{turn_id}/guess/` (그림 설명 제출 API)~~ (완료)
~~7. Guess 턴 `state` 응답에 `source_replay_id` 추가~~ (완료)
~~8. `GET /api/replays/{replay_id}/` (그림 리플레이 데이터 조회 API)~~ (완료)
~~9. `GET /api/games/{game_id}/results/` (게임 결과 앨범 조회 API)~~ (완료)
~~10. Discord 로그인 관련 추가 API (`/api/auth/me/`, `/api/auth/logout/`)~~ (완료)

1. 프론트엔드 API 연동 (인게임 화면 UI 마이그레이션 완료, 실제 데이터 Fetch 연결 진행 중)
2. WebSocket 채널 연결 (채팅 및 실시간 턴 동기화)

## 9. 구현 시 주의사항

- 게임 진행 중에는 작성자 정보를 응답에 포함하지 않습니다.
- 결과 조회 API에서만 작성자를 공개합니다.
- 채팅은 로비와 결과 화면에서만 허용합니다.
- 게임 진행 중 채팅은 MVP에서 제외합니다.
- Discord Activity는 구현 범위에서 제외합니다.
- Discord OAuth secret은 프론트에 노출하지 않습니다.
- Discord access token은 session 인증에 꼭 필요하지 않으면 저장하지 않습니다.
- 그림 리플레이는 PNG/영상 저장이 아니라 좌표 이벤트 저장으로 구현합니다.
- 점수는 현재 모델에 있지만, 릴레이 MVP의 핵심 기능은 아닙니다.
- 클라이언트가 보낸 `player_id`, `is_host`, `score` 값을 권한 판단에 사용하지 않습니다.
- 방장 권한, 준비 상태, 턴 소유권은 서버에서 검증합니다.

## 10. 운영 안정성 TODO

### 10.1 방 코드 충돌 재시도

현재 상태:

- `Room.code`에 `unique=True`가 적용되어 있어 DB 중복 저장은 차단됨.
- `generate_room_code()`가 기존 코드 중복 여부를 검사함.

추가 구현:

1. 방 생성 시 발생 가능한 `IntegrityError` 처리.
2. 코드 충돌 시 새로운 방 코드를 생성해서 재시도.
3. 무한 반복을 방지하기 위한 최대 재시도 횟수 설정.
4. 충돌 재시도 테스트 추가.

### 10.2 비정상 종료 처리

문제:

- 브라우저 강제 종료 또는 인터넷 단절 시 `/leave/`가 호출되지 않을 수 있음.
- 현재 REST API만으로는 연결 종료를 즉시 감지할 수 없음.
- 오래된 `Room`, `RoomPlayer`, 게임 데이터가 DB에 남을 수 있음.

MVP 추가 구현:

1. `cleanup_stale_rooms` Django management command 추가.
2. `Room.updated_at` 기준으로 오래된 방 삭제.
3. 운영 환경에서 cron 또는 scheduler로 주기 실행.
4. 삭제 대상과 삭제 결과 로그 기록.

권장 초기 기준:

- `waiting`: 마지막 수정 후 6시간.
- `playing`: 마지막 수정 후 24시간.
- `finished`: 결과 보관 정책에 따라 7일.

WebSocket 도입 후 추가 구현:

1. WebSocket `disconnect` 이벤트 처리.
2. 재접속 유예 시간 적용.
3. heartbeat 기반 접속 상태 확인.
4. `RoomPlayer.last_seen_at` 추가 검토.
5. 멀티 프로세스 환경에서는 실시간 접속 상태를 Redis에 저장.

주의:

- 연결이 끊겼다고 즉시 `RoomPlayer`를 삭제하지 않습니다.
- heartbeat마다 DB를 갱신하면 쓰기 부하가 증가하므로 DB 반영 주기를 제한합니다.
