from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.infrastructure.config import settings
from src.infrastructure.db.session import create_tables
from src.infrastructure.api.v1.routers.observations import router as obs_router
from src.infrastructure.api.v1.routers.compare import router as compare_router
from src.infrastructure.api.v1.routers.candidates import router as candidates_router
from src.infrastructure.api.v1.routers.wavelengths import router as wavelengths_router
from src.infrastructure.api.v1.routers.planet_x import router as planet_x_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables(settings.database_url)
    yield

app = FastAPI(
    title="SkyTrace API",
    description="NASA SPHEREx Multi-Epoch Sky Investigation & Transient Discovery Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$|^http:\/\/localhost:\d+$|^http:\/\/127\.0\.0\.1:\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(obs_router)
app.include_router(compare_router)
app.include_router(candidates_router)
app.include_router(wavelengths_router)
app.include_router(planet_x_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "skytrace-backend"}