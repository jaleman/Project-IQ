"""
Availability Agent — monitors engineer capacity and flags overallocation.
Calls Gemma directly via Ollama (OpenAI-compatible API).
"""

import json
from typing import Any

import structlog

from .llm import chat

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are an engineering capacity analyst. "
    "Given a team's assignment data (user IDs, task IDs, allocation percentages, "
    "start/end dates), identify engineers who are overallocated (total allocation > 100%), "
    "engineers with available capacity, and scheduling conflicts where two tasks overlap "
    "in the same date range for the same engineer. "
    "Respond with valid JSON only (no prose, no code fences) using keys: "
    "overallocated (list of user_ids with total_pct), "
    "available (list of user_ids with available_pct), "
    "conflicts (list of {user_id, task_ids, overlap_dates}), "
    "capacity_score (integer 0-100, 100 = perfectly balanced), "
    "recommendations (list of strings)."
)


async def run(payload: dict, user_id: int) -> Any:
    user_prompt = f"Capacity data: {json.dumps(payload)}"

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
