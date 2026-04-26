"""Shared HTTP client for bot workers to call the ProjectIQ backend."""

import os
import httpx

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")


async def call_api(
    method: str,
    path: str,
    *,
    token: str | None = None,
    json: dict | None = None,
) -> dict:
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=30) as client:
        response = await client.request(method, path, headers=headers, json=json)
        response.raise_for_status()
        return response.json()


async def run_agent(action: str, payload: dict, token: str) -> dict:
    return await call_api("POST", "/api/agents/run", token=token, json={"action": action, "payload": payload})
