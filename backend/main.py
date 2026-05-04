from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from models import ProctorData
from calculos import calcular_proctor

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

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
assets_dir = frontend_dist / "assets"

if frontend_dist.exists():
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def servir_frontend(full_path: str):
        archivo = frontend_dist / full_path
        if full_path and archivo.is_file():
            return FileResponse(archivo)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {"message": "GeoCompact Pro API v5 funcionando"}
