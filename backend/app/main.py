from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .auth_models import Registration, Login
from .routes.tree import router as tree_router
from .routes.emergency import router as emergency_router
from .routes.animal import router as animal_router
from .routes.auth import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Karmachakra API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIR)),
    name="uploads"
)

app.include_router(tree_router)
app.include_router(emergency_router)
app.include_router(animal_router)
app.include_router(auth_router)


@app.get("/")
def home():
    return {
        "message": "Karmachakra API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }