from django.db import models

# Create your models here.
class RoomStatus(models.TextChoices):
    WAITING = "waiting","Waiting"
    PLAYING = "playing","Playing"
    FINISHED = "finished", "Finished"

class Room(models.Model):

    code = models.CharField(max_length=6, unique=True)
    status = models.CharField(
        max_length=30,
        choices = RoomStatus.choices,
        default = RoomStatus.WAITING
    )
    max_players=models.IntegerField(default=8)

    draw_time = models.PositiveIntegerField(default = 180)
    write_time = models.PositiveIntegerField(default = 60)

    created_at = models.DateTimeField(auto_now_add = True)
    updated_at = models.DateTimeField(auto_now = True)

    def __str__(self) -> str:
        return self.code



#방 관련
class DiscordUser(models.Model):
    discord_id = models.CharField(max_length=100, unique=True)
    username = models.CharField(max_length=100)
    global_name = models.CharField(max_length=100, null=True, blank=True)
    avatar_hash = models.CharField(max_length=100, null=True, blank=True)
    avatar_url = models.URLField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.global_name or self.username


class RoomPlayer(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE,related_name='players')
    nickname = models.CharField(max_length=20)
    is_host = models.BooleanField(default=False)
    is_ready = models.BooleanField(default=False)
    score = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)
    discord_user = models.ForeignKey(
        DiscordUser, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name="room_players"
    )

    class Meta:
        constraints=[
            models.UniqueConstraint(
                fields=["room",'nickname'],
                name ="unique_room_nickname",
            )
        ]

    def __str__(self):
        return f"{self.nickname} - {self.room.code}"


#게임 관련

class GameSession(models.Model):

    class Status(models.TextChoices):
        COLLECTING_PROMPTS = "collecting_prompts", "첫 문장 작성 중"
        PLAYING = "playing", "게임 진행 중"
        REVEALING = "revealing", "결과 공개 중"
        FINISHED = "finished", "종료"


    room=models.ForeignKey(Room,on_delete=models.CASCADE,related_name='games')
    status = models.CharField(max_length=30, choices = Status.choices, default = Status.COLLECTING_PROMPTS)

    current_turn_number = models.PositiveIntegerField(default = 0)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null = True, blank = True)

class GameChain(models.Model):
    game_session = models.ForeignKey(
        GameSession,
        related_name = 'chains',
        on_delete= models.CASCADE,
    )
    starter_player = models.ForeignKey(
        RoomPlayer,
        related_name = 'chains',
        on_delete = models.CASCADE,
    )
    order_index = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add = True)


class GameTurn(models.Model):
    class Kind(models.TextChoices):
        PROMPT = "prompt", "첫 문장"
        DRAWING = "drawing", "그림"
        GUESS = "guess", "그림 설명"

    game_session = models.ForeignKey(
        GameSession,
        related_name = 'turns',
        on_delete = models.CASCADE,
    )

    chain = models.ForeignKey(
        GameChain,
        related_name="turns",
        on_delete = models.CASCADE,
    )
    turn_number= models.PositiveIntegerField()

    player = models.ForeignKey(
        RoomPlayer,
        related_name="game_turns",
        on_delete = models.CASCADE,
    )

    kind = models.CharField(max_length=20, choices = Kind.choices)
    text = models.TextField(blank = True)
    submitted_at = models.DateTimeField(null= True, blank= True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['chain','turn_number'],
                name="unique_chain_turn_number",
            )
        ]


class DrawingReplay(models.Model):
    game_turn = models.OneToOneField(
        GameTurn,
        related_name="replay",
        on_delete = models.CASCADE,
    )

    canvas_width = models.PositiveIntegerField(default = 800)
    canvas_height = models.PositiveIntegerField(default = 600)
    events = models.JSONField(default = list)
    created_at = models.DateTimeField(auto_now_add = True)
