"""Shared Ollama LLM helper used by all agents."""

from openai import AsyncOpenAI

from config import settings

_client = AsyncOpenAI(
    base_url=f"{settings.ollama_base_url}/v1",
    api_key="ollama",  # Ollama doesn't require a real key
)


async def chat(system: str, user: str) -> str:
    response = await _client.chat.completions.create(
        model=settings.ollama_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return response.choices[0].message.content or ""
