from typing import Any

import httpx

from app.config import settings


class OllamaServiceError(RuntimeError):
    """Raised when CourseGround cannot obtain a valid response from Ollama."""


INSTRUCTOR_SYSTEM_PROMPT = """
You are CourseGround AI, a responsible assistant for course instructors.

You may help instructors:
- summarize their uploaded course materials;
- draft lesson outlines and learning objectives;
- create formative activities and discussion prompts;
- identify misconceptions and accessibility concerns;
- draft rubric criteria and feedback guidance.

You must not generate completed answers for graded student assignments,
exams, quizzes, or other assessed work.

Use only the course context provided by CourseGround when one is supplied.
Clearly state when the supplied context does not contain enough information.
Do not invent quotations, policies, citations, or course requirements.
""".strip()


async def _post(
    endpoint: str,
    payload: dict[str, Any],
    timeout_seconds: float = 120.0,
) -> dict[str, Any]:
    url = f"{settings.ollama_base_url.rstrip('/')}{endpoint}"

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(timeout_seconds),
        ) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise OllamaServiceError(
            "The local Ollama request timed out.",
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise OllamaServiceError(
            f"Ollama returned HTTP {exc.response.status_code}.",
        ) from exc
    except httpx.RequestError as exc:
        raise OllamaServiceError(
            "CourseGround could not connect to the local Ollama service.",
        ) from exc

    try:
        return response.json()
    except ValueError as exc:
        raise OllamaServiceError(
            "Ollama returned an invalid JSON response.",
        ) from exc


async def embed_texts(texts: list[str]) -> list[list[float]]:
    cleaned_texts = [text.strip() for text in texts if text.strip()]

    if not cleaned_texts:
        raise ValueError("At least one non-empty text is required.")

    data = await _post(
        "/api/embed",
        {
            "model": settings.ollama_embedding_model,
            "input": cleaned_texts,
        },
    )

    embeddings = data.get("embeddings")

    if not isinstance(embeddings, list):
        raise OllamaServiceError(
            "Ollama did not return an embeddings list.",
        )

    if len(embeddings) != len(cleaned_texts):
        raise OllamaServiceError(
            "Ollama returned an unexpected number of embeddings.",
        )

    for embedding in embeddings:
        if not isinstance(embedding, list):
            raise OllamaServiceError(
                "Ollama returned an invalid embedding.",
            )

        if len(embedding) != settings.ollama_embedding_dimensions:
            raise OllamaServiceError(
                "Ollama returned an embedding with an unexpected dimension.",
            )

    return embeddings


async def embed_text(text: str) -> list[float]:
    embeddings = await embed_texts([text])
    return embeddings[0]


async def generate_for_instructor(
    prompt: str,
    context: str | None = None,
) -> str:
    cleaned_prompt = prompt.strip()

    if not cleaned_prompt:
        raise ValueError("The instructor prompt cannot be empty.")

    if context and context.strip():
        user_message = (
            "COURSE CONTEXT:\n"
            f"{context.strip()}\n\n"
            "INSTRUCTOR REQUEST:\n"
            f"{cleaned_prompt}"
        )
    else:
        user_message = (
            "No course context was supplied.\n\n"
            "INSTRUCTOR REQUEST:\n"
            f"{cleaned_prompt}"
        )

    data = await _post(
        "/api/chat",
        {
            "model": settings.ollama_chat_model,
            "messages": [
                {
                    "role": "system",
                    "content": INSTRUCTOR_SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": user_message,
                },
            ],
            "stream": False,
            "think": False,
            "options": {
                "temperature": 0.2,
            },
        },
    )

    message = data.get("message")

    if not isinstance(message, dict):
        raise OllamaServiceError(
            "Ollama did not return a valid chat message.",
        )

    content = message.get("content")

    if not isinstance(content, str) or not content.strip():
        raise OllamaServiceError(
            "Ollama returned an empty response.",
        )

    return content.strip()