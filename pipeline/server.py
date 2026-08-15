import os
import sys
import time
import signal
import warnings
from contextlib import asynccontextmanager
from collections import defaultdict
import requests

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"
warnings.filterwarnings("ignore", category=DeprecationWarning)

from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import PatientData, AvailityRequest
from utils.broadcaster import Broadcaster
from services.availity import fetch_eligibility

ALLOWED_ORIGINS = [
    "https://bilal0chaudhry.github.io",
    "http://localhost:5173",
    "http://localhost:4173",
]

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("❌ FATAL: Supabase environment variables missing. Refusing to start without security.")
    sys.exit(1)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    def force_exit(*args):
        print("\n✋ Server stopped.")
        os._exit(0)
    signal.signal(signal.SIGINT, force_exit)
    yield


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

    # Health check is public
    if request.url.path == "/health":
        response = await call_next(request)
    else:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid Authorization header"})

        token = auth_header.split(" ")[1]
        
        # Verify JWT against Supabase
        try:
            res = await asyncio.to_thread(
                requests.get,
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
                timeout=5
            )
            if res.status_code != 200:
                return JSONResponse(status_code=401, content={"detail": "Invalid or expired session"})
        except Exception:
            return JSONResponse(status_code=500, content={"detail": "Auth verification failed"})

        response = await call_next(request)
    
    # Inject enterprise-grade OWASP security headers
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none';"
    
    return response


active_call = None
broadcaster = Broadcaster()
stop_event = None


def cleanup_call():
    global active_call, stop_event
    active_call = None
    stop_event = None
    print("\n📞 Call ended. Ready for next call.\n")


@app.post("/start-call")
@limiter.limit("5/minute")
async def start_call(data: PatientData, request: Request):
    global active_call, broadcaster, stop_event

    if active_call is not None and not active_call.done():
        raise HTTPException(status_code=400, detail="A call is already active")

    broadcaster.reset()

    print("\n" + "=" * 50)
    print(f"📞 INCOMING: {data.patientFirstName} {data.patientLastName} ({data.insurance})")
    print("=" * 50)
    print("\a", end="", flush=True)

    try:
        answer = await asyncio.to_thread(input, "Accept? (y/n): ")
        if answer.strip().lower() != "y":
            print("❌ Rejected.\n")
            raise HTTPException(status_code=403, detail="All representatives are busy")
    except EOFError:
        raise HTTPException(status_code=403, detail="All representatives are busy")

    print("✅ Connected — speaking to VOBI.\n")

    stop_event = asyncio.Event()

    from bot import start_bot
    active_call = asyncio.create_task(start_bot(data.model_dump(), broadcaster, stop_event))

    active_call.add_done_callback(lambda _: cleanup_call())

    return {"message": "Call started successfully", "patient": data.patientFirstName}


@app.post("/end-call")
@limiter.limit("10/minute")
async def end_call(request: Request):
    global active_call, stop_event

    if stop_event is not None:
        stop_event.set()

    if active_call is not None and not active_call.done():
        active_call.cancel()
        try:
            await asyncio.wait_for(asyncio.shield(active_call), timeout=3.0)
        except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
            pass
        active_call = None

    await broadcaster.put({"type": "control", "message": "close"})
    return {"message": "Call ended successfully"}


@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    return {"status": "ok"}

@app.post("/availity/eligibility")
@limiter.limit("10/minute")
async def availity_eligibility(data: AvailityRequest, request: Request):
    return fetch_eligibility(data)


@app.get("/messages")
@limiter.limit("2/second")
async def get_messages(request: Request, since: int = 0):
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
