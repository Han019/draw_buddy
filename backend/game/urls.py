from django.urls import path
from . import views
from .views import (DiscordCallbackAPIView, DiscordLoginAPIView, GameStateAPIView, RoomStartAPIView, RoomCreateAPIView, RoomDetailAPIView, RoomJoinAPIView, 
RoomKickAPIView, RoomReadyAPIView, RoomSettingsAPIView, RoomLeaveAPIView
)
urlpatterns=[

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
    # path("games/<int:game_id>/turns/<int:turn_id>/prompt/",name='')

    #discord관련
    path('auth/discord/login/',DiscordLoginAPIView.as_view(),name = 'discord-login'),
    path('auth/discord/callback/',DiscordCallbackAPIView.as_view(),name = 'discord-callback'),

]
