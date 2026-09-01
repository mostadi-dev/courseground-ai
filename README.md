# CourseGround AI

CourseGround AI is a full-stack learning platform that lets instructors securely manage courses and upload learning materials for future AI-assisted retrieval and conversation.

This project is being developed as a five-day portfolio sprint focused on learning technology, analytics, responsible AI, and production-oriented software development.

## Current features

- Secure registration and JWT authentication
- HTTP-only authentication cookies
- Role-based access control for students, instructors, and administrators
- Course creation and course workspaces
- Learning-document upload and metadata storage
- Live course and document dashboard statistics
- PostgreSQL database migrations with Alembic
- Interactive FastAPI OpenAPI documentation
- Responsive Next.js interface
- Dockerized PostgreSQL with pgvector support

## Technology stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- FastAPI
- Python
- SQLAlchemy
- Alembic
- Pydantic

### Data and infrastructure

- PostgreSQL
- pgvector
- Docker Compose
- Local document storage

## Architecture

The browser communicates with Next.js server-side API routes. These routes securely read the HTTP-only authentication cookie and forward authorized requests to FastAPI.

FastAPI handles authentication, authorization, business logic, document storage, and PostgreSQL persistence.

## Local setup

### 1. Configure the environment

Copy the example configuration:

```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env.local