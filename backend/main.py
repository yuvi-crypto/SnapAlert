"""
SnapAlert FastAPI application entry point.
"""
import logging
import os
import sys
from contextlib import asynccontextmanager

# Ensure the backend directory is on sys.path for consistent imports
# whether running locally (python -m uvicorn backend.main:app) or via Vercel.
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Detect Vercel serverless environment — APScheduler cannot run there.
_IS_VERCEL = bool(os.environ.get("VERCEL"))

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

    # APScheduler requires a persistent process — skip on Vercel serverless.
    if not _IS_VERCEL:
        start_scheduler()
        logger.info(
            f"📡 Polling RealEstateAPI every {settings.poll_interval_seconds}s | "
            f"Match threshold: {settings.match_threshold}"
        )
    else:
        logger.info("⚡ Running on Vercel — background poller disabled (serverless).")

    yield

    # Shutdown
    if not _IS_VERCEL:
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
    allow_origins=["*"],
    allow_credentials=False,
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
    # Run from the backend/ directory: python main.py
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
