import os
import sys

# Fix NLTK security import error before importing anything
os.environ["NLTK_DISABLE_IMPORT_SECURITY"] = "1"

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
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

@app.post("/start-call")
async def start_call(data: PatientData):
    global active_call
    if active_call is not None and not active_call.done():
        raise HTTPException(status_code=400, detail="A call is already in progress.")
    
    # Run the bot in a background task
    active_call = asyncio.create_task(start_bot(data.model_dump()))
    
    return {"message": "Call started successfully", "patient": data.patientFirstName}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
