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
