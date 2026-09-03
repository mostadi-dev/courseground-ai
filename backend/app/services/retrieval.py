from __future__ import annotations

import uuid
from typing import TypedDict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Document, DocumentChunk
from app.services.ollama import embed_text


class RetrievedChunk(TypedDict):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    content: str
    similarity: float


async def search_course_materials(
    database: Session,
    course_id: uuid.UUID,
    query: str,
    limit: int = 5,
) -> list[RetrievedChunk]:
    cleaned_query = query.strip()

    if not cleaned_query:
        return []

    query_embedding = await embed_text(cleaned_query)

    distance = DocumentChunk.embedding.cosine_distance(
        query_embedding
    ).label("distance")

    statement = (
        select(
            DocumentChunk.id,
            DocumentChunk.document_id,
            Document.original_filename,
            DocumentChunk.chunk_index,
            DocumentChunk.content,
            distance,
        )
        .join(
            Document,
            Document.id == DocumentChunk.document_id,
        )
        .where(Document.course_id == course_id)
        .order_by(distance)
        .limit(limit)
    )

    rows = database.execute(statement).all()

    return [
        RetrievedChunk(
            chunk_id=row.id,
            document_id=row.document_id,
            filename=row.original_filename,
            chunk_index=row.chunk_index,
            content=row.content,
            similarity=max(0.0, min(1.0, 1.0 - float(row.distance))),
        )
        for row in rows
    ]