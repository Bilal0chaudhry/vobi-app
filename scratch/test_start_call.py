import requests

payload = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "patientFirstName": "James",
    "patientLastName": "Jones",
    "dob": "1991-02-02",
    "insurance": "Cigna",
    "memberId": "23456789100",
    "npi": "1999999984",
    "cptCodes": ["99214"],
    "submitted": "Just now",
    "status": "Agent on Call"
}

try:
    res = requests.post("http://localhost:8000/start-call", json=payload)
    print("Status:", res.status_code)
    print("Body:", res.json())
except Exception as e:
    print(e)
