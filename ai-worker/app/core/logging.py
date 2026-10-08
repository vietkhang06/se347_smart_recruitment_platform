"""Structured logging configuration for MatchaJob AI Worker."""

import logging
import sys
from app.core.config import get_settings


def setup_logging() -> None:
    """Configure standard logging with clean structured format."""
    settings = get_settings()
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
        force=True,
    )


logger = logging.getLogger("matchajob.ai_worker")
