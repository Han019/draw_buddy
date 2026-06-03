import json
from channels.generic.websocket import AsyncWebsocketConsumer

class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f"room_{self.room_code}"

        #방 그룹에 소켓 연결
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def disconnect(self, close_code):
        #방 그룹에서 소켓 제거
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    #클라이언트로부터 메시지를 받았을 때 실행
    async def receive(self, text_data):
        data = json.loads(text_data)
        event_type = data.get('type')
    
        if event_type == 'chat_message':
            # 같은 방에 있는 모든 사람에게 브로드캐스트
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message_handler',
                    'nickname' : data.get('nickname','익명'),
                    'message' : data.get('message',""),
                    'avatar_url': data.get('avatar_url')
                }
            )
        elif event_type == 'room_update':
            #누군가가 준비/설정/시작을 누르면 새로고침하라고 신호 전달
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'room_updated_handler',
                }
            )
        elif event_type == 'result_sync':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'result_sync_handler',
                    'currentChainIndex': data.get('currentChainIndex'),
                    'currentStep': data.get('currentStep'),
                }
            )
    # 브로드캐스트된 이벤트를 받아서 실제 브라우저로 쏴주는 함수들
    async def chat_message_handler(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'nickname': event['nickname'],
            'message': event['message'],
            'avatar_url': event.get('avatar_url')
        }))
    async def room_updated_handler(self,event):
        await self.send(text_data=json.dumps({
            'type': 'room_updated'
        }))
    async def result_sync_handler(self, event):
        await self.send(text_data=json.dumps({
            'type': 'result_sync',
            'currentChainIndex': event.get('currentChainIndex'),
            'currentStep': event.get('currentStep'),
        }))