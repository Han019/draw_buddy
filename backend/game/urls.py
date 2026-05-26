from django.urls import path
from . import views
from .views import RoomCreateAPIView, RoomDetailAPIView, RoomJoinAPIView

urlpatterns=[

    path("",views.index, name='index'),
    path("rooms/", RoomCreateAPIView.as_view(), name="room-create"),
    path("rooms/<str:room_code>/",RoomDetailAPIView.as_view(),name="room-detail"),
    path("rooms/<str:room_code>/join/",RoomJoinAPIView.as_view(),name="room-join"),
    
]
