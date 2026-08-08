class Broadcaster:
    """Stores messages in a list for polling and also pushes to any async queues."""
    
    def __init__(self):
        self.queues = set()
        self.messages = []
        self.call_ended = False
        
    async def put(self, item):
        if item.get("type") == "control" and item.get("message") == "close":
            self.call_ended = True
        else:
            self.messages.append(item)
        
        # Still push to queues for any internal consumers (e.g. bot.py)
        for q in list(self.queues):
            await q.put(item)
    
    def get_messages_since(self, index: int):
        return self.messages[index:]
    
    def reset(self):
        self.messages = []
        self.call_ended = False
