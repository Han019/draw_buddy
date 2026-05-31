from django.shortcuts import get_object_or_404
from django.http import HttpResponse
import secrets
import string

from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import( Room, RoomPlayer, RoomStatus,
GameSession
)

from .serializers import ( GameStateResponseSerializer, ReadyUpdateSerializer, RoomCreateRequestSerializer, RoomJoinRequestSerializer, 
RoomSerializer, RoomSettingsUpdateSerializer, GameStartResponseSerializer
)

from .services.session_player import bind_room_player, get_current_room_player, unbind_room_player
from .services.game_start import start_game

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

        player = RoomPlayer.objects.create(
            room = room,
            nickname = nickname,
            is_host = True
        )

        bind_room_player(request=request, player=player)

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
        bind_room_player(request=request, player=player)

        serializer = RoomSerializer(room)

        return Response(
            serializer.data,
            status = status.HTTP_201_CREATED,
        )

#방 준비 상태설정
class RoomReadyAPIView(APIView):

    @extend_schema(
        summary = "준비단계 설정",   
        request = ReadyUpdateSerializer,
        responses = {200: RoomSerializer},
    )

    def patch(self, request, room_code):
        room = get_object_or_404(Room, code = room_code)

        if room.status != RoomStatus.WAITING:
            return Response(
                {'detail':'대기 중인 방에서만 준비상태를 변경할 수 있습니다.'},
                status = status.HTTP_409_CONFLICT,
            )
        player = get_current_room_player(request, room)

        serializer = ReadyUpdateSerializer(data = request.data)
        serializer.is_valid(raise_exception = True)

        player.is_ready = serializer. validated_data["is_ready"]
        player.save(update_fields=["is_ready"])

        return Response(RoomSerializer(room).data)

#방 설정
class RoomSettingsAPIView(APIView):
    @extend_schema(
        summary = "방 설정 변경",
        request = RoomSettingsUpdateSerializer,
        responses = {200 : RoomSerializer},
    )

    def patch(self, request, room_code):
        room = get_object_or_404(Room, code = room_code)
        player = get_current_room_player(request, room)

        if not player.is_host:
            return Response(
                {"detail":"방장만 설정을 변경할 수 있습니다."},
                status = status.HTTP_403_FORBIDDEN,
            )
        if room.status != RoomStatus.WAITING:
            return Response(
                {"detail":"대기 중인 방에서만 설정을 변경할 수 있습니다."},
                status = status.HTTP_409_CONFLICT,
            )
        
        serializer = RoomSettingsUpdateSerializer(data = request.data)
        serializer.is_valid(raise_exception = True)

        for field, value in serializer.validated_data.items():
            setattr(room, field, value)
        
        room.save()
        return Response( RoomSerializer(room).data)

class RoomLeaveAPIView(APIView):

    @extend_schema(
        summary = "현재 세션의 RoomPlayer 삭제",
        description = "현재 세션의 참가자를 대기 중인 방에서 퇴장시킵니다.",
        request = None,
        responses = {204 : None},        
    )
    @transaction.atomic
    def post(self,request,room_code):
        room = get_object_or_404(Room, code=room_code)

        if room.status != RoomStatus.WAITING:
            return Response(
                {'detail': '대기 중인 방에서만 나갈 수 있습니다.'},
                status=status.HTTP_409_CONFLICT,
            )
        player = get_current_room_player(request, room)
        remaining_players = room.players.exclude(id = player.id)

        unbind_room_player(request,room)

        if not remaining_players.exists():
            room.delete()
            return Response(status = status.HTTP_204_NO_CONTENT)
        
        if player.is_host:
            next_host = remaining_players.order_by("joined_at","id").first()
            next_host.is_host = True
            next_host.save(update_fields=['is_host'])
        
        player.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class RoomKickAPIView(APIView):
    @extend_schema(
        summary="참가자 내보내기",
        description="방장이 대기실에서 참가자 내보내는 api",
        request = None,
        responses = {200:RoomSerializer}
    )

    @transaction.atomic
    def post(self, request, room_code, player_id):
        room = get_object_or_404(Room, code = room_code)
        current_player= get_current_room_player(request, room)

        if room.status !=RoomStatus.WAITING:
            return Response(
                {'detail': "대기 중인 방에서만 참가자를 내보낼 수 있습니다."},
                status=status.HTTP_409_CONFLICT,
            )
        if not current_player.is_host:
            return Response(
                {'detail':'방장만 참가자를 내보낼 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        
        target_player = get_object_or_404(RoomPlayer,room = room, id = player_id,)
        if target_player.id == current_player.id:
            return Response(
                {'detail':'자신을 내보낼 수 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target_player.delete()

        return Response(
            RoomSerializer(room).data,
            status=status.HTTP_200_OK,
        )

#게임 관련
class RoomStartAPIView(APIView):
    @extend_schema(
        summary="게임 시작",
        description="방장이 대기실의 참가자 준비 상태를 확인하고 게임을 시작합니다.",
        request=None,
        responses={201: GameStartResponseSerializer},
    )
    @transaction.atomic
    def post(self, request, room_code):
        room = get_object_or_404(
            Room.objects.select_for_update(),
            code=room_code,
        )
        current_player = get_current_room_player(request, room)

        if not current_player.is_host:
            return Response(
                {"detail": "방장만 게임을 시작할 수 있습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if room.status != RoomStatus.WAITING:
            return Response(
                {"detail": "대기 중인 방에서만 게임을 시작할 수 있습니다."},
                status=status.HTTP_409_CONFLICT,
            )

        players = list(room.players.order_by("joined_at", "id"))

        if len(players) < 2:
            return Response(
                {"detail": "게임을 시작하려면 최소 2명이 필요합니다."},
                status=status.HTTP_409_CONFLICT,
            )

        if any(not player.is_ready for player in players if not player.is_host):
            return Response(
                {"detail": "모든 참가자가 준비를 완료해야 합니다."},
                status=status.HTTP_409_CONFLICT,
            )

        game_session = start_game(room=room, players=players)

        response_serializer = GameStartResponseSerializer(
            {
                "game_id": game_session.id,
                "room_code": room.code,
                "room_status": room.status,
                "game_status": game_session.status,
                "current_turn_number": game_session.current_turn_number,
            }
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED,
        )

class GameStateAPIView(APIView):
    @extend_schema(
        summary="현재 게임 상태 조회",
        description="현재 세션의 참가자가 수행해야 할 턴과 제한 시간을 조회합니다. 게임 진행 중에는 다른 참가자의 정보와 작성자를 노출하지 않습니다.",
        request=None,
        responses={200: GameStateResponseSerializer},
    )

    @transaction.atomic
    def get(self, request, game_id):
        game_session = get_object_or_404(GameSession, id = game_id)
        player = get_current_room_player(request, game_session.room)

        turn =game_session.turns.filter(
            player = player,
            turn_number = game_session.current_turn_number,
        ).first()

        turn_data = None

        if turn:
            time_limit = (
                game_session.room.draw_time
                if turn.kind =="drawing"
                else game_session.room.write_time
            )
            turn_data = {
                'id' : turn.id,
                'kind' : turn.kind,
                'turn_number' : turn.turn_number,
                'time_limit' : time_limit,
                'text' : turn.text,
            }
        serializer = GameStateResponseSerializer(
            {
                "game_id": game_session.id,
                "game_status":game_session.status,
                "current_turn_number" : game_session.current_turn_number,
                "turn" : turn_data,
            }
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )
