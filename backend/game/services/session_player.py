from rest_framework.exceptions import NotAuthenticated

SESSION_KEY = "room_player_ids"

def bind_room_player(request,player):
    """
    방 생성 or 참가 성공 후,
    현재 브라우저 세션과 Roomplayer를 연결
    """
    room_players = request.session.get(SESSION_KEY, {})
    room_players[player.room.code] = player.id

    request.session[SESSION_KEY] = room_players
    request.session.modified = True


def get_current_room_player(request, room):
    """
    현재 요청자가 어떤 Roomplayer인지 반환
    """

    room_players = request.session.get(SESSION_KEY, {})
    player_id = room_players.get(room.code)

    if player_id is None:
        raise NotAuthenticated("이 방에 참가한 사용자 세션이 없습니다.")
    try:
        return room.players.get(id=player_id)
    except room.players.model.DoesNotExist:
        raise NotAuthenticated("유효하지 않은 참가자 세션입니다.")


def unbind_room_player(request,room):
    room_players = request.session.get(SESSION_KEY,{})
    room_players.pop(room.code, None)

    request.session[SESSION_KEY] = room_players
    request.session.modified = True