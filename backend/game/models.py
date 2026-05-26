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
    created_at= models.DateTimeField(auto_now_add=True)
    
    def __str__(self) -> str:
        return self.code



class GameSession(models.Model):
    room=models.ForeignKey(Room,on_delete=models.CASCADE,related_name='games')
    status = models.CharField(max_length=20, default="waiting")
    started_at = models.DateTimeField(auto_now_add=True)
    


class RoomPlayer(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE,related_name='players')
    nickname = models.CharField(max_length=20)
    is_host = models.BooleanField(default=False)
    is_ready = models.BooleanField(default=False)
    score = models.IntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nickname} - {self.room.code}"

