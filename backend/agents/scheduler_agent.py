"""
Scheduler Agent — analyzes availability, assigns shifts, detects coverage gaps.
Calls Gemma directly via Ollama (OpenAI-compatible API) instead of going
through CrewAI's ReAct loop, which small models struggle to follow.
"""

import json
from typing import Any

import structlog

from .llm import chat

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are an expert workforce scheduler with years of experience in retail "
    "and healthcare staffing. Analyze scheduling requests and respond with a "
    "JSON object containing: assignments (list of shift assignments), gaps "
    "(list of coverage gaps), and recommendations (list of suggestions). "
    "Always respond with valid JSON only, no prose."
)


async def run(payload: dict, user_id: int) -> Any:
    user_prompt = payload.get(
        "description",
        f"Scheduling request: {json.dumps(payload)}",
    )

    response_text = await chat(SYSTEM_PROMPT, user_prompt)

    logger.info(
        "scheduler_agent_complete",
        user_id=user_id,
        response_len=len(response_text),
    )

    return {
        "agent": "scheduler",
        "action": payload.get("action", "schedule"),
        "response": response_text,
        "user_id": user_id,
    }
