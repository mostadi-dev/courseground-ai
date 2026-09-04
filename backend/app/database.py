from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


engine = create_engine(
    settings.app_database_url or settings.database_url,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


def set_request_database_context(
    database: Session,
    *,
    user_id: str,
    user_role: str,
) -> None:
    database.info["current_user_id"] = user_id
    database.info["current_user_role"] = user_role

    database.execute(
        text(
            """
            SELECT
                set_config('app.current_user_id', :user_id, true),
                set_config('app.current_user_role', :user_role, true)
            """
        ),
        {
            "user_id": user_id,
            "user_role": user_role,
        },
    )


@event.listens_for(SessionLocal, "after_begin")
def restore_database_context(
    session: Session,
    transaction: object,
    connection: object,
) -> None:
    user_id = session.info.get("current_user_id")
    user_role = session.info.get("current_user_role")

    if user_id is None or user_role is None:
        return

    connection.execute(
        text(
            """
            SELECT
                set_config('app.current_user_id', :user_id, true),
                set_config('app.current_user_role', :user_role, true)
            """
        ),
        {
            "user_id": user_id,
            "user_role": user_role,
        },
    )


def get_db() -> Generator[Session, None, None]:
    database = SessionLocal()

    try:
        yield database
    finally:
        database.close()


def check_database_connection() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return True