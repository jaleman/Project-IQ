"""
Notifier Agent — sends alerts via Telegram, Teams, and Discord.
Calls Gemma directly via Ollama (OpenAI-compatible API).
"""

import json
from typing import Any

import structlog

from .llm import chat

logger = structlog.get_logger()

SYSTEM_PROMPT = (
    "You are a communications specialist who crafts actionable notifications "
    "for busy teams. Given an event, decide the best delivery channel "
    "(telegram, teams, or discord) and write a concise message. "
    "Respond with valid JSON only (no prose, no code fences) using keys: "
    "channel (string), message (string), priority (low|medium|high)."
)


async def run(payload: dict, user_id: int) -> Any:
    user_prompt = f"Compose a notification for this event: {json.dumps(payload)}"

    response_text = await chat(SYSTEM_PROMPT, user_prompt)

    logger.info(
        "notifier_agent_complete",
        user_id=user_id,
        response_len=len(response_text),
    )

    return {
        "agent": "notifier",
        "response": response_text,
        "user_id": user_id,
    }
