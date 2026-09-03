"""add document chunks for rag

Revision ID: 1bbfe702ad29
Revises: aec700879c92
Create Date: 2026-09-01 21:35:42.602444
"""

from typing import Sequence, Union

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa


# Revision identifiers used by Alembic.
revision: str = "1bbfe702ad29"
down_revision: Union[str, Sequence[str], None] = "aec700879c92"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create storage for document chunks and vector embeddings."""

    op.create_table(
        "document_chunks",
        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            sa.UUID(),
            nullable=False,
        ),
        sa.Column(
            "chunk_index",
            sa.Integer(),
            nullable=False,
        ),
        sa.Column(
            "content",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "embedding",
            Vector(768),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["documents.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "document_id",
            "chunk_index",
            name="uq_document_chunks_document_index",
        ),
    )

    op.create_index(
        op.f("ix_document_chunks_document_id"),
        "document_chunks",
        ["document_id"],
        unique=False,
    )


def downgrade() -> None:
    """Remove document chunk and embedding storage."""

    op.drop_index(
        op.f("ix_document_chunks_document_id"),
        table_name="document_chunks",
    )
    op.drop_table("document_chunks")