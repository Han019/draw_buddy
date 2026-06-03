from dataclasses import field
from rest_framework import serializers

from .models import Room, RoomPlayer, DrawingReplay, DiscordUser


class RoomPlayerSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = RoomPlayer
        fields = [
            "id",
            "nickname",
            "is_host",
            "is_ready",
            "score",
            "joined_at",
            "avatar_url",
        ]

    def get_avatar_url(self, obj):
        if hasattr(obj, 'discord_user') and obj.discord_user:
            return obj.discord_user.avatar_url
        return None


class RoomSerializer(serializers.ModelSerializer):
    players = RoomPlayerSerializer(many=True, read_only=True)
    current_game_id = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            "id",
            "code",
            "status",
            "max_players",
            "created_at",
            "players",
            'draw_time',
            'write_time',
            'updated_at',
            'current_game_id',
        ]

    def get_current_game_id(self, obj):
        if obj.status == 'waiting':
            return None
        latest_game = obj.games.order_by('-id').first()
        return latest_game.id if latest_game else None


class RoomCreateRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(max_length=20)
    max_players = serializers.IntegerField(
        min_value=2,
        max_value=10,
        default=6,
    )

class RoomJoinRequestSerializer(serializers.Serializer):
    nickname = serializers.CharField(max_length=20)


class ReadyUpdateSerializer(serializers.Serializer):
    is_ready = serializers.BooleanField()

class RoomSettingsUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[('waiting', 'waiting')], required=False)

    draw_time = serializers.IntegerField(
        min_value = 60,
        max_value = 500,
        required = False,
    )
    write_time = serializers.IntegerField(
        min_value = 20,
        max_value = 300,
        required = False,
    )

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("변경할 설정값이 없습니다.")
        return attrs


class GameStartResponseSerializer(serializers.Serializer):
    game_id = serializers.IntegerField()
    room_code = serializers.CharField()
    room_status = serializers.CharField()
    game_status = serializers.CharField()
    current_turn_number = serializers.IntegerField()

class GameStateResponseSerializer(serializers.Serializer):
    """
    game_id : IntegerField
    game_status : CharField
    current_turn_number : IntegerField
    turn : DictField
    """
    game_id = serializers.IntegerField()
    game_status = serializers.CharField()
    current_turn_number = serializers.IntegerField()
    turn = serializers.DictField(allow_null = True)

class PromptSubmitSerializer(serializers.Serializer):
    text = serializers.CharField(
        max_length= 200,
        allow_blank=True,
        
    )

class DrawingCompleteSerializer(serializers.Serializer):
    canvas_width = serializers.IntegerField(default = 800)
    canvas_height = serializers.IntegerField(default = 600)
    events = serializers.ListField(
        child = serializers.DictField(),
        allow_empty=True,
        default= list
    )

class GuessSubmitSerializer(serializers.Serializer):
    text = serializers.CharField(
        max_length= 200,
        allow_blank = True,
    )

class DrawingReplaySerializer(serializers.ModelSerializer):
    class Meta:
        model = DrawingReplay
        fields = ['id', 'canvas_width', 'canvas_height', 'events']
    
class DiscordUserSerializer(serializers.ModelSerializer):
    provider = serializers.SerializerMethodField()

    class Meta:
        model = DiscordUser
        fields = ['id','provider','discord_id','username','global_name','avatar_url']
    
    def get_provider(self,obj):
        return 'discord'

class AuthMeResponseSerializer(serializers.Serializer):
    user = DiscordUserSerializer(allow_null=True)
    