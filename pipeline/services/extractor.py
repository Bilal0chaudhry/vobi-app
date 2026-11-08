from __future__ import annotations

import json
import logging
import os
from typing import Any

from openai import AsyncOpenAI

from services.ledger import BenefitLedger

logger = logging.getLogger("vobi.extractor")

EXTRACTOR_MODEL = os.getenv("EXTRACTOR_MODEL", os.getenv("VOICE_MODEL", "gpt-5.4-mini"))
VERIFIER_MODEL = os.getenv("VERIFIER_MODEL", os.getenv("VOICE_MODEL", "gpt-5.4-mini"))

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


_EXTRACTION_PROMPT = """You are a medical billing benefits extraction engine.
Given the patient's requested CPT/HCPCS codes, the current structured Benefit Ledger JSON, and the latest call transcript turns between VOBI (billing specialist) and REP (insurance representative), extract all stated insurance benefit values into the exact JSON schema below.

Rules:
- Only populate a field when the insurance representative (REP) has confirmed or stated it. Otherwise keep its existing value or "Not stated".
- Format dollar figures cleanly (e.g. "$50", "$20 remaining") and percentages with "%" (e.g. "20%").
- For `headline`, write a crisp 1-2 sentence executive summary of the patient's coverage, network status, deductible/OOP, and code coverage so the billing staff does not need to read the transcript.
- For `notes`, include 1 to 4 concise, actionable bullet strings highlighting important call details, limitations, or follow-up items (e.g., if the rep asked the office to call back for formulary details, or if specific allowed amounts like "2 vials" were stated).

Return ONLY valid JSON with these exact keys:
{
  "headline": "string",
  "repName": "string",
  "referenceNumber": "string",
  "eligibilityStatus": "string (e.g. Active, Inactive, Not stated)",
  "benefitYear": "string (e.g. 2026)",
  "networkStatus": "string (e.g. In-Network, Out-of-Network, Not stated)",
  "planType": "string (e.g. HMO, PPO, POS, EPO, Not stated)",
  "deductibleIndividual": "string",
  "deductibleRemaining": "string",
  "oopMaxIndividual": "string",
  "oopMaxRemaining": "string",
  "copay": "string",
  "coinsurance": "string",
  "buyAndBill": "string (e.g. Yes - Allowed, Not Allowed, Not stated)",
  "benefitChannel": "string (e.g. Medical Benefit, Specialty Pharmacy, Not stated)",
  "pcpReferralRequired": "string (e.g. No, Yes, Not stated)",
  "priorAuthRequired": "string (e.g. No, Yes, Not stated)",
  "priorAuthPhone": "string",
  "priorAuthFax": "string",
  "formularyPreferred": "string",
  "cptBreakdown": [
    {
      "code": "string",
      "description": "string",
      "covered": "string (e.g. Covered, Not Covered, Pending)",
      "allowedAmount": "string",
      "copay": "string",
      "coinsurance": "string",
      "priorAuthRequired": "string"
    }
  ],
  "notes": ["string"]
}"""


def _extra_body_for(model: str) -> dict[str, Any]:
    if model.startswith(("gpt-5", "gpt-6")):
        return {"reasoning_effort": "none"}
    return {}


async def update_ledger_from_turns(
    ledger: BenefitLedger,
    transcript_turns: list[dict[str, str]],
    *,
    is_final: bool = False,
) -> dict[str, Any]:
    if not transcript_turns:
        return ledger.to_dict()

    model = VERIFIER_MODEL if is_final else EXTRACTOR_MODEL
    formatted_turns = "\n".join(
        f"{t.get('source', 'UNKNOWN')}: {t.get('message', '')}"
        for t in transcript_turns
        if t.get("source") in ("VOBI", "REP") and t.get("message")
    )
    if not formatted_turns.strip():
        return ledger.to_dict()

    user_content = (
        f"Patient: {ledger.patient_name} | Payer: {ledger.insurance} | "
        f"Requested CPT/HCPCS Codes: {', '.join(ledger.cpt_codes) or 'None'}\n\n"
        f"Current Ledger JSON:\n{json.dumps(ledger.to_dict())}\n\n"
        f"Call Transcript:\n{formatted_turns}"
    )

    try:
        client = _get_client()
        kwargs: dict[str, Any] = {
            "model": model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": _EXTRACTION_PROMPT},
                {"role": "user", "content": user_content},
            ],
        }
        extra = _extra_body_for(model)
        if extra:
            kwargs.update(extra)

        resp = await client.chat.completions.create(**kwargs)
        content = resp.choices[0].message.content or "{}"
        parsed = json.loads(content)
        ledger.apply_patch(parsed)
        if is_final:
            ledger.verified = True
    except Exception as exc:
        logger.warning("Ledger extraction pass failed: %r", exc)

    return ledger.to_dict()

