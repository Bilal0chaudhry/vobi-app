import os
import sys
import signal
import socket
import time
import hashlib
import logging
import warnings
from contextlib import asynccontextmanager
import httpx

# Prefer IPv4 when dual-stack DNS returns unreachable IPv6 (AAAA) records first,
# which otherwise causes 5s ConnectTimeouts to Supabase/Cloudflare endpoints.
_orig_getaddrinfo = socket.getaddrinfo


def _ipv4_first_getaddrinfo(*args, **kwargs):
    res = _orig_getaddrinfo(*args, **kwargs)
    v4 = [r for r in res if r[0] == socket.AF_INET]
    return v4 if v4 else res


socket.getaddrinfo = _ipv4_first_getaddrinfo

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"
warnings.filterwarnings("ignore", category=DeprecationWarning)

from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import PatientData, PortalRequest, SummaryRequest
from utils.broadcaster import Broadcaster
from services.stedi import fetch_eligibility
from services.ledger import BenefitLedger
from services.extractor import update_ledger_from_turns

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


# Short-lived in-memory cache of verified JWTs (sha256(token) -> (user_id, expires_at))
# Avoids hitting Supabase /auth/v1/user over the network on every 500ms /messages poll.
_TOKEN_CACHE_TTL = 60.0
_token_cache: dict[str, tuple[str, float]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Single shared client — IPv4 transport + automatic connect retries
    transport = httpx.AsyncHTTPTransport(local_address="0.0.0.0", retries=2)
    app.state.http_client = httpx.AsyncClient(transport=transport, timeout=15.0)

    def force_exit(*args):
        logger.warning("Server stopped by signal.")
        os._exit(0)
    signal.signal(signal.SIGINT, force_exit)

    # Pre-warm bot imports in a background thread right as the server starts
    # so port 8000 is open immediately and torch/onnxruntime are warm before a call arrives.
    asyncio.create_task(asyncio.to_thread(__import__, "bot"))

    yield

    await app.state.http_client.aclose()


app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    logger.warning("Rate limit hit on %s", request.url.path)
    return _rate_limit_exceeded_handler(request, exc)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Log field names only (no PII values) and return a readable message to the UI
    fields = ", ".join(".".join(str(p) for p in err["loc"][1:]) or "body" for err in exc.errors())
    logger.warning("Rejected %s: invalid fields [%s]", request.url.path, fields)
    return JSONResponse(status_code=422, content={"detail": f"Invalid request data: {fields}"})


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
            logger.warning("Rejected %s: missing Authorization header", request.url.path)
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid Authorization header"})

        token = auth_header.split(" ")[1]
        token_key = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = time.monotonic()
        cached = _token_cache.get(token_key)
        if cached and cached[1] > now:
            request.state.user_id = cached[0]
        else:
            # Verify JWT against Supabase and extract the authenticated user's ID
            try:
                res = await request.app.state.http_client.get(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY},
                )
                if res.status_code != 200:
                    _token_cache.pop(token_key, None)
                    logger.warning("Rejected %s: Supabase session check returned %s", request.url.path, res.status_code)
                    return JSONResponse(status_code=401, content={"detail": "Invalid or expired session"})
                user_id = res.json().get("id")
                request.state.user_id = user_id
                if user_id:
                    _token_cache[token_key] = (user_id, now + _TOKEN_CACHE_TTL)
            except Exception as exc:
                logger.error("JWT auth verification failed: %r", exc)
                return JSONResponse(status_code=500, content={"detail": "Auth verification failed"})

        response = await call_next(request)
    
    # Inject enterprise-grade OWASP security headers
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none';"
    
    return response


# Registered last so it is the OUTERMOST middleware: every response — including
# 401s returned early by security_middleware — gets CORS headers, otherwise the
# browser hides the real error behind a generic "Failed to fetch".
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


MAX_CONCURRENT_CALLS = 10


class CallSession:
    def __init__(self, job_id: str, user_id: str, patient_data: dict):
        self.job_id = job_id
        self.user_id = user_id
        self.broadcaster = Broadcaster()
        self.stop_event = asyncio.Event()
        self.ledger = BenefitLedger.from_patient_data(patient_data)
        self.turns: list[dict[str, str]] = []
        self.task: asyncio.Task | None = None
        self.created_at = time.monotonic()


