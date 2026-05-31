from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import GameSession, GameTurn, Room, RoomPlayer, RoomStatus
from .services.session_player import SESSION_KEY


class RoomStartAPIViewTests(APITestCase):
    def setUp(self):
        self.room = Room.objects.create(code="ABC123")
        self.host = RoomPlayer.objects.create(
            room=self.room,
            nickname="host",
            is_host=True,
        )
        self.guest = RoomPlayer.objects.create(
            room=self.room,
            nickname="guest",
            is_ready=True,
        )
        self.url = reverse("room-start", kwargs={"room_code": self.room.code})

    def bind_player(self, player):
        session = self.client.session
        session[SESSION_KEY] = {self.room.code: player.id}
        session.save()

    def test_host_can_start_game_when_guests_are_ready(self):
        self.bind_player(self.host)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.room.refresh_from_db()
        self.assertEqual(self.room.status, RoomStatus.PLAYING)

        game_session = GameSession.objects.get(room=self.room)
        self.assertEqual(response.data["game_id"], game_session.id)
        self.assertEqual(response.data["room_status"], RoomStatus.PLAYING)
        self.assertEqual(game_session.chains.count(), 2)
        self.assertEqual(game_session.turns.count(), 2)
        self.assertEqual(
            game_session.turns.filter(kind=GameTurn.Kind.PROMPT).count(),
            2,
        )

    def test_non_host_cannot_start_game(self):
        self.bind_player(self.guest)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(GameSession.objects.filter(room=self.room).exists())

    def test_all_guests_must_be_ready(self):
        self.guest.is_ready = False
        self.guest.save(update_fields=["is_ready"])
        self.bind_player(self.host)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(GameSession.objects.filter(room=self.room).exists())

    def test_at_least_two_players_are_required(self):
        self.guest.delete()
        self.bind_player(self.host)

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertFalse(GameSession.objects.filter(room=self.room).exists())

# Create your tests here.
