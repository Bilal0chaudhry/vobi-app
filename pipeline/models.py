from pydantic import BaseModel

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
