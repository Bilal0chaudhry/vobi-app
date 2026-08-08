class Broadcaster:
    """Stores transcript messages for polling and pushes to async queues."""

    def __init__(self):
        self.queues = set()
        self.messages = []
        self.call_ended = False
        self.end_call_pending = False

    async def put(self, item):
        if item.get("type") == "control" and item.get("message") == "close":
            self.call_ended = True
        elif item.get("type") == "control" and item.get("message") == "end_pending":
            self.end_call_pending = True
        else:
            self.messages.append(item)

        for q in list(self.queues):
            await q.put(item)

    def get_messages_since(self, index: int):
        return self.messages[index:]

    def reset(self):
        self.messages = []
        self.call_ended = False
        self.end_call_pending = False