call_sessions: dict[str, CallSession] = {}
operator_prompt_lock = asyncio.Lock()


def cleanup_call(job_id: str, task: asyncio.Task | None = None):
    if task is not None and not task.cancelled():
        exc = task.exception()
        if exc is not None:
            logger.error("Call task for job %s failed with error: %r", job_id, exc)
    logger.info("Call ended for job %s.", job_id)
    # Prune oldest finished sessions if map grows large
    if len(call_sessions) > 50:
        finished = [
            (k, s.created_at)
            for k, s in call_sessions.items()
            if k != job_id and (s.task is None or s.task.done())
        ]
        finished.sort(key=lambda item: item[1])
        for k, _ in finished[: len(call_sessions) - 50]:
            call_sessions.pop(k, None)


@app.post("/start-call")
@limiter.limit("15/minute")
async def start_call(data: PatientData, request: Request):
    # Verify the job belongs to the authenticated user (prevents IDOR)
    authenticated_user_id = getattr(request.state, "user_id", None)
    if not authenticated_user_id:
        raise HTTPException(status_code=401, detail="Could not resolve authenticated user")

    existing = call_sessions.get(data.id)
    if existing is not None and existing.task is not None and not existing.task.done():
        raise HTTPException(status_code=400, detail="This call is already active")

    active_count = sum(
        1 for s in call_sessions.values() if s.task is not None and not s.task.done()
    )
    if active_count >= MAX_CONCURRENT_CALLS:
        raise HTTPException(status_code=429, detail="Maximum concurrent call capacity (10) reached")

    # Create an isolated CallSession for this job immediately so no stale messages
    # from any previous call or other job can ever bleed into this job.
    patient_dict = data.model_dump()
    session = CallSession(job_id=data.id, user_id=authenticated_user_id, patient_data=patient_dict)
    call_sessions[data.id] = session

    try:
        bearer = request.headers.get("Authorization", "").split(" ")[-1]
        ownership_res = await request.app.state.http_client.get(
            f"{SUPABASE_URL}/rest/v1/jobs",
            params={"id": f"eq.{data.id}", "user_id": f"eq.{authenticated_user_id}", "select": "id"},
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {bearer}"},
        )
        if ownership_res.status_code != 200 or not ownership_res.json():
            call_sessions.pop(data.id, None)
            raise HTTPException(status_code=403, detail="Job not found or access denied")
    except HTTPException:
        raise
    except Exception as exc:
        call_sessions.pop(data.id, None)
        logger.error("Job ownership check failed: %r", exc)
        raise HTTPException(status_code=500, detail="Could not verify job ownership")

    # Log call arrival without PII — job ID is sufficient for correlation
    logger.info("Incoming call request for job %s", data.id)
    print("\a", end="", flush=True)  # audible alert to operator terminal only

    try:
        async with operator_prompt_lock:
            answer = await asyncio.to_thread(input, f"Accept call [{data.id[:8]}]? (y/n): ")
        if answer.strip().lower() != "y":
            call_sessions.pop(data.id, None)
            logger.info("Call rejected by operator for job %s", data.id)
            raise HTTPException(status_code=403, detail="All representatives are busy")
    except EOFError:
        call_sessions.pop(data.id, None)
        raise HTTPException(status_code=403, detail="All representatives are busy")

    logger.info("Call accepted for job %s — initializing audio & STT/TTS connections...", data.id)

    from bot import start_bot
    ready_event = asyncio.Event()
    session.task = asyncio.create_task(
        start_bot(
            patient_dict,
            session.broadcaster,
            session.stop_event,
            session.ledger,
            session.turns,
            ready_event,
        )
    )
    session.task.add_done_callback(lambda t: cleanup_call(data.id, t))

    try:
        await asyncio.wait_for(ready_event.wait(), timeout=8.0)
    except asyncio.TimeoutError:
        logger.warning("Pipeline readiness wait timed out for job %s; continuing", data.id)

    logger.info("🎙️  Audio pipeline live for job %s — speak now!", data.id)

    return {"message": "Call started successfully", "jobId": data.id, "patient": data.patientFirstName}


