import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course, User, UserRole
from app.permissions import require_roles
from app.schemas import CourseCreate, CourseResponse
from app.security import get_current_user


router = APIRouter(prefix="/courses", tags=["courses"])


@router.post(
    "",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_course(
    course_data: CourseCreate,
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
) -> Course:
    normalized_code = course_data.code.strip().upper()

    existing_course = database.scalar(
        select(Course).where(Course.code == normalized_code)
    )

    if existing_course is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A course with this code already exists",
        )

    course = Course(
        code=normalized_code,
        title=course_data.title.strip(),
        description=course_data.description,
        instructor_id=current_user.id,
    )

    database.add(course)

    try:
        database.commit()
    except IntegrityError as error:
        database.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A course with this code already exists",
        ) from error

    database.refresh(course)
    return course


@router.get("", response_model=list[CourseResponse])
def list_courses(
    database: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[Course]:
    courses = database.scalars(
        select(Course).order_by(Course.created_at.desc())
    ).all()

    return list(courses)


@router.get("/{course_id}", response_model=CourseResponse)
def read_course(
    course_id: uuid.UUID,
    database: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Course:
    course = database.get(Course, course_id)

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return course