"""
Task Manager Agent — tracks todos, handles completion notifications.
Calls Gemma directly via Ollama (OpenAI-compatible API).
"""

import json
from typing import Any

import structlog

from .llm import chat

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are a productivity coach who helps teams stay organized. "
    "Process task management requests and respond with valid JSON only "
    "(no prose, no code fences) using keys: priority (low|medium|high), "
    "next_steps (list of strings), notify_users (list of user identifiers)."
)


async def run(payload: dict, user_id: int) -> Any:
    user_prompt = f"Task management request: {json.dumps(payload)}"

    response_text = await chat(SYSTEM_PROMPT, user_prompt)

    logger.info(
        "task_agent_complete",
        user_id=user_id,
        response_len=len(response_text),
    )

    return {
        "agent": "task_manager",
        "response": response_text,
        "user_id": user_id,
    }
