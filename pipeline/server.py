import os
import sys

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
from bot import start_bot

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PatientData(BaseModel):
    id: str
    patientFirstName: str
    patientLastName: str
    dob: str
    insurance: str
    memberId: str
    npi: str
    cptCodes: list[str]
    submitted: str
    status: str

active_call = None
event_queue = None
stop_event = None

@app.post("/start-call")
async def start_call(data: PatientData):
    global active_call, event_queue, stop_event
    if active_call is not None and not active_call.done():
        raise HTTPException(status_code=400, detail="A call is already in progress.")
    
    event_queue = asyncio.Queue()
    stop_event = asyncio.Event()
    
    active_call = asyncio.create_task(start_bot(data.model_dump(), event_queue, stop_event))
    
    return {"message": "Call started successfully", "patient": data.patientFirstName}

@app.post("/end-call")
async def end_call():
    global active_call, event_queue, stop_event
    if stop_event is not None:
        stop_event.set()
    
    if active_call is not None and not active_call.done():
        await asyncio.sleep(1)
        active_call.cancel()
        active_call = None
        
    if event_queue is not None:
        await event_queue.put({"type": "control", "message": "close"})
    return {"message": "Call ended successfully"}

async def event_generator():
    global event_queue
    if event_queue is None:
        event_queue = asyncio.Queue()
        
    while True:
        try:
            event_data = await event_queue.get()
            if event_data.get("type") == "control" and event_data.get("message") == "close":
                break
            
            yield f"data: {json.dumps(event_data)}\n\n"
        except asyncio.CancelledError:
            break

@app.get("/events")
async def get_events():
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.on_event("startup")
async def startup_event():
    import signal
    import os
    def force_exit(*args):
        print("\nForce killing server...")
        os._exit(0)
    signal.signal(signal.SIGINT, force_exit)
        
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
