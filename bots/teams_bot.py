"""
Microsoft Teams bot for ProjectIQ.
Receives webhook messages and calls the ProjectIQ backend agents.
"""

import asyncio
import logging
import os
from aiohttp import web

from bot_client import run_agent

TEAMS_WEBHOOK_URL = os.getenv("TEAMS_WEBHOOK_URL", "")
BACKEND_TOKEN: str = ""

logging.basicConfig(level=logging.INFO)

routes = web.RouteTableDef()


@routes.post("/api/teams/messages")
async def handle_message(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    text: str = body.get("text", "")
    from_name: str = body.get("from", {}).get("name", "Unknown")

    logging.info("Teams message from %s: %s", from_name, text)

    if any(w in text.lower() for w in ["shift", "schedule", "gap"]):
        action = "detect_gaps"
    elif any(w in text.lower() for w in ["task", "todo"]):
        action = "create_task"
    else:
        action = "check_coverage"

    result = await run_agent(action, {"query": text}, BACKEND_TOKEN)
    response_text = result.get("data", {}).get("response", "Unable to process request.")

    # Teams card response
    card = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {"type": "TextBlock", "text": "ProjectIQ Response", "weight": "Bolder"},
                        {"type": "TextBlock", "text": response_text, "wrap": True},
                    ],
                },
            }
        ],
    }
    return web.json_response(card)


async def main() -> None:
    app = web.Application()
    app.add_routes(routes)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 3978)
    logging.info("Teams bot listening on port 3978")
    await site.start()
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
