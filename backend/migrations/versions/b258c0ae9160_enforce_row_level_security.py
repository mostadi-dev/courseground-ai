"""enforce row level security

Revision ID: b258c0ae9160
Revises: 1bbfe702ad29
Create Date: 2026-09-04 09:05:15.583608

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "b258c0ae9160"
down_revision: Union[str, Sequence[str], None] = "1bbfe702ad29"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enforce course-data isolation in PostgreSQL."""

    op.execute(
        """
        CREATE FUNCTION current_app_user_id()
        RETURNS uuid
        LANGUAGE sql
        STABLE
        AS $$
            SELECT NULLIF(
                current_setting('app.current_user_id', true),
                ''
            )::uuid
        $$;

        CREATE FUNCTION current_app_is_admin()
        RETURNS boolean
        LANGUAGE sql
        STABLE
        AS $$
            SELECT current_setting(
                'app.current_user_role',
                true
            ) = 'admin'
        $$;

        ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
        ALTER TABLE courses FORCE ROW LEVEL SECURITY;

        ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;

        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE documents FORCE ROW LEVEL SECURITY;

        ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE document_chunks FORCE ROW LEVEL SECURITY;

        CREATE POLICY courses_read ON courses
        FOR SELECT
        USING (
            current_app_is_admin()
            OR instructor_id = current_app_user_id()
            OR EXISTS (
                SELECT 1
                FROM enrollments
                WHERE enrollments.course_id = courses.id
                  AND enrollments.user_id = current_app_user_id()
            )
        );

        CREATE POLICY courses_write ON courses
        FOR ALL
        USING (
            current_app_is_admin()
            OR instructor_id = current_app_user_id()
        )
        WITH CHECK (
            current_app_is_admin()
            OR instructor_id = current_app_user_id()
        );

        CREATE POLICY enrollments_read ON enrollments
        FOR SELECT
        USING (
            current_app_is_admin()
            OR user_id = current_app_user_id()
        );

        CREATE POLICY documents_read ON documents
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM courses
                WHERE courses.id = documents.course_id
            )
        );

        CREATE POLICY documents_write ON documents
        FOR ALL
        USING (
            current_app_is_admin()
            OR EXISTS (
                SELECT 1
                FROM courses
                WHERE courses.id = documents.course_id
                  AND courses.instructor_id = current_app_user_id()
            )
        )
        WITH CHECK (
            current_app_is_admin()
            OR (
                uploaded_by = current_app_user_id()
                AND EXISTS (
                    SELECT 1
                    FROM courses
                    WHERE courses.id = documents.course_id
                      AND courses.instructor_id = current_app_user_id()
                )
            )
        );

        CREATE POLICY document_chunks_read ON document_chunks
        FOR SELECT
        USING (
            EXISTS (
                SELECT 1
                FROM documents
                WHERE documents.id = document_chunks.document_id
            )
        );

        CREATE POLICY document_chunks_write ON document_chunks
        FOR ALL
        USING (
            current_app_is_admin()
            OR EXISTS (
                SELECT 1
                FROM documents
                JOIN courses ON courses.id = documents.course_id
                WHERE documents.id = document_chunks.document_id
                  AND courses.instructor_id = current_app_user_id()
            )
        )
        WITH CHECK (
            current_app_is_admin()
            OR EXISTS (
                SELECT 1
                FROM documents
                JOIN courses ON courses.id = documents.course_id
                WHERE documents.id = document_chunks.document_id
                  AND courses.instructor_id = current_app_user_id()
            )
        );
        """
    )


def downgrade() -> None:
    """Remove course-data isolation policies."""

    op.execute(
        """
        DROP POLICY document_chunks_write ON document_chunks;
        DROP POLICY document_chunks_read ON document_chunks;
        DROP POLICY documents_write ON documents;
        DROP POLICY documents_read ON documents;
        DROP POLICY enrollments_read ON enrollments;
        DROP POLICY courses_write ON courses;
        DROP POLICY courses_read ON courses;

        ALTER TABLE document_chunks DISABLE ROW LEVEL SECURITY;
        ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
        ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
        ALTER TABLE courses DISABLE ROW LEVEL SECURITY;

        DROP FUNCTION current_app_is_admin();
        DROP FUNCTION current_app_user_id();
        """
    )