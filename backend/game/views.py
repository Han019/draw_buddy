from django.shortcuts import get_object_or_404
from django.http import HttpResponse, HttpResponseRedirect

import os
import requests

import secrets
import string

from django.utils import timezone
from django.db import transaction
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import( GameTurn, Room, RoomPlayer, RoomStatus,
GameSession, DiscordUser, DrawingReplay
)

from .serializers import ( GameStateResponseSerializer, ReadyUpdateSerializer, RoomCreateRequestSerializer, RoomJoinRequestSerializer, 
RoomSerializer, RoomSettingsUpdateSerializer, GameStartResponseSerializer, PromptSubmitSerializer, DrawingCompleteSerializer,
GuessSubmitSerializer, DrawingReplaySerializer, DiscordUserSerializer, AuthMeResponseSerializer
)

from .services.session_player import bind_room_player, get_current_room_player, unbind_room_player
from .services.game_start import start_game
from .services.turn_manager import check_and_advance_turn

def index(request):
    return HttpResponse("game start")


def generate_room_code():
    alphabet = string.ascii_uppercase + string.digits

    while True:
        code="".join(secrets.choice(alphabet) for _ in range(6))

        if not Room.objects.filter(code=code).exists():
            return code

class CSRFTokenAPIView(APIView):
    @extend_schema(
        summary="CSRF 쿠키 발급",
        description="프론트엔드에서 사용할 CSRF 토큰을 브라우저 쿠키로 발급합니다.",
        responses={200: dict}
    )
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        return Response({"detail": "CSRF cookie set"}, status=status.HTTP_200_OK)

#render 헬스체크 api 
class HealthCheckAPIView(APIView):
    @extend_schema(
        summary="헬스체크 api",
        description="render 안 꺼지게 14분마다 api 호출하는 역할",
        responses ={200:dict}
    )
    def get(self,request):
        return Response(
            {"detail":"ok", "message":"Backend is running!"},
            status = status.HTTP_200_OK,
        )

#디스코드 로그인 api 
class DiscordLoginAPIView(APIView):
    @extend_schema(
        summary = "디스코드 로그인 리다이렉트",
        description = "디스코드 로그인 페이지로 사용자를 이동시킵니다.",
    )
    def get(self,request):
        client_id = os.environ.get("DISCORD_CLIENT_ID")
        redirect_uri= os.environ.get("DISCORD_REDIRECT_URI")

        discord_url = f"https://discord.com/oauth2/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=identify"
        return HttpResponseRedirect(discord_url)

