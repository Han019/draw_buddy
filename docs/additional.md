# DrawBuddy MVP 프론트엔드 API 연동 현황 정리

이 문서는 `mvp_frontend`의 Express 목업 서버 코드와 실제 백엔드(Django) API 명세서를 비교하여, 프론트엔드에서 연동해야 할 API 현황을 요약한 문서입니다.

## 1. 현재 `mvp_frontend` 내 자체 구현된 API (임시 목업)

현재 구글 스티치를 통해 구성된 `mvp_frontend/server.ts` 파일 내부에는 프론트엔드 구동 테스트를 위한 최소한의 API 2개만 구현되어 있습니다.

| Method | Endpoint | 기능 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | 헬스체크 및 백엔드 실행 상태 확인 (`{ status: "ok" }` 반환) |
| `POST` | `/api/echo` | 전달받은 데이터를 그대로 다시 반환하는 테스트용 API |

> 💡 **참고**: 실제 앱 구동 시에는 Vite Proxy 등을 거쳐 아래의 실제 Django 백엔드 API들로 요청이 전달되어야 합니다.

---

## 2. 실제 백엔드에 구현되어 프론트에서 **즉시 연동해야 할 API**

현재 백엔드(`backend/game/urls.py`)에 개발이 완료되어, 프론트엔드 화면(로비, 방 입장 등)에서 바로 호출하고 연동해야 하는 API들입니다.

### 2.0 시스템 공통
| Method | Endpoint | 기능 설명 |
| --- | --- | --- |
| `GET` | `/api/health/` | 백엔드 서버 상태 헬스체크 (Render 등 유지 목적) |

### 2.1 인증/로그인 관련 (일부 구현됨)
| Method | Endpoint | 기능 설명 |
| --- | --- | --- |
| `GET` | `/api/auth/discord/login/` | Discord OAuth 로그인 시작 (리다이렉트) |
| `GET` | `/api/auth/discord/callback/` | Discord OAuth 로그인 콜백 처리 |
| `GET` | `/api/auth/me/` | 현재 로그인 중인 사용자 프로필 조회 |
| `POST` | `/api/auth/logout/` | 로그아웃 처리 |

### 2.2 방(Room) & 로비 관련 (프론트 연동 완료)
| Method | Endpoint | 기능 설명 |
| --- | --- | --- |
| `POST` | `/api/rooms/` | 방 생성 및 방장으로 참가 |
| `GET` | `/api/rooms/{room_code}/` | 방 상세 정보 및 참가자 목록 조회 |
| `POST` | `/api/rooms/{room_code}/join/` | 방 코드를 통한 방 참가 |
| `PATCH` | `/api/rooms/{room_code}/ready/` | 본인의 게임 준비 상태 토글 |
| `PATCH` | `/api/rooms/{room_code}/settings/` | 방 설정 (그림/작성 시간 등) 변경 (방장 전용) |
| `POST` | `/api/rooms/{room_code}/leave/` | 참가 중인 방 나가기 |
| `POST` | `/api/rooms/{room_code}/players/{player_id}/kick/` | 참가자 강퇴 (방장 전용) |
| `POST` | `/api/rooms/{room_code}/start/` | 릴레이 게임 시작 및 체인 생성 (방장 전용) |

### 2.3 게임 진행 관련 (프론트 연동 완료)
| Method | Endpoint | 기능 설명 |
| --- | --- | --- |
| `GET` | `/api/games/{game_id}/state/` | 현재 본인의 턴 상태(그려야 할지, 써야 할지) 조회 |
| `POST` | `/api/games/{game_id}/turns/{turn_id}/prompt/` | **[PromptScreen]** 첫 제시어(문장) 제출 완료 처리 (프론트 연동 완료) |
| `POST` | `/api/games/{game_id}/turns/{turn_id}/drawing/complete/`| **[DrawingScreen]** 그림(Canvas) 제출 완료 처리 (프론트 연동 완료) |
| `POST` | `/api/games/{game_id}/turns/{turn_id}/guess/` | **[GuessScreen]** 이전 그림을 보고 설명/정답 제출 처리 (프론트 연동 완료) |
| `GET` | `/api/games/{game_id}/results/` | **[ResultScreen]** 게임 종료 후, 모든 체인의 제출 앨범 및 작성자 정보 조회 (프론트 연동 완료) |
| `GET` | `/api/replays/{replay_id}/` | **[ResultScreen]** 특정 그림의 좌표 이벤트를 불러와 캔버스 리플레이 재생 (프론트 연동 완료) |

---

## 3. 백엔드와 프론트엔드 양쪽에 **앞으로 구현해야 할 WebSocket**

REST API의 개발은 완료되었습니다. 향후 추가할 실시간 기능 명세입니다.

### 3.1 실시간 웹소켓(WebSocket) 이벤트 (향후 도입)
| 프로토콜 | Endpoint | 기능 설명 |
| --- | --- | --- |
| `WS` | `/ws/rooms/{room_code}/` | 로비 실시간 채팅, 플레이어 입장/퇴장, 상태 동기화 |
| **진행 상태** | - | **구현 완료 및 프론트 연동 완료 (`RoomScreen.tsx`)** |
| `WS` | `/ws/games/{game_id}/` | 그림 그리기 실시간 이벤트 좌표 전송 및 턴 종료 알림 |
| `WS` | `/ws/games/{game_id}/results/` | 결과 화면 실시간 채팅 및 리플레이 공개 단계 동기화 |
| **진행 상태** | - | **구현 완료 및 프론트 연동 완료 (`ResultScreen.tsx`에서 로비 채널 재활용 처리)** |