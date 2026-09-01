from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.database import check_database_connection
from app.routers.auth import router as auth_router
from app.routers.courses import router as courses_router
from app.routers.documents import router as documents_router


app = FastAPI(
    title="CourseGround API",
    description="Responsible AI learning assistant platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(courses_router)
app.include_router(documents_router)


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "CourseGround API",
        "status": "running",
    }


@app.get("/health")
def health_check() -> dict[str, str]:
    try:
        check_database_connection()
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        ) from error

    return {
        "status": "healthy",
        "database": "connected",
    }