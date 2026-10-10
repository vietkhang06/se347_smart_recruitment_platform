"""Main FastAPI application entry point for MatchaJob AI Worker."""

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from app.api.health import router as health_router
from app.api.cv import router as cv_router
from app.core.config import get_settings
from app.core.logging import logger, setup_logging
from app.schemas.errors import ProblemDetail


from starlette.exceptions import HTTPException as StarletteHTTPException


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager handling application startup and graceful shutdown."""
    setup_logging()
    settings = get_settings()
    logger.info("Initializing %s v%s (environment: %s)...", settings.SERVICE_NAME, settings.VERSION, settings.APP_ENV)

    # Initialize application lifecycle state
    app.state.start_time = time.time()
    app.state.is_started = True
    app.state.is_ready = True
    logger.info("AI Worker foundation initialized and ready on port %d", settings.AI_WORKER_CONTAINER_PORT)

    yield

    # Graceful shutdown state transition
    logger.info("Initiating graceful shutdown of AI Worker...")
    app.state.is_ready = False
    logger.info("AI Worker successfully stopped.")


def create_application() -> FastAPI:
    """Application factory for MatchaJob AI Worker."""
    settings = get_settings()

    app = FastAPI(
        title="MatchaJob AI Worker",
        description="Specialized stateless compute microservice for MatchaJob AI operations.",
        version=settings.VERSION,
        lifespan=lifespan,
    )

    # Register routers
    app.include_router(health_router)
    app.include_router(cv_router)

    # Global RFC 7807 Exception Handlers
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        problem = ProblemDetail(
            type="https://matchajob.internal/errors/http-error",
            title=exc.detail if isinstance(exc.detail, str) else "HTTP Error",
            status=exc.status_code,
            detail=str(exc.detail),
            instance=str(request.url.path),
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=problem.model_dump(),
            media_type="application/problem+json",
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled server exception: %s", exc)
        problem = ProblemDetail(
            type="https://matchajob.internal/errors/internal-server-error",
            title="Internal Server Error",
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing the request.",
            instance=str(request.url.path),
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=problem.model_dump(),
            media_type="application/problem+json",
        )

    return app


app = create_application()
