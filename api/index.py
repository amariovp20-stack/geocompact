import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from calculos import calcular_proctor
from models import ProctorData

app = FastAPI(title="GeoCompact Pro API", version="5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"message": "GeoCompact Pro API v5 funcionando"}


@app.post("/calcular-proctor")
def calcular(data: ProctorData):
    return calcular_proctor(data)
