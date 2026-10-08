"""API routes for CV extraction, vector embeddings, and semantic matching."""

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas.ai import (
    CVExtractResponse,
    EmbeddingsRequest,
    EmbeddingsResponse,
    MatchScoreRequest,
    MatchScoreResponse,
)
from app.services.extractor import extract_cv_text
from app.services.providers import get_ai_provider


router = APIRouter(prefix="/api/v1", tags=["AI & CV Processing"])


@router.post(
    "/cv/extract",
    response_model=CVExtractResponse,
    summary="Extract text and profile entities from binary CV",
)
async def extract_cv(file: UploadFile = File(...)):
    """Extract raw text and structured resume entities from PDF or DOCX file."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing.",
        )

    content = await file.read()
    try:
        raw_text, page_count = extract_cv_text(
            filename=file.filename,
            content=content,
            content_type=file.content_type or "",
        )
    except ValueError as e:
        error_msg = str(e)
        if "exceeds" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=error_msg,
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    provider = get_ai_provider()
    parsed_data = provider.extract_entities(raw_text)

    return CVExtractResponse(
        raw_text=raw_text,
        parsed_data=parsed_data,
        char_count=len(raw_text),
        page_count=page_count,
    )


@router.post(
    "/embeddings",
    response_model=EmbeddingsResponse,
    summary="Generate 1536-dimensional vector embeddings",
)
async def generate_embeddings(request: EmbeddingsRequest):
    """Generate dense vector embeddings (1536d) for input text strings."""
    if not request.texts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Texts array cannot be empty.",
        )

    provider = get_ai_provider()
    embeddings = provider.generate_embeddings(request.texts)

    return EmbeddingsResponse(
        embeddings=embeddings,
        dimension=1536,
        model="text-embedding-3-small",
    )


@router.post(
    "/match/score",
    response_model=MatchScoreResponse,
    summary="Calculate match score and evaluation rationale",
)
async def calculate_match_score(request: MatchScoreRequest):
    """Calculate semantic and skill matching score between job and CV."""
    if not request.cv_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CV text cannot be empty.",
        )

    provider = get_ai_provider()
    return provider.calculate_match(request)
