from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CptBenefitItem:
    code: str
    description: str = ""
    covered: str = "Pending"
    allowedAmount: str = "Not stated"
    copay: str = "Not stated"
    coinsurance: str = "Not stated"
    priorAuthRequired: str = "Not stated"

    def to_dict(self) -> dict[str, str]:
        return {
            "code": self.code,
            "description": self.description,
            "covered": self.covered,
            "allowedAmount": self.allowedAmount,
            "copay": self.copay,
            "coinsurance": self.coinsurance,
            "priorAuthRequired": self.priorAuthRequired,
        }


@dataclass
class BenefitLedger:
    job_id: str
    patient_name: str = ""
    insurance: str = ""
    member_id: str = ""
    dob: str = ""
    provider_name: str = ""
    practice_name: str = ""
    npi: str = ""
    cpt_codes: list[str] = field(default_factory=list)

    headline: str = ""
    repName: str = "Not stated"
    referenceNumber: str = "Not stated"
    eligibilityStatus: str = "Pending"
    benefitYear: str = "Not stated"
    networkStatus: str = "Pending"
    planType: str = "Not stated"

    deductibleIndividual: str = "Not stated"
    deductibleRemaining: str = "Not stated"
    oopMaxIndividual: str = "Not stated"
    oopMaxRemaining: str = "Not stated"
    copay: str = "Not stated"
    coinsurance: str = "Not stated"

    buyAndBill: str = "Not stated"
    benefitChannel: str = "Not stated"
    pcpReferralRequired: str = "Not stated"
    priorAuthRequired: str = "Not stated"
    priorAuthPhone: str = "Not stated"
    priorAuthFax: str = "Not stated"
    formularyPreferred: str = "Not stated"

    cptBreakdown: list[dict[str, Any]] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    verified: bool = False

    @classmethod
    def from_patient_data(cls, data: dict[str, Any]) -> "BenefitLedger":
        codes = [c for c in (data.get("cptCodes") or []) if c]
        first = (data.get("patientFirstName") or "").strip()
        last = (data.get("patientLastName") or "").strip()
        practice = (data.get("providerOrgName") or "").strip()
        provider = (data.get("providerName") or "").strip() or practice
        breakdown = [
            CptBenefitItem(
                code=code,
                description="Injection / Drug" if code.upper().startswith("J") else "Procedure / Visit",
            ).to_dict()
            for code in codes
        ]
        return cls(
            job_id=str(data.get("id") or ""),
            patient_name=f"{first} {last}".strip(),
            insurance=str(data.get("insurance") or ""),
            member_id=str(data.get("memberId") or ""),
            dob=str(data.get("dob") or ""),
            provider_name=provider,
            practice_name=practice,
            npi=str(data.get("npi") or ""),
            cpt_codes=codes,
            cptBreakdown=breakdown,
        )

    def apply_patch(self, patch: dict[str, Any]) -> None:
        if not isinstance(patch, dict):
            return

        scalar_fields = (
            "headline",
            "repName",
            "referenceNumber",
            "eligibilityStatus",
            "benefitYear",
            "networkStatus",
            "planType",
            "deductibleIndividual",
            "deductibleRemaining",
            "oopMaxIndividual",
            "oopMaxRemaining",
            "copay",
            "coinsurance",
            "buyAndBill",
            "benefitChannel",
            "pcpReferralRequired",
            "priorAuthRequired",
            "priorAuthPhone",
            "priorAuthFax",
            "formularyPreferred",
        )
        for key in scalar_fields:
            val = patch.get(key)
            if isinstance(val, str) and val.strip() and val.strip().lower() not in ("not stated", "pending", "null"):
                setattr(self, key, val.strip())

        if isinstance(patch.get("cptBreakdown"), list) and patch["cptBreakdown"]:
            by_code = {str(item.get("code", "")).upper(): item for item in self.cptBreakdown}
            for incoming in patch["cptBreakdown"]:
                if not isinstance(incoming, dict):
                    continue
                c = str(incoming.get("code") or "").strip().upper()
                if not c:
                    continue
                target = by_code.get(c)
                if not target:
                    target = CptBenefitItem(code=c).to_dict()
                    self.cptBreakdown.append(target)
                    by_code[c] = target
                for k in ("description", "covered", "allowedAmount", "copay", "coinsurance", "priorAuthRequired"):
                    v = incoming.get(k)
                    if isinstance(v, str) and v.strip() and v.strip().lower() not in ("not stated", "unknown", "pending", "null"):
                        target[k] = v.strip()

        if isinstance(patch.get("notes"), list):
            clean_notes = [str(n).strip() for n in patch["notes"] if str(n).strip()]
            if clean_notes:
                self.notes = clean_notes[:6]

    def to_checklist(self) -> dict[str, str]:
        def _has(val: str) -> bool:
            return bool(val and val.strip().lower() not in ("not stated", "pending", "null", ""))

        cl: dict[str, str] = {
            "eligibility": "complete" if _has(self.eligibilityStatus) else "pending",
            "networkStatus": "complete" if (_has(self.networkStatus) or _has(self.planType)) else "pending",
            "deductible": "complete" if (_has(self.deductibleIndividual) or _has(self.deductibleRemaining)) else "pending",
            "oopMax": "complete" if (_has(self.oopMaxIndividual) or _has(self.oopMaxRemaining)) else "pending",
            "copay": "complete" if (_has(self.copay) or _has(self.coinsurance)) else "pending",
            "buyAndBill": "complete" if (_has(self.buyAndBill) or _has(self.benefitChannel)) else "pending",
            "priorAuth": "complete" if _has(self.priorAuthRequired) else "pending",
            "referral": "complete" if _has(self.pcpReferralRequired) else "pending",
            "formulary": "complete" if _has(self.formularyPreferred) else "pending",
            "referenceNumber": "complete" if _has(self.referenceNumber) else "pending",
        }
        for idx in (0, 1):
            key = f"cpt{idx + 1}"
            if idx < len(self.cpt_codes):
                code = self.cpt_codes[idx].upper()
                item = next((x for x in self.cptBreakdown if str(x.get("code", "")).upper() == code), None)
                is_done = bool(item and (_has(item.get("covered", "")) or _has(item.get("allowedAmount", ""))))
                cl[key] = "complete" if is_done else "pending"
            else:
                cl[key] = "n/a"
        return cl

    def to_dict(self) -> dict[str, Any]:
        return {
            "headline": self.headline
            or f"Benefits verification for {self.patient_name or 'patient'} ({self.insurance or 'Payer'}).",
            "repName": self.repName,
            "referenceNumber": self.referenceNumber,
            "eligibilityStatus": self.eligibilityStatus,
            "benefitYear": self.benefitYear,
            "networkStatus": self.networkStatus,
            "planType": self.planType,
            "deductibleIndividual": self.deductibleIndividual,
            "deductibleRemaining": self.deductibleRemaining,
            "oopMaxIndividual": self.oopMaxIndividual,
            "oopMaxRemaining": self.oopMaxRemaining,
            "copay": self.copay,
            "coinsurance": self.coinsurance,
            "buyAndBill": self.buyAndBill,
            "benefitChannel": self.benefitChannel,
            "pcpReferralRequired": self.pcpReferralRequired,
            "priorAuthRequired": self.priorAuthRequired,
            "priorAuthPhone": self.priorAuthPhone,
            "priorAuthFax": self.priorAuthFax,
            "formularyPreferred": self.formularyPreferred,
            "cptBreakdown": self.cptBreakdown,
            "notes": self.notes,
            "verified": self.verified,
        }

