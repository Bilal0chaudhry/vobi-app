import os
import sys

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, BackgroundTasks, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json

from models import PatientData, AvailityRequest
from utils.broadcaster import Broadcaster
from services.availity import fetch_eligibility

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_call = None
broadcaster = Broadcaster()
stop_event = None

@app.post("/start-call")
async def start_call(data: PatientData):
    global active_call, broadcaster, stop_event
    
    if active_call is not None and not active_call.done():
        raise HTTPException(status_code=400, detail="A call is already active")
    
    # Reset message buffer for the new call
    broadcaster.reset()
        
    print("\n" + "="*50)
    print(f"🚨 INCOMING CALL FOR: {data.insurance}")
    print("="*50)
    print('\a', end='', flush=True)  # System bell for notification sound
    
    try:
        # Ask user for input without blocking the asyncio event loop
        answer = await asyncio.to_thread(input, "Accept call? (y/n): ")
        if answer.strip().lower() != 'y':
            print("Call rejected.\n")
            raise HTTPException(status_code=403, detail="All representatives are busy")
    except EOFError:
        raise HTTPException(status_code=403, detail="All representatives are busy")
        
    print("✅ Call accepted! Vobi is connected.")
    print("👉 Live transcript is streaming to your website dashboard.")
    print("👉 Speak into your microphone to verify benefits.\n")
                
    stop_event = asyncio.Event()
    
    from bot import start_bot
    active_call = asyncio.create_task(start_bot(data.model_dump(), broadcaster, stop_event))
    
    return {"message": "Call started successfully", "patient": data.patientFirstName}

@app.post("/end-call")
async def end_call():
    global active_call, broadcaster, stop_event
    if stop_event is not None:
        stop_event.set()
    
    if active_call is not None and not active_call.done():
        active_call.cancel()
        active_call = None
        
    await broadcaster.put({"type": "control", "message": "close"})
    return {"message": "Call ended successfully"}

@app.post("/availity/eligibility")
async def availity_eligibility(data: AvailityRequest):
    return fetch_eligibility(data)

@app.get("/messages")
async def get_messages(since: int = 0):
    """Polling endpoint: returns new messages since the given index."""
    new_messages = broadcaster.get_messages_since(since)
    return {
        "messages": new_messages,
        "next": since + len(new_messages),
        "done": broadcaster.call_ended,
    }

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
    # Suppress Uvicorn's access logs to keep the terminal clean
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