@app.post("/end-call")
@limiter.limit("30/minute")
async def end_call(request: Request, job_id: str | None = None):
    authenticated_user_id = getattr(request.state, "user_id", None)

    target_sessions: list[CallSession] = []
    if job_id:
        session = call_sessions.get(job_id)
        if session and session.user_id == authenticated_user_id:
            target_sessions.append(session)
    else:
        target_sessions = [
            s for s in call_sessions.values()
            if s.user_id == authenticated_user_id and s.task is not None and not s.task.done()
        ]

    final_summary = None
    for session in target_sessions:
        session.stop_event.set()
        if session.task is not None and not session.task.done():
            session.task.cancel()
            try:
                await asyncio.wait_for(asyncio.shield(session.task), timeout=3.0)
            except (asyncio.CancelledError, asyncio.TimeoutError, Exception):
                pass
        if session.turns and not session.ledger.verified:
            try:
                await update_ledger_from_turns(session.ledger, session.turns, is_final=True)
            except Exception:
                pass
        final_summary = session.ledger.to_dict()
        await session.broadcaster.put({"type": "control", "message": "close"})

    return {"message": "Call ended successfully", "summary": final_summary}


@app.post("/calls/{job_id}/summary")
@limiter.limit("30/minute")
async def generate_call_summary(job_id: str, data: SummaryRequest, request: Request):
    authenticated_user_id = getattr(request.state, "user_id", None)
    if not authenticated_user_id:
        raise HTTPException(status_code=401, detail="Could not resolve authenticated user")

    # Fast path: if CallSession is in memory and already verified, return immediately
    session = call_sessions.get(job_id)
    if session and session.user_id == authenticated_user_id and not data.regenerate:
        if session.turns and not session.ledger.verified:
            await update_ledger_from_turns(session.ledger, session.turns, is_final=True)
        if session.ledger.verified:
            return {
                "summary": session.ledger.to_dict(),
                "checklist": session.ledger.to_checklist(),
            }

    # Verify job ownership in Supabase before running AI extraction
    try:
        bearer = request.headers.get("Authorization", "").split(" ")[-1]
        ownership_res = await request.app.state.http_client.get(
            f"{SUPABASE_URL}/rest/v1/jobs",
            params={"id": f"eq.{job_id}", "user_id": f"eq.{authenticated_user_id}", "select": "id"},
            headers={"apikey": SUPABASE_ANON_KEY, "Authorization": f"Bearer {bearer}"},
        )
        if ownership_res.status_code != 200 or not ownership_res.json():
            raise HTTPException(status_code=403, detail="Job not found or access denied")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Job ownership check failed for summary %s: %r", job_id, exc)
        raise HTTPException(status_code=500, detail="Could not verify job ownership")

    ledger = BenefitLedger.from_patient_data({
        "id": job_id,
        "patientFirstName": data.patientFirstName,
        "patientLastName": data.patientLastName,
        "insurance": data.insurance,
        "memberId": data.memberId,
        "dob": data.dob,
        "providerOrgName": data.providerOrgName,
        "npi": data.npi,
        "cptCodes": data.cptCodes,
    })
    turns = [{"source": t.source, "message": t.message} for t in data.logs if t.message]
    summary_dict = await update_ledger_from_turns(ledger, turns, is_final=True)
    return {
        "summary": summary_dict,
        "checklist": ledger.to_checklist(),
    }


@app.get("/health")
@limiter.limit("60/minute")
async def health_check(request: Request):
    return {"status": "ok"}

@app.post("/portal/eligibility")
@limiter.limit("10/minute")
async def check_eligibility(data: PortalRequest, request: Request):
    return fetch_eligibility(data)


@app.get("/messages")
@limiter.limit("120/second")
async def get_messages(request: Request, job_id: str | None = None, since: int = 0):
    authenticated_user_id = getattr(request.state, "user_id", None)
    if job_id:
        session = call_sessions.get(job_id)
    else:
        user_sessions = [
            s for s in call_sessions.values()
            if s.user_id == authenticated_user_id
        ]
        session = max(user_sessions, key=lambda s: s.created_at) if user_sessions else None

    if session is None or session.user_id != authenticated_user_id:
        return {
            "messages": [],
            "next": since,
            "done": False,
            "end_pending": False,
        }

    new_messages = session.broadcaster.get_messages_since(since)
    return {
        "messages": new_messages,
        "next": since + len(new_messages),
        "done": session.broadcaster.call_ended,
        "end_pending": session.broadcaster.end_call_pending,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning")
