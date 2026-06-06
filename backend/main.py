"""
SnapAlert FastAPI application entry point.
"""
import logging
import os
import sys
from contextlib import asynccontextmanager

# Add backend directory to sys.path to resolve imports correctly when deployed on Vercel
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from routers.users import router as users_router
from routers.snapalert import router as snapalert_router
from services.poller import start_scheduler, stop_scheduler
from config import get_settings

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 SnapAlert starting up...")
    create_tables()
    start_scheduler()
    logger.info(
        f"📡 Polling RealEstateAPI every {settings.poll_interval_seconds}s | "
        f"Match threshold: {settings.match_threshold}"
    )
    yield
    # Shutdown
    stop_scheduler()
    logger.info("SnapAlert shut down")


app = FastAPI(
    title="SnapAlert API",
    description="Hyper-personalised deal alert engine for Snaphomz",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(users_router, prefix="/api")
app.include_router(snapalert_router, prefix="/api")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "SnapAlert",
        "version": "1.0.0",
        "poll_interval": settings.poll_interval_seconds,
        "match_threshold": settings.match_threshold,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
