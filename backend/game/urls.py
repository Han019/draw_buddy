from django.urls import path
from . import views
from .views import (DiscordCallbackAPIView, DiscordLoginAPIView, GameStateAPIView, RoomStartAPIView, RoomCreateAPIView, RoomDetailAPIView, RoomJoinAPIView, 
RoomKickAPIView, RoomReadyAPIView, RoomSettingsAPIView, RoomLeaveAPIView, HealthCheckAPIView,
PromptSubmitAPIView, DrawingCompleteAPIView, GuessSubmitAPIView, ReplayRetrieveAPIView, GameResultAPIView,
LogoutAPIView, AuthMeAPIView, CSRFTokenAPIView
)
urlpatterns=[
    #헬스 체크
    path("health/",HealthCheckAPIView.as_view(), name="health-check"),
    path("csrf/", CSRFTokenAPIView.as_view(), name="csrf-token"),
    #준비 방에서
    path("",views.index, name='index'),
    path("rooms/", RoomCreateAPIView.as_view(), name="room-create"),
    path("rooms/<str:room_code>/",RoomDetailAPIView.as_view(),name="room-detail"),
    path("rooms/<str:room_code>/join/",RoomJoinAPIView.as_view(),name="room-join"),
    path("rooms/<str:room_code>/ready/", RoomReadyAPIView.as_view(),name="room-ready"),
    path("rooms/<str:room_code>/settings/", RoomSettingsAPIView.as_view(), name='room-settings'),
    path("rooms/<str:room_code>/leave/",RoomLeaveAPIView.as_view(),name='room-leave'),
    path("rooms/<str:room_code>/players/<int:player_id>/kick/",RoomKickAPIView.as_view(), name = 'room-player-kick'),
    #게임 관련
    path("rooms/<str:room_code>/start/",RoomStartAPIView.as_view(), name="room-start"),
    path("games/<int:game_id>/state/",GameStateAPIView.as_view(), name="game-state"),
    #첫 문장 제출
    path("games/<int:game_id>/turns/<int:turn_id>/prompt/",PromptSubmitAPIView.as_view(),name='prompt-submit'),
    #그림 제출 완료
    path("games/<int:game_id>/turns/<int:turn_id>/drawing/complete/",DrawingCompleteAPIView.as_view(),name ="drawing-complete"),
    #그림 문장으로 설명
    path('games/<int:game_id>/turns/<int:turn_id>/guess/',GuessSubmitAPIView.as_view(),name="guess-submit"),
    #결과 조회
    path("games/<int:game_id>/results/", GameResultAPIView.as_view(), name="game-results"),
    #리플레이 조회
    path("replays/<int:replay_id>/", ReplayRetrieveAPIView.as_view(), name="replay-detail"),
    #discord관련
    path('auth/discord/login/',DiscordLoginAPIView.as_view(),name = 'discord-login'),
    path('auth/discord/callback/',DiscordCallbackAPIView.as_view(),name = 'discord-callback'),
    path('auth/me/', AuthMeAPIView.as_view(),name='auth-me'),
    path('auth/logout/',LogoutAPIView.as_view(),name='auth-logout'),
]
