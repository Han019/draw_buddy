from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import secrets
import string

from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


from .models import Room, RoomPlayer, RoomStatus
from .serializers import RoomCreateRequestSerializer, RoomJoinRequestSerializer, RoomSerializer


def index(request):
    return HttpResponse("game start")


def generate_room_code():
    alphabet = string.ascii_uppercase + string.digits

    while True:
        code="".join(secrets.choice(alphabet) for _ in range(6))

        if not Room.objects.filter(code=code).exists():
            return code


class RoomCreateAPIView(APIView):
    @extend_schema(
        summary = "방 생성",
        description = "새로운 게임 방을 생성하고, 생성자를 방장으로 참가시킵니다.",
        request = RoomCreateRequestSerializer,
        responses = {201: RoomSerializer},         
    )
    @transaction.atomic
    def post(self,request):
        request_serializer=RoomCreateRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        nickname = request_serializer.validated_data['nickname']
        max_players = request_serializer.validated_data["max_players"]

        room = Room.objects.create(
            code = generate_room_code(),
            max_players = max_players,
        )

        RoomPlayer.objects.create(
            room = room,
            nickname=nickname,
            is_host=True
        )

        response_serializer = RoomSerializer(room)

        return Response(
            response_serializer.data,
            status = status.HTTP_201_CREATED,
        )


class RoomDetailAPIView(APIView):
    @extend_schema(
        summary="방 정보 조회",
        description="방 코드에 해당하는 방 정보와 참가자 목록을 조회합니다.",
        responses={200: RoomSerializer},
    )
    def get(self, request, room_code):
        room = get_object_or_404(Room, code=room_code)

        serializer = RoomSerializer(room)

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


class RoomJoinAPIView(APIView):
    @extend_schema(
        summary="방 참가하는 api",
        description="방 코드에 해당하는 방 정보를 확인하고 유효하다면 참가합니다.",
        request=RoomJoinRequestSerializer,
        responses={201: RoomSerializer},
    )

    @transaction.atomic
    def post(self, request, room_code):

        request_serializer= RoomJoinRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)

        nickname=request_serializer.validated_data["nickname"]

        room = get_object_or_404(Room, code= room_code)

        if room.status !=RoomStatus.WAITING:
            return Response(
                {"detail":"이미 시작되었거나 종료된 방입니다."},
                status = status.HTTP_409_CONFLICT,
            )

        if room.players.count() >= room.max_players:
            return Response(
                {'detail':'방 인원이 가득 찼습니다.'},
                status = status.HTTP_409_CONFLICT,
            )

        if room.players.filter(nickname = nickname):
            return Response(
                {'detail':"이미 사용 중인 닉네임입니다."}, 
                status = status.HTTP_409_CONFLICT,
            )
        
        player = RoomPlayer.objects.create(
            room = room,
            nickname = nickname,
            is_host = False,
        )

        serializer = RoomSerializer(room)

        return Response(
            serializer.data,
            status = status.HTTP_201_CREATED,
        )