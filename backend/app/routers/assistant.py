import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, User, UserRole
from app.permissions import require_roles
from app.schemas import (
    AssistantSource,
    InstructorAssistantRequest,
    InstructorAssistantResponse,
)
from app.services.ollama import generate_for_instructor
from app.services.retrieval import search_course_materials


router = APIRouter(
    prefix="/courses",
    tags=["instructor assistant"],
)


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


@router.post(
    "/{course_id}/assistant",
    response_model=InstructorAssistantResponse,
)
async def use_instructor_assistant(
    course_id: uuid.UUID,
    request: InstructorAssistantRequest,
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
) -> InstructorAssistantResponse:
    course = get_course_or_404(course_id, database)

    if (
        current_user.role != UserRole.ADMIN
        and course.instructor_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the course instructor can use "
                "this assistant"
            ),
        )

    retrieved_chunks = await search_course_materials(
        database=database,
        course_id=course.id,
        query=request.prompt,
        limit=5,
    )

    if not retrieved_chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No processed course materials are available. "
                "Upload and process a document first."
            ),
        )

    context_sections = [
        (
            f"Source: {chunk['filename']}\n"
            f"Content: {chunk['content']}"
        )
        for chunk in retrieved_chunks
    ]

    grounded_context = "\n\n---\n\n".join(context_sections)

    instructor_task = (
        f"Course: {course.code} — {course.title}\n\n"
        f"Instructor request:\n{request.prompt}\n\n"
        "Create material for the instructor to review. "
        "Use only the supplied course context. "
        "Do not generate answers intended for submission "
        "as graded student work. If the context is insufficient, "
        "clearly state what information is missing."
    )

    try:
        answer = await generate_for_instructor(
            instructor_task,
            grounded_context,
        )
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The local AI service is unavailable",
        ) from error

    sources = [
        AssistantSource(
            document_id=chunk["document_id"],
            filename=chunk["filename"],
            chunk_index=chunk["chunk_index"],
            content=chunk["content"],
            similarity=chunk["similarity"],
        )
        for chunk in retrieved_chunks
    ]

    return InstructorAssistantResponse(
        answer=answer,
        sources=sources,
    )