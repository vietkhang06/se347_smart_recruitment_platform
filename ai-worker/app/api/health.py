"""Health check and probe endpoints for AI Worker."""

import time
from fastapi import APIRouter, Request, Response, status
from app.core.config import get_settings
from app.schemas.health import HealthResponse, ProbeResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Aggregate health status",
    description="Returns general operational information including uptime and environment.",
)
async def get_health(request: Request) -> HealthResponse:
    settings = get_settings()
    start_time = getattr(request.app.state, "start_time", time.time())
    uptime = max(0.0, time.time() - start_time)

    return HealthResponse(
        status="healthy",
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        environment=settings.APP_ENV,
        uptime_seconds=round(uptime, 2),
    )


@router.get(
    "/health/live",
    response_model=ProbeResponse,
    summary="Liveness probe",
    description="Confirms that the FastAPI process and event loop are responsive. Performs zero external network or database calls.",
)
async def get_liveness() -> ProbeResponse:
    return ProbeResponse(status="alive")


@router.get(
    "/health/ready",
    response_model=ProbeResponse,
    summary="Readiness probe",
    description="Confirms that the application has completed initialization and is ready to process traffic.",
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ProbeResponse,
            "description": "Worker is unready or currently shutting down.",
        }
    },
)
async def get_readiness(request: Request, response: Response) -> ProbeResponse:
    is_ready = getattr(request.app.state, "is_ready", False)

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ProbeResponse(status="unready")

    return ProbeResponse(status="ready")


@router.get(
    "/health/startup",
    response_model=ProbeResponse,
    summary="Startup probe",
    description="Confirms that application configuration and initial startup tasks have finished.",
)
async def get_startup(request: Request, response: Response) -> ProbeResponse:
    is_started = getattr(request.app.state, "is_started", False)

    if not is_started:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ProbeResponse(status="initializing")

    return ProbeResponse(status="initialized")
