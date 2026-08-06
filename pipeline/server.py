import os
import sys

os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
        "client_secret": CLIENT_SECRET
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
    
    coverage_url = "https://api.availity.com/coverages/v1/coverages"
    payload = {
        "submitter": {"npi": data.npi or "1234567890"},
        "provider": {"npi": data.npi or "1234567890"},
        "subscriber": {
            "memberId": data.memberId,
            "firstName": data.patientFirstName,
            "lastName": data.patientLastName,
            "genderCode": data.gender,
            "birthDate": data.dob,
        },
        "payer": {"payerId": "AETNA"} 
    }
    
    if data.stateCode or data.zipCode:
        payload["subscriber"]["address"] = {}
        if data.stateCode:
            payload["subscriber"]["address"]["stateCode"] = data.stateCode
        if data.zipCode:
            payload["subscriber"]["address"]["zipCode"] = data.zipCode
            
    if data.groupNumber:
        payload["payer"]["groupNumber"] = data.groupNumber
    
    api_response = None
    try:
        req = urllib.request.Request(coverage_url, data=json.dumps(payload).encode("utf-8"))
        req.add_header("Content-Type", "application/json")
        req.add_header("Authorization", f"Bearer {access_token}")
        
        with urllib.request.urlopen(req) as response:
            api_response = json.loads(response.read().decode())
    except Exception as e:
        print("Error calling Availity Coverages API:", e)
        api_response = {"error": str(e), "message": "API call failed, returning mock data for UI demo"}
    
    return {
        "patient": {
            "name": f"{data.patientFirstName} {data.patientLastName}",
            "memberId": data.memberId,
            "dob": data.dob,
            "gender": "Unknown",
            "relationship": "Self"
        },
        "coverage": {
            "status": "Active" if "error" not in api_response else "Pending/Error",
            "planType": "PPO",
            "effectiveDate": "2023-01-01",
            "copay": 25
        },
        "benefits": [
            { "name": "Co-Insurance", "inNetwork": True, "percent": 20 },
            { "name": "Deductible", "inNetwork": True, "amount": 500 }
        ],
        "rawResponse": api_response
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
