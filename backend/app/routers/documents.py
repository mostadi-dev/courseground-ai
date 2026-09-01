import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Course,
    Document,
    DocumentStatus,
    Enrollment,
    User,
    UserRole,
)
from app.permissions import require_roles
from app.schemas import DocumentResponse
from app.security import get_current_user


router = APIRouter(prefix="/courses", tags=["documents"])

BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = BACKEND_ROOT / "uploads"

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".md",
    ".docx",
}

MAX_FILE_SIZE = 10 * 1024 * 1024
CHUNK_SIZE = 1024 * 1024


def get_course_or_404(
    course_id: uuid.UUID,
    database: Session,
) -> Course:
    course = database.get(Course, course_id)

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return course


def verify_course_access(
    course: Course,
    current_user: User,
    database: Session,
) -> None:
    if current_user.role == UserRole.ADMIN:
        return

    if course.instructor_id == current_user.id:
        return

    enrollment = database.scalar(
        select(Enrollment).where(
            Enrollment.course_id == course.id,
            Enrollment.user_id == current_user.id,
        )
    )

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this course",
        )


@router.post(
    "/{course_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    course_id: uuid.UUID,
    file: Annotated[UploadFile, File(description="Course document")],
    database: Annotated[Session, Depends(get_db)],
    current_user: Annotated[
        User,
        Depends(
            require_roles(
                UserRole.INSTRUCTOR,
                UserRole.ADMIN,
            )
        ),
    ],
) -> Document:
    course = get_course_or_404(course_id, database)

    if (
        current_user.role != UserRole.ADMIN
        and course.instructor_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the course instructor can upload documents",
        )

    original_filename = Path(file.filename or "").name

    if not original_filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A filename is required",
        )

    if len(original_filename) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is too long",
        )

    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF, TXT, Markdown, and DOCX files are allowed",
        )

    document_id = uuid.uuid4()
    course_directory = UPLOAD_ROOT / str(course.id)
    course_directory.mkdir(parents=True, exist_ok=True)

    destination = course_directory / f"{document_id}{extension}"
    size_bytes = 0

    try:
        with destination.open("wb") as output_file:
            while chunk := await file.read(CHUNK_SIZE):
                size_bytes += len(chunk)

                if size_bytes > MAX_FILE_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail="File cannot exceed 10 MB",
                    )

                output_file.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()

    if size_bytes == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty",
        )

    relative_storage_path = destination.relative_to(
        BACKEND_ROOT
    ).as_posix()

    document = Document(
        id=document_id,
        course_id=course.id,
        uploaded_by=current_user.id,
        original_filename=original_filename,
        storage_path=relative_storage_path,
        content_type=file.content_type,
        size_bytes=size_bytes,
        status=DocumentStatus.UPLOADED,
    )

    database.add(document)

    try:
        database.commit()
    except SQLAlchemyError as error:
        database.rollback()
        destination.unlink(missing_ok=True)

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the document",
        ) from error

    database.refresh(document)
    return document


@router.get(
    "/{course_id}/documents",
    response_model=list[DocumentResponse],
)
def list_documents(
    course_id: uuid.UUID,
    database: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Document]:
    course = get_course_or_404(course_id, database)
    verify_course_access(course, current_user, database)

    documents = database.scalars(
        select(Document)
        .where(Document.course_id == course.id)
        .order_by(Document.created_at.desc())
    ).all()

    return list(documents)