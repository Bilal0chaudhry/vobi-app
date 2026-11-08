from pydantic import BaseModel, Field, constr
from typing import List, Literal

# Strict constraint for CPT codes (4-5 alphanumeric chars)
CptCode = constr(pattern=r"^[a-zA-Z0-9]{4,5}$", max_length=5, strip_whitespace=True)

class PatientData(BaseModel):
    # Must be a valid Supabase UUID
    id: str = Field(..., pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", max_length=36)
    
    # Cap names at 50 chars and strip invisible malicious whitespace
    patientFirstName: str = Field(..., max_length=50, strip_whitespace=True)
    patientLastName: str = Field(..., max_length=50, strip_whitespace=True)
    
    # Strictly enforce YYYY-MM-DD
    dob: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", max_length=10)
    
    insurance: str = Field(..., max_length=100, strip_whitespace=True)
    memberId: str = Field(..., max_length=50, strip_whitespace=True)
    
    # Strictly enforce exactly 10 digits for NPI
    npi: str = Field(..., pattern=r"^\d{10}$", max_length=10)
    
    # Cap the array at 20 CPT codes max to prevent memory bloat
    cptCodes: List[CptCode] = Field(..., max_length=20)

    # Optional practice/provider/encounter fields for spoken prompt placeholders
    providerOrgName: str | None = Field("", max_length=100, strip_whitespace=True)
    providerName: str | None = Field("", max_length=100, strip_whitespace=True)
    taxId: str | None = Field("", max_length=20, strip_whitespace=True)
    callbackNumber: str | None = Field("", max_length=30, strip_whitespace=True)
    dos: str | None = Field("", max_length=20, strip_whitespace=True)
    dxCode: str | None = Field("", max_length=20, strip_whitespace=True)

    submitted: str = Field("", max_length=30)
    status: str = Field("", max_length=30)

class PortalRequest(BaseModel):
    payer: str = Field(..., max_length=100, strip_whitespace=True)
    memberId: str = Field(..., max_length=50, strip_whitespace=True)
    patientFirstName: str = Field(..., max_length=50, strip_whitespace=True)
    patientLastName: str = Field(..., max_length=50, strip_whitespace=True)
    
    dob: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$", max_length=10)
    
    npi: str = Field(..., pattern=r"^\d{10}$", max_length=10)
    providerOrgName: str = Field(..., max_length=100, strip_whitespace=True)


class TranscriptTurn(BaseModel):
    source: str = Field("", max_length=20)
    message: str = Field("", max_length=4000)


class SummaryRequest(BaseModel):
    patientFirstName: str = Field("", max_length=50)
    patientLastName: str = Field("", max_length=50)
    insurance: str = Field("", max_length=100)
    memberId: str = Field("", max_length=50)
    dob: str = Field("", max_length=20)
    providerOrgName: str = Field("", max_length=100)
    npi: str = Field("", max_length=20)
    cptCodes: List[str] = Field(default_factory=list, max_length=20)
    logs: List[TranscriptTurn] = Field(default_factory=list, max_length=500)
    regenerate: bool = Field(False)
