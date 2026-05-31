from rest_framework import serializers

from .models import Room, RoomPlayer


class RoomPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomPlayer
        fields = [
            "id",
            "nickname",
            "is_host",
            "is_ready",
            "score",
            "joined_at",
        ]


class RoomSerializer(serializers.ModelSerializer):
    players = RoomPlayerSerializer(many=True, read_only=True)

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
        ]


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

    draw_time = serializers.IntegerField(
        min_value = 60,
        max_value = 500,
        required = False,
    )
    write_time = serializers.IntegerField(
        min_value = 20,
        max_value = 60,
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