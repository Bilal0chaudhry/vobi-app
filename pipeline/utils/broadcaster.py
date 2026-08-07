class Broadcaster:
    def __init__(self):
        self.queues = set()
        
    async def put(self, item):
        for q in list(self.queues):
            await q.put(item)
