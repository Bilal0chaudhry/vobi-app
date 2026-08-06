import os
import sys

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

from dotenv import load_dotenv
load_dotenv(dotenv_path="../.env")

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import json
import urllib.request
import urllib.parse

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
    submitted: str = ""
    status: str = ""

class AvailityRequest(BaseModel):
    payer: str
    memberId: str
    patientFirstName: str
    patientLastName: str
    dob: str
    gender: str = "U"
    stateCode: str = ""
    zipCode: str = ""
    groupNumber: str = ""
    npi: str
    cptCodes: list[str]

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
    
    from bot import start_bot
    active_call = asyncio.create_task(start_bot(data.model_dump(), event_queue, stop_event))
    
    return {"message": "Call started successfully", "patient": data.patientFirstName}

@app.post("/end-call")
async def end_call():
    global active_call, event_queue, stop_event
    if stop_event is not None:
        stop_event.set()
    
    if active_call is not None and not active_call.done():
        active_call.cancel()
        active_call = None
        
    if event_queue is not None:
        await event_queue.put({"type": "control", "message": "close"})
    return {"message": "Call ended successfully"}

@app.post("/availity/eligibility")
async def availity_eligibility(data: AvailityRequest):
    CLIENT_ID = os.getenv("AVAILITY_CLIENT_ID")
    CLIENT_SECRET = os.getenv("AVAILITY_CLIENT_SECRET")
    
    token_url = "https://api.availity.com/v1/token"
    token_data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope": "healthcare-hipaa-transactions-demo-demo healthcare-hipaa-transactions-demo"
    }).encode("utf-8")
    
    try:
        req = urllib.request.Request(token_url, data=token_data)
        req.add_header("Content-Type", "application/x-www-form-urlencoded")
        
        with urllib.request.urlopen(req) as response:
            token_res = json.loads(response.read().decode())
            access_token = token_res.get("access_token")
    except Exception as e:
        print("Error getting Availity token:", e)
        raise HTTPException(status_code=500, detail="Failed to authenticate with Availity")
    
    coverage_url = "https://api.availity.com/v1/coverages"
    
    PAYER_ID_MAP = {
        "Aetna": "60054",
        "Blue Cross": "00474",
        "Cigna": "62308",
        "United Healthcare": "87726",
        "Humana": "61101",
        "Medicare": "00431",
        "Medicaid": "Varies"
    }
    payer_id = PAYER_ID_MAP.get(data.payer, "60054")
    
    payload = {
        "payerId": payer_id,
        "provider": {"npi": data.npi or "1234567890"},
        "patient": {
            "firstName": data.patientFirstName,
            "lastName": data.patientLastName,
            "dateOfBirth": data.dob,
            "memberId": data.memberId
        },
        "serviceDate": "2026-08-06",
        "serviceTypeCode": "30"
    }
    
    if data.stateCode or data.zipCode:
        payload["patient"]["address"] = {}
        if data.stateCode:
            payload["patient"]["address"]["stateCode"] = data.stateCode
        if data.zipCode:
            payload["patient"]["address"]["zipCode"] = data.zipCode
            
    if data.groupNumber:
        payload["groupNumber"] = data.groupNumber
    
    api_response = None
    try:
        req = urllib.request.Request(coverage_url, data=json.dumps(payload).encode("utf-8"))
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Bearer {access_token}")
        req.add_header("X-Api-Mock-Scenario-ID", "Coverages-Complete-i")
        req.add_header("X-Api-Mock-Response", "true")
        
        with urllib.request.urlopen(req) as response:
            api_response = json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print("Error calling Availity Coverages API (HTTP):", e.code, error_body)
        raise HTTPException(status_code=500, detail="failed to fetch data")
    except Exception as e:
        print("Error calling Availity Coverages API:", e)
        raise HTTPException(status_code=500, detail="failed to fetch data")
        
    coverages = api_response.get("coverages", [])
    if not coverages:
        raise HTTPException(status_code=404, detail="failed to fetch data")
        
    coverage = coverages[0]
    subscriber = coverage.get("subscriber", {})
    patient = coverage.get("patient", subscriber)
    
    plans = coverage.get("plans", [])
    plan = plans[0] if plans else {}
    
    raw_benefits = plan.get("benefits", [])
    benefits_list = []
    copay = None
    deductible = None
    coinsurance = None
    
    def clean_financial(val):
        if isinstance(val, str):
            return val.replace("$", "").strip()
        return val

    for b in raw_benefits:
        name = b.get("description", "Benefit")
        fin = b.get("financials", {})
        
        if "copay" in fin:
            copay = clean_financial(fin["copay"])
        if "deductible" in fin:
            deductible = clean_financial(fin["deductible"])
        if "coinsurance" in fin:
            coinsurance = clean_financial(fin["coinsurance"])
            
        benefits_list.append({
            "name": name,
            "inNetwork": b.get("inNetwork", True),
            "amount": clean_financial(fin.get("deductible") or fin.get("copay")),
            "percent": clean_financial(fin.get("coinsurance"))
        })

    return {
        "patient": {
            "name": f"{patient.get('firstName', data.patientFirstName)} {patient.get('lastName', data.patientLastName)}",
            "memberId": subscriber.get("memberId", data.memberId),
            "dob": patient.get("birthDate", data.dob),
            "gender": patient.get("genderCode", "Unknown"),
            "relationship": patient.get("relationshipCode", "Self")
        },
        "coverage": {
            "status": coverage.get("status", "Active"),
            "planType": plan.get("planType", "Unknown"),
            "effectiveDate": coverage.get("effectiveDate", ""),
            "copay": copay,
            "deductibleInNetwork": deductible,
            "coinsurance": coinsurance
        },
        "benefits": benefits_list
    }

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
