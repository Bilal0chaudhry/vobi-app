import os
import json
import logging
import urllib.request
import urllib.parse
from fastapi import HTTPException
from models import PortalRequest

logger = logging.getLogger("vobi")

def fetch_eligibility(data: PortalRequest):
    api_key = os.getenv("STEDI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stedi API key not configured")

    url = "https://healthcare.us.stedi.com/2024-04-01/change/medicalnetwork/eligibility/v3"
    
    # Format DOB from YYYY-MM-DD to YYYYMMDD for Stedi
    dob_formatted = data.dob.replace("-", "")

    # Map frontend payer names to Stedi's numerical Trading Partner Service IDs
    payer_map = {
        "Cigna": "62308",
        "Aetna": "60054",
        "UnitedHealthcare": "87726",
        "Humana": "61101",
        "Blue Cross Blue Shield": "SB720",
        "Medicare": "CMS",
        "Medicaid": "MEDICAID"
    }
    
    stedi_payer_id = payer_map.get(data.payer, data.payer)

    payload = {
        "tradingPartnerServiceId": stedi_payer_id,
        "provider": {
            "organizationName": data.providerOrgName,
            "npi": data.npi
        },
        "subscriber": {
            "firstName": data.patientFirstName,
            "lastName": data.patientLastName,
            "dateOfBirth": dob_formatted,
            "memberId": data.memberId
        },
        "encounter": {
            "serviceTypeCodes": ["30"]
        }
    }

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Key {api_key}",
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        try:
            err_json = json.loads(e.read().decode())
            if "errors" in err_json and len(err_json["errors"]) > 0:
                raise HTTPException(status_code=400, detail=err_json["errors"][0].get("description", "Stedi API Error"))
            else:
                raise HTTPException(status_code=400, detail="Failed to communicate with Payer")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=500, detail="Stedi API returned an error")
    except Exception as e:
        # Log the real cause server-side only — don't forward internal details to the client
        logger.error("Stedi network error: %s", e)
        raise HTTPException(status_code=500, detail="Unable to reach eligibility service. Please try again.")

    if "errors" in res_data and len(res_data["errors"]) > 0:
        err = res_data["errors"][0]
        raise HTTPException(status_code=400, detail=f"EDI Error: {err.get('description', 'Unknown Error')}")

    # Parse the response for the frontend and DB
    benefits = []
    copay = None
    deductible_ind = None
    deductible_fam = None
    oop_max_ind = None
    oop_max_fam = None
    coinsurance = None

    if "benefitsInformation" in res_data:
        for b in res_data["benefitsInformation"]:
            name = b.get("name", "")
            amt = b.get("benefitAmount")
            pct = b.get("benefitPercent")
            lvl = b.get("coverageLevelCode", "IND")
            in_network = b.get("inPlanNetworkIndicatorCode", "N") == "Y"
            
            # Extract high-level financials
            if name == "Co-Payment" and in_network and not copay:
                copay = amt
            if name == "Deductible" and in_network:
                if lvl == "IND" and not deductible_ind:
                    deductible_ind = amt
                elif lvl == "FAM" and not deductible_fam:
                    deductible_fam = amt
            if name == "Out of Pocket (Stop Loss)" and in_network:
                if lvl == "IND" and not oop_max_ind:
                    oop_max_ind = amt
                elif lvl == "FAM" and not oop_max_fam:
                    oop_max_fam = amt
            if name == "Co-Insurance" and in_network and not coinsurance:
                if pct:
                    coinsurance = str(float(pct) * 100) # 0.1 -> 10.0
            
            benefits.append({
                "name": name,
                "inNetwork": in_network,
                "amount": amt,
                "percent": str(float(pct) * 100) if pct else None,
                "level": lvl,
                "serviceTypes": ", ".join(b.get("serviceTypes", []))
            })

    # Return structured data
    patient = res_data.get("subscriber", {})
    plan = res_data.get("planStatus", [{}])[0]
    dates = res_data.get("planDateInformation", {})
    
    return {
        "patient": {
            "name": f"{patient.get('firstName', data.patientFirstName)} {patient.get('lastName', data.patientLastName)}",
            "memberId": patient.get("memberId", data.memberId),
            "dob": data.dob,
            "gender": patient.get("gender", "Unknown"),
            "groupNumber": patient.get("groupNumber", "")
        },
        "coverage": {
            "status": plan.get("status", "Unknown"),
            "planType": plan.get("planDetails", "Unknown"),
            "effectiveDate": dates.get("eligibilityBegin", ""),
            "copay": copay,
            "deductibleInNetwork": deductible_ind,
            "familyDeductible": deductible_fam,
            "oopMaxIndividual": oop_max_ind,
            "oopMaxFamily": oop_max_fam,
            "coinsurance": coinsurance,
        },
        "benefits": benefits
    }
