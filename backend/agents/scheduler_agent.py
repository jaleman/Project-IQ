"""
Scheduler Agent — analyzes engineer capacity, suggests task assignments,
and detects overallocation across the team.
Calls Gemma directly via Ollama (OpenAI-compatible API).
"""

import json
from typing import Any

import structlog

from .llm import chat

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are an expert engineering resource manager. "
    "Analyze task assignment requests and respond with a JSON object containing: "
    "assignments (list of suggested user-to-task assignments with allocation_pct), "
    "overloaded_engineers (list of engineers exceeding 100% allocation), "
    "and recommendations (list of suggestions for balancing workload). "
    "Consider start_date, due_date, and estimated_hours when making suggestions. "
    "Always respond with valid JSON only, no prose."
)


async def run(payload: dict, user_id: int) -> Any:
    user_prompt = payload.get(
        "description",
        f"Resource assignment request: {json.dumps(payload)}",
    )

    response_text = await chat(SYSTEM_PROMPT, user_prompt)

    logger.info(
        "scheduler_agent_complete",
        user_id=user_id,
        response_len=len(response_text),
    )

    return {
        "agent": "scheduler",
        "action": payload.get("action", "assign_resource"),
        "response": response_text,
        "user_id": user_id,
    }
