import uuid

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import app
from app.schemas import InstructorAssistantRequest


client = TestClient(app)


def test_root_returns_application_status() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "name": "CourseGround API",
        "status": "running",
    }


def test_health_reports_database_connection() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "healthy",
        "database": "connected",
    }


def test_courses_require_authentication() -> None:
    response = client.get("/courses")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_current_user_requires_authentication() -> None:
    response = client.get("/auth/me")

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_instructor_assistant_requires_authentication() -> None:
    course_id = uuid.uuid4()

    response = client.post(
        f"/courses/{course_id}/assistant",
        json={
            "prompt": (
                "Create formative discussion questions "
                "without providing answers."
            ),
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_assistant_schema_rejects_short_prompt() -> None:
    with pytest.raises(ValidationError):
        InstructorAssistantRequest(prompt="AI")


def test_assistant_schema_accepts_valid_prompt() -> None:
    request = InstructorAssistantRequest(
        prompt=(
            "Create three formative discussion questions "
            "without providing answers."
        ),
    )

    assert request.prompt.startswith("Create three")