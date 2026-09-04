import uuid

from sqlalchemy import delete, select

from app.database import SessionLocal, set_request_database_context
from app.models import Course, User, UserRole


def test_row_level_security_isolates_instructor_courses() -> None:
    suffix = uuid.uuid4().hex[:8]

    instructor_one = User(
        email=f"instructor-one-{suffix}@example.test",
        full_name="Instructor One",
        hashed_password="not-used-in-this-database-test",
        role=UserRole.INSTRUCTOR,
    )
    instructor_two = User(
        email=f"instructor-two-{suffix}@example.test",
        full_name="Instructor Two",
        hashed_password="not-used-in-this-database-test",
        role=UserRole.INSTRUCTOR,
    )
    admin = User(
        email=f"admin-{suffix}@example.test",
        full_name="CourseGround Admin",
        hashed_password="not-used-in-this-database-test",
        role=UserRole.ADMIN,
    )

    with SessionLocal() as database:
        database.add_all([instructor_one, instructor_two, admin])
        database.commit()

        set_request_database_context(
            database,
            user_id=str(instructor_one.id),
            user_role=instructor_one.role.value,
        )
        course_one = Course(
            code=f"ONE-{suffix}".upper(),
            title="Instructor One Course",
            instructor_id=instructor_one.id,
        )
        database.add(course_one)
        database.commit()
        course_one_id = course_one.id

        set_request_database_context(
            database,
            user_id=str(instructor_two.id),
            user_role=instructor_two.role.value,
        )
        course_two = Course(
            code=f"TWO-{suffix}".upper(),
            title="Instructor Two Course",
            instructor_id=instructor_two.id,
        )
        database.add(course_two)
        database.commit()
        course_two_id = course_two.id

        set_request_database_context(
            database,
            user_id=str(instructor_one.id),
            user_role=instructor_one.role.value,
        )
        instructor_one_courses = database.scalars(
            select(Course)
            .where(Course.id.in_([course_one_id, course_two_id]))
            .order_by(Course.code)
        ).all()

        assert [course.id for course in instructor_one_courses] == [
            course_one_id
        ]

        set_request_database_context(
            database,
            user_id=str(instructor_two.id),
            user_role=instructor_two.role.value,
        )
        instructor_two_courses = database.scalars(
            select(Course)
            .where(Course.id.in_([course_one_id, course_two_id]))
            .order_by(Course.code)
        ).all()

        assert [course.id for course in instructor_two_courses] == [
            course_two_id
        ]

        set_request_database_context(
            database,
            user_id=str(admin.id),
            user_role=admin.role.value,
        )
        database.execute(
            delete(Course).where(
                Course.id.in_([course_one_id, course_two_id])
            )
        )
        database.execute(
            delete(User).where(
                User.id.in_([
                    instructor_one.id,
                    instructor_two.id,
                    admin.id,
                ])
            )
        )
        database.commit()