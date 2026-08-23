import os
import sys
import signal
import logging
import warnings
from contextlib import asynccontextmanager
import httpx

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

from models import PatientData, PortalRequest
from utils.broadcaster import Broadcaster
from services.stedi import fetch_eligibility

ALLOWED_ORIGINS = [
    "https://bilal0chaudhry.github.io",
    "http://localhost:5173",
    "http://localhost:4173",
]

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    sys.exit("FATAL: Supabase environment variables missing. Refusing to start without security.")

logging.basicConfig(
    level=logging.WARNING,  # suppress third-party library noise
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("vobi")
logger.setLevel(logging.INFO)  # our own logger emits at INFO and above

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Single shared client — one connection pool for the lifetime of the server
    app.state.http_client = httpx.AsyncClient(timeout=5)

    def force_exit(*args):
        logger.warning("Server stopped by signal.")
        os._exit(0)
    signal.signal(signal.SIGINT, force_exit)

    yield

    await app.state.http_client.aclose()


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
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
        
        # Verify JWT against Supabase and extract the authenticated user's ID
        try:
            res = await request.app.state.http_client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
            )
            if res.status_code != 200:
                return JSONResponse(status_code=401, content={"detail": "Invalid or expired session"})
            # Store authenticated user ID so route handlers can use it without a second call
            request.state.user_id = res.json().get("id")
        except Exception as exc:
            logger.error("JWT auth verification failed: %s", exc)
            return JSONResponse(status_code=500, content={"detail": "Auth verification failed"})

        response = await call_next(request)
    
    # Inject enterprise-grade OWASP security headers
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none';"
    
    return response


active_call = None
broadcaster = Broadcaster()
stop_event = None


def cleanup_call():
    global active_call, stop_event
    active_call = None
    stop_event = None
    logger.info("Call ended. Ready for next call.")


@app.post("/start-call")
@limiter.limit("5/minute")
async def start_call(data: PatientData, request: Request):
    global active_call, broadcaster, stop_event

    if active_call is not None and not active_call.done():
        raise HTTPException(status_code=400, detail="A call is already active")

    # Verify the job belongs to the authenticated user (prevents IDOR)
    authenticated_user_id = getattr(request.state, "user_id", None)
    if not authenticated_user_id:
        raise HTTPException(status_code=401, detail="Could not resolve authenticated user")

    try:
        bearer = request.headers.get("Authorization", "").split(" ")[-1]
        ownership_res = await request.app.state.http_client.get(
            f"{SUPABASE_URL}/rest/v1/jobs",
            params={"id": f"eq.{data.id}", "user_id": f"eq.{authenticated_user_id}", "select": "id"},
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {bearer}"},
        )
        if ownership_res.status_code != 200 or not ownership_res.json():
            raise HTTPException(status_code=403, detail="Job not found or access denied")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Job ownership check failed: %s", exc)
        raise HTTPException(status_code=500, detail="Could not verify job ownership")

    broadcaster.reset()

    # Log call arrival without PII — job ID is sufficient for correlation
    logger.info("Incoming call request for job %s", data.id)
    print("\a", end="", flush=True)  # audible alert to operator terminal only

    try:
        answer = await asyncio.to_thread(input, "Accept? (y/n): ")
        if answer.strip().lower() != "y":
            logger.info("Call rejected by operator for job %s", data.id)
            raise HTTPException(status_code=403, detail="All representatives are busy")
    except EOFError:
        raise HTTPException(status_code=403, detail="All representatives are busy")

    logger.info("Call accepted for job %s", data.id)

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

@app.post("/portal/eligibility")
@limiter.limit("10/minute")
async def check_eligibility(data: PortalRequest, request: Request):
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
