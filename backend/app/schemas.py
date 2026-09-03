import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import DocumentStatus, UserRole


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(
        min_length=2,
        max_length=200,
    )
    password: str = Field(
        min_length=8,
        max_length=128,
    )


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CourseCreate(BaseModel):
    code: str = Field(
        min_length=2,
        max_length=30,
        pattern=r"^[A-Za-z0-9_-]+$",
    )
    title: str = Field(
        min_length=2,
        max_length=200,
    )
    description: str | None = Field(
        default=None,
        max_length=2000,
    )


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    title: str
    description: str | None
    instructor_id: uuid.UUID
    created_at: datetime


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    uploaded_by: uuid.UUID
    original_filename: str
    content_type: str | None
    size_bytes: int
    status: DocumentStatus
    created_at: datetime


class InstructorAssistantRequest(BaseModel):
    prompt: str = Field(
        min_length=5,
        max_length=2000,
        description=(
            "Instructor request grounded in course materials"
        ),
    )


class AssistantSource(BaseModel):
    document_id: uuid.UUID
    filename: str
    chunk_index: int
    content: str
    similarity: float


class InstructorAssistantResponse(BaseModel):
    answer: str
    sources: list[AssistantSource]