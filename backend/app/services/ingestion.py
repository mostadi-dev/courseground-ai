from __future__ import annotations

from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Document, DocumentChunk, DocumentStatus
from app.services.ollama import embed_text


BACKEND_ROOT = Path(__file__).resolve().parents[2]

SUPPORTED_SUFFIXES = {
    ".txt",
    ".md",
    ".csv",
}

CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be non-negative and smaller than chunk_size"
        )

    normalized_text = " ".join(text.split())

    if not normalized_text:
        return []

    chunks: list[str] = []
    start = 0
    text_length = len(normalized_text)

    while start < text_length:
        end = min(start + chunk_size, text_length)

        if end < text_length:
            minimum_boundary = start + (chunk_size // 2)
            word_boundary = normalized_text.rfind(
                " ",
                minimum_boundary,
                end,
            )

            if word_boundary > start:
                end = word_boundary

        chunk = normalized_text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = max(end - overlap, start + 1)

    return chunks


def resolve_document_path(storage_path: str) -> Path:
    path = Path(storage_path)

    if path.is_absolute():
        return path

    candidates = [
        Path.cwd() / path,
        BACKEND_ROOT / path,
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()

    return candidates[0].resolve()


def read_document_text(document: Document) -> str:
    path = resolve_document_path(document.storage_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Uploaded document was not found: {path}"
        )

    if not path.is_file():
        raise ValueError(
            f"Document storage path is not a file: {path}"
        )

    if path.suffix.lower() not in SUPPORTED_SUFFIXES:
        raise ValueError(
            f"Unsupported document type: {path.suffix or 'unknown'}"
        )

    text = path.read_text(
        encoding="utf-8",
        errors="replace",
    ).strip()

    if not text:
        raise ValueError("The uploaded document contains no readable text")

    return text


async def ingest_document(
    db: Session,
    document: Document,
) -> int:
    document_id = document.id

    try:
        document.status = DocumentStatus.PROCESSING
        db.commit()

        text = read_document_text(document)
        chunks = chunk_text(text)

        if not chunks:
            raise ValueError(
                "The uploaded document produced no usable text chunks"
            )

        db.execute(
            delete(DocumentChunk).where(
                DocumentChunk.document_id == document_id
            )
        )

        for chunk_index, content in enumerate(chunks):
            embedding = await embed_text(content)

            if (
                len(embedding)
                != settings.ollama_embedding_dimensions
            ):
                raise ValueError(
                    "Ollama returned an unexpected embedding size: "
                    f"{len(embedding)} instead of "
                    f"{settings.ollama_embedding_dimensions}"
                )

            db.add(
                DocumentChunk(
                    document_id=document_id,
                    chunk_index=chunk_index,
                    content=content,
                    embedding=embedding,
                )
            )

        document.status = DocumentStatus.READY
        db.commit()
        db.refresh(document)

        return len(chunks)

    except Exception:
        db.rollback()

        failed_document = db.get(Document, document_id)

        if failed_document is not None:
            failed_document.status = DocumentStatus.FAILED
            db.commit()

        raise