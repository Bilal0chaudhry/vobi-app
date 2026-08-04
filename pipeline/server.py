import os
import sys

# Fix NLTK security import error before importing anything
os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
from bot import start_bot

app = FastAPI()

# Allow frontend to access the backend
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

# Store the current running bot task to prevent multiple concurrent calls
# using the local microphone.
active_call = None
# Global event queue for SSE
event_queue = None

@app.post("/start-call")
async def start_call(data: PatientData):
    global active_call, event_queue
    if active_call is not None and not active_call.done():
        raise HTTPException(status_code=400, detail="A call is already in progress.")
    
    event_queue = asyncio.Queue()
    
    # Run the bot in a background task
    active_call = asyncio.create_task(start_bot(data.model_dump(), event_queue))
    
    return {"message": "Call started successfully", "patient": data.patientFirstName}

@app.post("/end-call")
async def end_call():
    global active_call, event_queue
    if active_call is not None and not active_call.done():
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
            # Wait for a new event from the queue
            event_data = await event_queue.get()
            # If we receive a poison pill, close the stream
            if event_data.get("type") == "control" and event_data.get("message") == "close":
                break
            
            yield f"data: {json.dumps(event_data)}\n\n"
        except asyncio.CancelledError:
            break

@app.get("/events")
async def get_events():
    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
