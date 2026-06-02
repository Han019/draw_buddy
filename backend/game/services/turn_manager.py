from django.db import transaction
from ..models import GameSession, GameTurn
import random

def check_and_advance_turn(game_session: GameSession):
    """
    현재 턴 번호에 해당하는 모든 제출이 완료되었는지 확인하고,
    모두 완료되었다면 다음 턴(Drawing or Guess)을 생성합니다.
    """
    current_turns=game_session.turns.filter(turn_number= game_session.current_turn_number)

    #아직 제출하지 않은 턴이 있다면 대기
    if current_turns.filter(submitted_at__isnull = True).exists():
        return
    
    with transaction.atomic():
        next_turn_number=game_session.current_turn_number + 1
        players = list(game_session.room.players.order_by("joined_at", 'id'))
        total_players = len(players)
        #모든 참가자 수만큼 턴을 진행했다면 게임 종료
        if next_turn_number >= total_players:
            game_session.status = GameSession.Status.REVEALING
            game_session.save(update_fields=['status'])
            return
        
        # 홀수 턴은 그림, 짝수 턴은 설명
        next_kind = GameTurn.Kind.DRAWING if next_turn_number %2 !=0 else GameTurn.Kind.GUESS

        chains = list(game_session.chains.all())
        
        #각 참가자가 지금까지 참여했던 체인(릴레이) 기록 조회
        history = {p.id: set() for p in players}
        for turn in game_session.turns.all():
            history[turn.player_id].add(turn.chain_id)

        #백트래킹으로 겹치지 않는 랜덤 턴 배정 매칭 찾기
        def backtrack(chain_idx, available_players):
            if chain_idx == len(chains):
                return {}
            chain = chains[chain_idx]
            candidates = list(available_players)
            random.shuffle(candidates)

            for p_id in candidates:
                # 이전에 참여한 적 없는 체인인가 확인
                if chain.id not in history[p_id]: 
                    available_players.remove(p_id)
                    result = backtrack(chain_idx+1, available_players)
                    if result is not None:
                        result[chain] = p_id
                        return result
                    #실패하면 다시 넣음
                    available_players.add(p_id)
            return None
        
        #매칭 수행 및 다음 턴 생성
        assignments = backtrack(0, set(p.id for p in players))
        player_dict ={p.id: p for p in players}
    
        for chain, p_id in assignments.items():
            GameTurn.objects.create(
                game_session=game_session,
                chain=chain,
                turn_number = next_turn_number,
                player=player_dict[p_id],
                kind= next_kind,
            )

        # 세션의 현재 턴 상태 업데이트
        game_session.current_turn_number = next_turn_number
        game_session.save(update_fields=["current_turn_number"])