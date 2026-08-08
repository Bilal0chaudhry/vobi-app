import os
import json
import datetime
import urllib.request
import urllib.parse
from fastapi import HTTPException
from models import AvailityRequest

PAYER_ID_MAP = {
    "Aetna": "60054",
    "Blue Cross": "00474",
    "Cigna": "62308",
    "United Healthcare": "87726",
    "Humana": "61101",
    "Medicare": "00431",
    "Medicaid": "Varies",
}


def get_availity_token() -> str:
    client_id = os.getenv("AVAILITY_CLIENT_ID")
    client_secret = os.getenv("AVAILITY_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Availity credentials not configured")

    token_data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "healthcare-hipaa-transactions-demo-demo healthcare-hipaa-transactions-demo",
    }).encode("utf-8")

    try:
        req = urllib.request.Request(
            "https://api.availity.com/v1/token",
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode()).get("access_token")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to authenticate with Availity")


def clean_financial(val):
    if isinstance(val, str):
        return val.replace("$", "").strip()
    return val


def fetch_eligibility(data: AvailityRequest):
    access_token = get_availity_token()
    payer_id = PAYER_ID_MAP.get(data.payer, "60054")

    payload = {
        "payerId": payer_id,
        "provider": {"npi": data.npi or "1234567890"},
        "patient": {
            "firstName": data.patientFirstName,
            "lastName": data.patientLastName,
            "dateOfBirth": data.dob,
            "memberId": data.memberId,
        },
        "serviceDate": datetime.date.today().isoformat(),
        "serviceTypeCode": "30",
    }

    if data.stateCode or data.zipCode:
        payload["patient"]["address"] = {}
        if data.stateCode:
            payload["patient"]["address"]["stateCode"] = data.stateCode
        if data.zipCode:
            payload["patient"]["address"]["zipCode"] = data.zipCode

    if data.groupNumber:
        payload["groupNumber"] = data.groupNumber

    try:
        req = urllib.request.Request(
            "https://api.availity.com/v1/coverages",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}",
                "X-Api-Mock-Scenario-ID": "Coverages-Complete-i",
                "X-Api-Mock-Response": "true",
            },
        )
        with urllib.request.urlopen(req) as response:
            api_response = json.loads(response.read().decode())
    except urllib.error.HTTPError:
        raise HTTPException(status_code=500, detail="Failed to fetch eligibility data")
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch eligibility data")

    coverages = api_response.get("coverages", [])
    if not coverages:
        raise HTTPException(status_code=404, detail="No coverage data found")

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

    for b in raw_benefits:
        fin = b.get("financials", {})

        if "copay" in fin:
            copay = clean_financial(fin["copay"])
        if "deductible" in fin:
            deductible = clean_financial(fin["deductible"])
        if "coinsurance" in fin:
            coinsurance = clean_financial(fin["coinsurance"])

        benefits_list.append({
            "name": b.get("description", "Benefit"),
            "inNetwork": b.get("inNetwork", True),
            "amount": clean_financial(fin.get("deductible") or fin.get("copay")),
            "percent": clean_financial(fin.get("coinsurance")),
        })

    return {
        "patient": {
            "name": f"{patient.get('firstName', data.patientFirstName)} {patient.get('lastName', data.patientLastName)}",
            "memberId": subscriber.get("memberId", data.memberId),
            "dob": patient.get("birthDate", data.dob),
            "gender": patient.get("genderCode", "Unknown"),
            "relationship": patient.get("relationshipCode", "Self"),
        },
        "coverage": {
            "status": coverage.get("status", "Active"),
            "planType": plan.get("planType", "Unknown"),
            "effectiveDate": coverage.get("effectiveDate", ""),
            "copay": copay,
            "deductibleInNetwork": deductible,
            "coinsurance": coinsurance,
        },
        "benefits": benefits_list,
    }
