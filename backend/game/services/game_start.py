from ..models import GameChain, GameSession, GameTurn, RoomStatus
from .default_prompts import get_random_prompts

def start_game(room, players):
    game_session = GameSession.objects.create(room=room)
    prompts = get_random_prompts(len(players))

    for order_index, player in enumerate(players):
        chain = GameChain.objects.create(
            game_session=game_session,
            starter_player=player,
            order_index=order_index,
        )
        GameTurn.objects.create(
            game_session=game_session,
            chain=chain,
            turn_number=0,
            player=player,
            kind=GameTurn.Kind.PROMPT,
            text = prompts[order_index],
        )

    room.status = RoomStatus.PLAYING
    room.save(update_fields=["status", "updated_at"])

    return game_session
