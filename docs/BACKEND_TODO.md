# DrawBuddy Backend TODO

작성 기준일: 2026-05-26

이 문서는 현재 `backend/` 코드 기준으로 확인된 구현 상태, 오류, REST API 구현 순서, Channels/WebSocket 추가 순서, Swagger 노출 체크리스트를 정리합니다.

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

이미 `5173` 포트를 사용 중이면 Vite가 `5174`, `5175`처럼 다음 포트로 자동 실행할 수 있습니다. 프론트에서 백엔드 API를 호출할 때는 `http://127.0.0.1:8000/api/...`를 직접 쓰지 않고 `/api/...`를 사용합니다. 그래야 Vite proxy를 통해 Django 서버로 전달됩니다.

### 서버 정상 종료

서버를 실행 중인 터미널에서 아래 키를 누릅니다.

```text
Ctrl + C
```

백엔드와 프론트엔드는 각각 실행한 터미널에서 따로 종료해야 합니다.

### 포트가 계속 잡혀 있을 때 확인

터미널을 닫았는데도 서버가 남아 있으면 아래 명령으로 확인합니다.

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:5174 -sTCP:LISTEN
lsof -nP -iTCP:5175 -sTCP:LISTEN
```

출력의 `PID` 값을 확인한 뒤 종료합니다.

```bash
kill <PID>
```

예시:

```bash
kill 12345
```

그래도 종료되지 않을 때만 마지막 수단으로 강제 종료합니다.

```bash
kill -9 <PID>
```

## 1. 현재 코드 기준 이미 구현된 부분

### Django 프로젝트 구조

현재 확인된 구조:

```text
backend/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
└── game/
    ├── models.py
    ├── views.py
    ├── urls.py
    ├── admin.py
    └── migrations/
