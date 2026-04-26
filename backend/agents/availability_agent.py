"""
Availability Agent — monitors coverage windows and flags conflicts.
Calls Gemma directly via Ollama (OpenAI-compatible API).
"""

import json
from typing import Any

import structlog

from .llm import chat

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are an operations analyst who ensures teams are adequately staffed. "
    "Given availability data, identify coverage gaps, scheduling conflicts, "
    "and under-staffed time slots. Respond with valid JSON only (no prose, "
    "no code fences) using keys: gaps (list of time slots), conflicts (list), "
    "coverage_score (integer 0-100), recommendations (list of strings)."
)


async def run(payload: dict, user_id: int) -> Any:
    user_prompt = f"Availability data: {json.dumps(payload)}"

    response_text = await chat(SYSTEM_PROMPT, user_prompt)

    logger.info(
        "availability_agent_complete",
        user_id=user_id,
        response_len=len(response_text),
    )

    return {
        "agent": "availability",
        "response": response_text,
        "user_id": user_id,
    }
