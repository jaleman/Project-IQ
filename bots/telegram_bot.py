"""
Telegram bot for ProjectIQ.
Supports natural-language scheduling and task commands.
"""

import asyncio
import logging
import os
import sys
import time

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

from bot_client import run_agent

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("telegram_bot")

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
if not TOKEN or TOKEN.startswith("your-"):
    log.warning(
        "TELEGRAM_BOT_TOKEN not configured — telegram bot is idle. "
        "Set TELEGRAM_BOT_TOKEN in .env to enable."
    )
    while True:
        time.sleep(3600)

BOT_TOKEN: str = ""  # per-user auth token (simplified; use a session store in production)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "👋 Welcome to ProjectIQ!\n\n"
        "I can help you manage shifts and tasks. Try:\n"
        "• /schedule – view upcoming shifts\n"
        "• /tasks – list your tasks\n"
        "• /gaps – detect coverage gaps\n"
        "Or just type a natural-language request!"
    )


async def schedule_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    result = await run_agent("detect_gaps", {}, BOT_TOKEN)
    await update.message.reply_text(f"📅 Schedule analysis:\n{result.get('data', {}).get('response', 'No data')}")


async def tasks_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    result = await run_agent("create_task", {"list": True}, BOT_TOKEN)
    await update.message.reply_text(f"✅ Tasks:\n{result.get('data', {}).get('response', 'No data')}")


async def gaps_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    result = await run_agent("check_coverage", {}, BOT_TOKEN)
    await update.message.reply_text(f"⚠️ Coverage analysis:\n{result.get('data', {}).get('response', 'No data')}")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = update.message.text.lower()
    if any(w in text for w in ["schedule", "shift", "gap"]):
        action = "detect_gaps"
    elif any(w in text for w in ["task", "todo", "done"]):
        action = "create_task"
    else:
        action = "check_coverage"

    result = await run_agent(action, {"query": update.message.text}, BOT_TOKEN)
    response = result.get("data", {}).get("response", "I couldn't process that request.")
    await update.message.reply_text(response)


def main() -> None:
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("schedule", schedule_cmd))
    app.add_handler(CommandHandler("tasks", tasks_cmd))
    app.add_handler(CommandHandler("gaps", gaps_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.run_polling()


if __name__ == "__main__":
    main()