```

### 설정

- `game` 앱이 `INSTALLED_APPS`에 등록되어 있습니다.
- `rest_framework`가 `INSTALLED_APPS`에 등록되어 있습니다.
- `drf_spectacular`가 `INSTALLED_APPS`에 등록되어 있습니다.
- `REST_FRAMEWORK["DEFAULT_SCHEMA_CLASS"]`가 `drf_spectacular.openapi.AutoSchema`로 설정되어 있습니다.
- SQLite DB를 사용합니다.
- `django.contrib.sessions.middleware.SessionMiddleware`가 등록되어 있어 session 기반 MVP 구현이 가능합니다.

### Swagger / OpenAPI URL

현재 `backend/config/urls.py` 기준으로 아래 URL은 의도한 형태로 연결되어 있습니다.

| URL | View | 상태 |
| --- | --- | --- |
| `/api/schema/` | `SpectacularAPIView` | 구현됨 |
| `/api/docs/` | `SpectacularSwaggerView` | 구현됨 |
| `/api/redoc/` | `SpectacularRedocView` | 구현됨 |

### 현재 모델 초안

`backend/game/models.py`에 아래 모델 초안이 있습니다.

- `Room`
- `GameSession`
- `RoomPlayer`

현재 `related_name` 상태:

- `RoomPlayer.room`: `related_name="players"`
- `GameSession.room`: `related_name="games"`

따라서 이전에 발생했던 `related_name="players"` 중복으로 인한 Django reverse accessor 충돌은 현재 코드에는 남아 있지 않습니다.

### 현재 API

`backend/game/views.py`:

- `index(request)`가 `"game start"` 문자열을 반환합니다.

`backend/game/urls.py`:

- `GET /api/`가 `index`에 연결되어 있습니다.

MVP에서 필요한 방 생성/참가/조회 API는 아직 없습니다.

## 2. 오류 또는 수정이 필요한 부분

### 최우선 수정 사항

1. Python 의존성 실행 환경 정리

현재 전역 Python에서 `python manage.py check`를 실행하면 아래 오류로 중단됩니다.

```text
ModuleNotFoundError: No module named 'rest_framework'
```

`conda`의 `ex` 환경에서는 `djangorestframework`, `drf-spectacular`, `Django`가 설치되어 있으며 아래 명령은 통과합니다.

```text
conda run -n ex python manage.py check
```

정리 필요:

- `requirements.txt` 또는 `pyproject.toml` 추가
- 팀 공통 실행 방법 명시
- 최소 의존성 명시
  - `Django`
  - `djangorestframework`
  - `drf-spectacular`
  - 추후 `channels`, `channels-redis`

2. 모델 변경 후 migration 생성 및 적용

이번 확인에서 아래 모델 오류는 수정되었습니다.

- `GameSession.started_at = models.DateTimeField(auto_now_add=True)`
- `RoomPlayer.__str__`의 `self.room.code` 참조
- `RoomPlayer.is_host`
- `RoomPlayer.score`
- `RoomPlayer.joined_at`

이제 실제 DB 사용 전 migration이 필요합니다.

```text
conda run -n ex python manage.py makemigrations game
conda run -n ex python manage.py migrate
```

3. Room 모델/API 필드명 정리

### 모델 필드 정리 상태

아래 Room 필드명은 현재 코드에서 API 응답 이름과 동일하게 정리되었습니다.

| 현재 필드 | 상태 |
| --- | --- |
| `Room.code` | 정리됨 |
| `Room.max_players` | 정리됨 |
| `Room.created_at` | 정리됨 |

### MVP에 필요한 모델 필드 추가

`Room`에 추가 권장:

- `rounds`
- `draw_time`
- `word_pack`
- `updated_at`

`RoomPlayer`에 추가 권장:

- 현재 `is_host`, `score`, `joined_at`은 모델에 추가됨
- migration 생성 및 적용 필요

`GameSession`에 추가 권장:

- `round_number`
- `finished_at`

### Migration 상태

- `backend/game/migrations/`에는 `__init__.py`만 있습니다.
- SQLite DB에는 Django 기본 auth/session/admin 테이블만 있고, `game` 앱 테이블은 없습니다.

수정 필요:

```text
python manage.py makemigrations game
python manage.py migrate
```

단, 먼저 모델 오류와 의존성 문제를 해결해야 합니다.

### Admin 등록 필요

`backend/game/admin.py`는 비어 있습니다.

개발 중 확인 편의를 위해 아래 모델 등록을 권장합니다.

- `Room`
- `RoomPlayer`
- `GameSession`

### 개발 서버 연동 설정 검토

React/Vite를 별도 포트에서 실행할 예정이면 아래 중 하나가 필요합니다.

- Vite dev proxy로 `/api`와 `/ws`를 Django 서버로 프록시
- `django-cors-headers` 추가 및 credential 포함 CORS 설정
- CSRF 처리 정책 정리

MVP에서는 Vite proxy를 우선 권장합니다.

## 3. REST API 구현 순서

### 1단계: 실행 환경과 모델 안정화

1. 의존성 파일 추가
2. `python manage.py check` 통과
3. 모델 필드명과 오타 정리
4. `RoomPlayer`의 `is_host`, `score`, `joined_at` migration 반영
5. `Room`에 `rounds`, `draw_time`, `word_pack` 추가
6. migration 생성 및 적용
7. admin 등록

### 2단계: Serializer 추가

권장 파일:

```text
backend/game/serializers.py
```

권장 Serializer:

- `ErrorResponseSerializer`
- `RoomPlayerSerializer`
- `RoomSettingsSerializer`
- `RoomDetailSerializer`
- `RoomCreateSerializer`
- `RoomJoinSerializer`
- `ReadyUpdateSerializer`
- `GameSessionSerializer`
- `GameStartResponseSerializer`
- `LeaveRoomResponseSerializer`

### 3단계: RoomViewSet 추가

권장 파일:

```text
backend/game/views.py
```

권장 ViewSet:

```text
RoomViewSet
```

구현 순서:

1. `POST /api/rooms/`
   - 방 코드 생성
   - `Room` 생성
   - 방장 `RoomPlayer` 생성
   - session에 참가자 정보 저장
2. `POST /api/rooms/{room_code}/join/`
   - 방 존재 확인
   - `waiting` 상태 확인
   - 정원 확인
   - 닉네임 중복 확인
   - 일반 `RoomPlayer` 생성
   - session에 참가자 정보 저장
3. `GET /api/rooms/{room_code}/`
   - 방 상태 반환
   - 참가자 목록 반환
   - 현재 session 참가자 반환
4. `PATCH /api/rooms/{room_code}/ready/`
   - session 참가자 확인
   - `waiting` 상태 확인
   - 본인 `is_ready` 변경
5. `PATCH /api/rooms/{room_code}/settings/`
   - session 참가자 확인
   - 방장 권한 확인
   - `waiting` 상태 확인
   - 설정 값 검증 후 저장
6. `POST /api/rooms/{room_code}/start/`
   - session 참가자 확인
   - 방장 권한 확인
   - 최소 인원 확인
   - 일반 참가자 전원 ready 확인
   - `Room.status = "playing"`
   - `GameSession` 생성
7. `POST /api/rooms/{room_code}/leave/`
   - session 참가자 확인
   - 참가자 삭제 또는 비활성 처리
   - 방장 퇴장 정책 적용

### 4단계: URL 라우팅 정리

권장 파일:

```text
backend/game/urls.py
```

권장 방식:

- DRF `DefaultRouter` 또는 `SimpleRouter` 사용
- `RoomViewSet` lookup field는 `code`로 설정
- URL path는 프론트 명세에 맞춰 `/api/rooms/{room_code}/` 형태로 노출

### 5단계: 결과 조회 API 준비

추후 구현:

- `GET /api/games/{game_id}/results/`

이 API는 아래 모델이 추가된 뒤 구현하는 것이 좋습니다.

- `Round`
- `DrawingStroke` 또는 canvas snapshot 저장 모델
- `AnswerSubmission`
- `ScoreEvent`

## 4. Channels/WebSocket 추가 순서

현재 Channels는 구현되어 있지 않습니다. REST API가 먼저 안정화된 뒤 추가합니다.

### 1단계: 의존성 및 설정

1. `channels` 설치
2. `INSTALLED_APPS`에 `channels` 추가
3. `ASGI_APPLICATION = "config.asgi.application"` 설정
4. 개발용 channel layer 설정
   - MVP 초기는 InMemory channel layer 가능
   - 다중 프로세스/배포 전에는 Redis channel layer 필요

### 2단계: ASGI 라우팅

권장 추가 파일:

```text
backend/game/routing.py
```

권장 endpoint:

```text
/ws/rooms/{room_code}/
```

### 3단계: Consumer 추가

권장 추가 파일:

```text
backend/game/consumers.py
```

권장 Consumer:

```text
RoomConsumer
```

구현 순서:

1. 방 코드 검증
2. session 기반 참가자 검증
3. room group join
4. `chat_message` 처리
5. REST API 성공 후 WebSocket 브로드캐스트 연결
   - `player_joined`
   - `player_left`
   - `player_ready_changed`
   - `room_settings_changed`
   - `game_started`
6. 게임 중 이벤트 추가
   - `draw_line`
   - `canvas_cleared`
   - `answer_submitted`
   - `round_finished`

### 4단계: 권한 검증

WebSocket에서도 REST API와 동일하게 서버 검증이 필요합니다.

- 현재 방 참가자인지 확인
- 현재 그림 담당자만 `draw_line` 허용
- 현재 그림 담당자만 `canvas_cleared` 허용
- 정답 검사는 서버에서만 수행
- 점수는 서버에서만 변경

## 5. Swagger에 노출할 API 체크리스트

### Swagger 기본 설정

- [x] `drf_spectacular` 설치 대상으로 등록됨
- [x] `DEFAULT_SCHEMA_CLASS` 설정됨
- [x] `/api/schema/` URL 연결됨
- [x] `/api/docs/` URL 연결됨
- [x] `/api/redoc/` URL 연결됨
- [ ] 의존성 설치 후 Swagger UI 실제 접속 확인
- [ ] `SPECTACULAR_SETTINGS["TITLE"]`을 `DrawBuddy API`로 변경

### 최소 MVP REST API

- [ ] `POST /api/rooms/`
- [ ] `POST /api/rooms/{room_code}/join/`
- [ ] `GET /api/rooms/{room_code}/`
- [ ] `PATCH /api/rooms/{room_code}/ready/`
- [ ] `POST /api/rooms/{room_code}/start/`

### 로비 완성 REST API

- [ ] `PATCH /api/rooms/{room_code}/settings/`
- [ ] `POST /api/rooms/{room_code}/leave/`

### 추후 확장 REST API

- [ ] `GET /api/games/{game_id}/results/`

### Serializer 문서화

- [ ] Request serializer 지정
- [ ] Response serializer 지정
- [ ] Error response serializer 지정
- [ ] `@extend_schema(summary=...)` 추가
- [ ] `@extend_schema(description=...)` 추가
- [ ] 각 오류 status code 예시 추가

### Swagger 문서 품질 기준

- [ ] 닉네임 한글 허용 조건 문서화
- [ ] 방장 권한 필요 API 문서화
- [ ] session 기반 참가자 식별 정책 문서화
- [ ] 방 상태 `waiting`, `playing`, `finished` 문서화
- [ ] `ROOM_FULL`, `NICKNAME_TAKEN`, `PLAYERS_NOT_READY` 등 공통 오류 코드 문서화
- [ ] WebSocket 이벤트는 Swagger가 아닌 별도 문서에 유지

## 6. 권장 커밋 단위

1. 문서 추가
   - `docs/API_SPEC.md`
   - `docs/BACKEND_TODO.md`
2. 의존성 및 실행 오류 수정
3. 모델 필드 정리와 migration
4. Room 생성/참가/조회 API
5. Ready/settings/start/leave API
6. Swagger 문서 보강
7. Channels 로비 이벤트
8. 게임 라운드/그림/정답 기능