class DiscordCallbackAPIView(APIView):
    @extend_schema(
        summary = "디스코드 로그인 콜백",
        description = "디스코드에서 돌아오는 코드를 받아 유저 정보를 저장",
    )
    def get(self,request):
        code = request.GET.get("code")
        if not code:
            return Response(
                {'detail': "받은 코드 없음"},
                status = status.HTTP_400_BAD_REQUEST
            )
        client_id = os.environ.get("DISCORD_CLIENT_ID")
        client_secret = os.environ.get("DISCORD_CLIENT_SECRET")
        redirect_uri = os.environ.get("DISCORD_REDIRECT_URI")

        #토큰 교한 token exchange
        token_data = {
            'grant_type' : 'authorization_code',
            'code' : code,
            'redirect_uri' : redirect_uri,
        }
        headers = {
            'Content-Type' : 'application/x-www-form-urlencoded'
        }
        r = requests.post("https://discord.com/api/v10/oauth2/token",
            data = token_data, 
            headers=headers,
            auth=(client_id,client_secret)
        )
        r.raise_for_status()

        # access token 형태, r
        # {"access_token": "6qrZcUqja7812RVdnEKjpzOL4CvHBFG",
        # "token_type": "Bearer",
        # "expires_in": 604800,
        # "refresh_token": "D43f5y0ahjqew82jZ4NViEr2YafMKhue",
        # "scope": "identify"
        # }
        token_response = r.json()
        access_token = token_response.get("access_token")
        if not access_token:
            return Response(
                {'detail':'토큰을 발급받지 못했습니다.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user_res = requests.get("https://discord.com/api/v10/users/@me",headers={'Authorization':f"Bearer {access_token}"})
        user_res.raise_for_status()

        user_data = user_res.json()
        discord_id = user_data.get('id')
        avatar_hash = user_data.get('avatar')

        avatar_url=None
        if avatar_hash:
            avatar_url=f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"
        discord_user, created = DiscordUser.objects.update_or_create(
            discord_id = discord_id,
            defaults={
                'username' : user_data.get('username'),
                'global_name': user_data.get('global_name'),
                'avatar_hash' : avatar_hash,
                'avatar_url' : avatar_url,    
            }
        )

        #쟝고 세션에 유저의 고유 id를 기록하여 로그인 처리
        request.session['discord_user_id'] = discord_user.discord_id

        #frontend로 돌려보내기
        frontend_url = os.environ.get("FRONTEND_BASE_URL", "http://127.0.0.1:5173")
        return HttpResponseRedirect(frontend_url)

class AuthMeAPIView(APIView):
    @extend_schema(
        summary="현재 로그인 사용자 조회",
        description="현재 세션에 로그인된 디스코드 사용자 프로필을 반환합니다.(비로그인 시 user:null 반환)",
        responses={200,AuthMeResponseSerializer}
    )
    def get(self,request):
        discord_user_id = request.session.get('discord_user_id')
        
        if discord_user_id:
            user = DiscordUser.objects.filter(discord_id= discord_user_id).first()
            if user:
                serializer = AuthMeResponseSerializer({'user' : user})
                return Response(
                    serializer.data,
                    status=status.HTTP_200_OK
                )
        return Response(
            {'user':None},
            status=status.HTTP_200_OK
        )
class LogoutAPIView(APIView):
    @extend_schema(
        summary="로그아웃",
        description="현재 세션을 만료시키고 로그아웃 처리합니다.",
        responses = {200 : dict}
    )
    def post(self,request):
        request.session.flush()
        return Response(
            {'logged_out': True},
            status= status.HTTP_200_OK
        )


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

            # 이전 턴(그림을 그려야 할 문장 또는 설명을 써야 할 그림) 정보 조회
            source_text = None
            source_replay_id=None

            if turn.turn_number > 0:
                prev_turn = game_session.turns.filter(
                    chain=turn.chain,
                    turn_number=turn.turn_number - 1
                ).first()
                if prev_turn:
                    if prev_turn.kind == GameTurn.Kind.DRAWING and hasattr(prev_turn,'replay'):
                        source_replay_id = prev_turn.replay.id
                    else:
                        source_text = prev_turn.text

            turn_data = {
                'id' : turn.id,
                'kind' : turn.kind,
                'turn_number' : turn.turn_number,
                'time_limit' : time_limit,
                'text' : turn.text,
                'source_text' : source_text,
                'source_replay_id': source_replay_id,
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

#첫 문장 제출 api
class PromptSubmitAPIView(APIView):
    @extend_schema(
        summary = "첫 문장 제출",
        description = "첫 문장을 작성하는 api입니다.",
    )
    @transaction.atomic
    def post(self, request,game_id, turn_id):
        game_session = get_object_or_404(GameSession, id= game_id)
        player = get_current_room_player(request, game_session.room)

        #자신의 턴인지 확인
        turn = get_object_or_404(
            GameTurn,
            id= turn_id,
            game_session=game_session,
            player=player,
            kind = GameTurn.Kind.PROMPT,
            turn_number = game_session.current_turn_number
        )
        
        if turn.submitted_at:
            return Response(
                {'detail':'이미 제출된 턴입니다.'},
                status = status.HTTP_409_CONFLICT
            )
        serializer = PromptSubmitSerializer(data= request.data)
        serializer.is_valid(raise_exception = True)

        turn.text = serializer.validated_data['text']
        turn.submitted_at = timezone.now()
        turn.save(update_fields =['text','submitted_at'])

        check_and_advance_turn(game_session)

        return Response(
            {
                'turn_id': turn.id, 
                'kind' : turn.kind,
                'submitted' : True
            },
            status=status.HTTP_200_OK
        )

class ReplayRetrieveAPIView(APIView):
    @extend_schema(
        summary="그림 리플레이 조회",
        description="특정 그림 턴의 선 좌표 이벤트(리플레이 데이터)를 조회합니다.",
        responses={200: DrawingReplaySerializer}
    )
    def get(self, request, replay_id):
        replay = get_object_or_404(DrawingReplay, id=replay_id)
        serializer = DrawingReplaySerializer(replay)
        return Response(serializer.data, status=status.HTTP_200_OK)

class GameResultAPIView(APIView):
    @extend_schema(
        summary="게임 결과 앨범 조회",
        description="모든 턴이 종료된 후 각 체인(릴레이)의 결과물과 작성자를 공개합니다.",
        responses={200: dict}
    )
    def get(self, request, game_id):
        game_session = get_object_or_404(GameSession, id=game_id)
        
        # 진행 중인 게임의 결과는 훔쳐볼 수 없도록 막기
        if game_session.status not in [GameSession.Status.REVEALING, GameSession.Status.FINISHED]:
            return Response({"detail": "아직 게임이 종료되지 않았습니다."}, status=status.HTTP_403_FORBIDDEN)

        chains_data = []
        for chain in game_session.chains.all().order_by('order_index', 'id'):
            turns_data = []
            for turn in chain.turns.all().order_by('turn_number'):
                turn_info = {
                    "turn_number": turn.turn_number,
                    "kind": turn.kind,
                    "author": {
                        "id": turn.player.id,
                        "nickname": turn.player.nickname,
                    },
                }
                if turn.kind in [GameTurn.Kind.PROMPT, GameTurn.Kind.GUESS]:
                    turn_info["text"] = turn.text
                elif turn.kind == GameTurn.Kind.DRAWING and hasattr(turn, 'replay'):
                    turn_info["replay_id"] = turn.replay.id
                turns_data.append(turn_info)

            chains_data.append({"chain_id": chain.id, "turns": turns_data})

        return Response({
            "game_id": game_session.id,
            "room_code": game_session.room.code,
            "chains": chains_data
        }, status=status.HTTP_200_OK)

class DrawingCompleteAPIView(APIView):
    @extend_schema(
        summary="그림 제출 완료",
        description="그림 턴의 선 이벤트를 저장하고 제출 완료 처리합니다.",
        request=DrawingCompleteSerializer,
        responses={200: dict}
    )
    @transaction.atomic
    def post(self, request, game_id, turn_id):

        game_session = get_object_or_404(GameSession, id= game_id)
        player = get_current_room_player(request, game_session.room)

        turn = get_object_or_404(
            GameTurn,
            id= turn_id,
            game_session=game_session,
            player=player,
            kind= GameTurn.Kind.DRAWING,
            turn_number=game_session.current_turn_number
        )
        if turn.submitted_at:
            return Response(
                {'detail': '이미 제출된 턴입니다.'},
                status=status.HTTP_409_CONFLICT,
            )
        
        serializer = DrawingCompleteSerializer(data = request.data)
        serializer.is_valid(raise_exception=True)

        DrawingReplay.objects.create(
            game_turn= turn,
            canvas_width = serializer.validated_data.get('canvas_width',800),
            canvas_height = serializer.validated_data.get('canvas_height',600),
            events=serializer.validated_data.get('events',[])
        )

        turn.submitted_at = timezone.now()
        turn.save(update_fields=['submitted_at'])

        check_and_advance_turn(game_session)

        return Response(
            {
                "turn_id": turn.id,
                'kind' : turn.kind,
                'submitted': True
            },
            status = status.HTTP_200_OK
        )

#그림 설명
class GuessSubmitAPIView(APIView):
    @extend_schema(
        summary="그림 설명 제출",
        description="이전 턴의 그림을 보고 그에 대한 설명을 제출합니다.",
        request = GuessSubmitSerializer,
        responses={200 : dict}
    )

    @transaction.atomic
    def post(self, request, game_id, turn_id):
        game_session = get_object_or_404(GameSession, id = game_id)
        player = get_current_room_player( request, game_session.room)

        turn = get_object_or_404(
            GameTurn,
            id= turn.id,
            game_session = game_session,
            player = player,
            kind = GameTurn.Kind.GUESS,
            turn_number = game_session.current_turn_number
        )

        if turn.submitted_at:
            return Response(
                {'detail':'이미 제출된 턴입니다.'},
                status = status.HTTP_409_CONFLICT
            )
        serializer = GuessSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception = True)

        turn.text = serializer.validated_data['text']
        turn.submitted_at = timezone.now()
        turn.save(update_fields=['text','submitted_at'])

        check_and_advance_turn(game_session)

        return Response(
            {
                'turn_id' : turn.id,
                'kind' : turn.kind,
                'submitted' : True
            },
            status=status.HTTP_200_OK
        )