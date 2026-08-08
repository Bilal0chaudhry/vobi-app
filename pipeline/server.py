import os
import sys
import time
import signal
from contextlib import asynccontextmanager
from collections import defaultdict

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio

from models import PatientData, AvailityRequest
from utils.broadcaster import Broadcaster
from services.availity import fetch_eligibility

ALLOWED_ORIGINS = [
    "https://bilal0chaudhry.github.io",
    "http://localhost:5173",
    "http://localhost:4173",
]

API_KEY = os.getenv("VOBI_API_KEY", "")
RATE_LIMIT_WINDOW = 60
RATE_LIMITS = {"/start-call": 5, "/end-call": 10, "/messages": 120, "/availity/eligibility": 10}
rate_limit_store = defaultdict(list)


@asynccontextmanager
async def lifespan(app: FastAPI):
    def force_exit(*args):
        print("\nShutting down...")
        os._exit(0)
    signal.signal(signal.SIGINT, force_exit)
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    if API_KEY and request.headers.get("X-API-Key") != API_KEY:
        return JSONResponse(status_code=403, content={"detail": "Unauthorized"})

    path = request.url.path
    max_requests = RATE_LIMITS.get(path)
    if max_requests:
        now = time.time()
        client = request.client.host if request.client else "unknown"
        key = f"{client}:{path}"
        rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < RATE_LIMIT_WINDOW]
        if len(rate_limit_store[key]) >= max_requests:
            return JSONResponse(status_code=429, content={"detail": "Too many requests"})
        rate_limit_store[key].append(now)

    return await call_next(request)


active_call = None
broadcaster = Broadcaster()
stop_event = None


@app.post("/start-call")
async def start_call(data: PatientData):
    global active_call, broadcaster, stop_event

    if active_call is not None and not active_call.done():
        raise HTTPException(status_code=400, detail="A call is already active")

    broadcaster.reset()

    print("\n" + "=" * 50)
    print(f"🚨 INCOMING CALL FOR: {data.insurance}")
    print("=" * 50)
    print("\a", end="", flush=True)

    try:
        answer = await asyncio.to_thread(input, "Accept call? (y/n): ")
        if answer.strip().lower() != "y":
            print("Call rejected.\n")
            raise HTTPException(status_code=403, detail="All representatives are busy")
    except EOFError:
        raise HTTPException(status_code=403, detail="All representatives are busy")

    print("✅ Call accepted! Vobi is connected.")
    print("👉 Live transcript → website dashboard")
    print("👉 Speak into your microphone to verify benefits.\n")

    stop_event = asyncio.Event()

    from bot import start_bot
    active_call = asyncio.create_task(start_bot(data.model_dump(), broadcaster, stop_event))

    return {"message": "Call started successfully", "patient": data.patientFirstName}


@app.post("/end-call")
async def end_call():
    global active_call, stop_event

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
    new_messages = broadcaster.get_messages_since(since)
    return {
        "messages": new_messages,
        "next": since + len(new_messages),
        "done": broadcaster.call_ended,
        "end_pending": broadcaster.end_call_pending,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
