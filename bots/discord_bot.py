"""
Discord bot for ProjectIQ.
Supports slash commands and natural-language scheduling requests.
"""

import asyncio
import logging
import os
import sys
import time

import discord
from discord.ext import commands

from bot_client import run_agent

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("discord_bot")

TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
if not TOKEN or TOKEN.startswith("your-"):
    log.warning(
        "DISCORD_BOT_TOKEN not configured — discord bot is idle. "
        "Set DISCORD_BOT_TOKEN in .env to enable."
    )
    while True:
        time.sleep(3600)
BOT_API_TOKEN: str = ""  # per-guild auth token (simplified)

logging.basicConfig(level=logging.INFO)

intents = discord.Intents.default()
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready() -> None:
    logging.info("ProjectIQ Discord bot connected as %s", bot.user)
    await bot.tree.sync()


@bot.hybrid_command(name="schedule", description="View schedule or detect coverage gaps")
async def schedule_cmd(ctx: commands.Context) -> None:
    await ctx.defer()
    result = await run_agent("detect_gaps", {}, BOT_API_TOKEN)
    response = result.get("data", {}).get("response", "No data available.")
    await ctx.send(f"📅 **Schedule Analysis**\n```\n{response[:1800]}\n```")


@bot.hybrid_command(name="tasks", description="List and manage tasks")
async def tasks_cmd(ctx: commands.Context) -> None:
    await ctx.defer()
    result = await run_agent("create_task", {"list": True}, BOT_API_TOKEN)
    response = result.get("data", {}).get("response", "No tasks found.")
    await ctx.send(f"✅ **Tasks**\n```\n{response[:1800]}\n```")


@bot.hybrid_command(name="gaps", description="Check for staffing gaps")
async def gaps_cmd(ctx: commands.Context) -> None:
    await ctx.defer()
    result = await run_agent("check_coverage", {}, BOT_API_TOKEN)
    response = result.get("data", {}).get("response", "No coverage data.")
    await ctx.send(f"⚠️ **Coverage Check**\n```\n{response[:1800]}\n```")


@bot.event
async def on_message(message: discord.Message) -> None:
    if message.author.bot:
        return
    await bot.process_commands(message)

    if bot.user and bot.user.mentioned_in(message):
        text = message.content.replace(f"<@{bot.user.id}>", "").strip()
        if text:
            action = "detect_gaps" if "shift" in text.lower() else "check_coverage"
            result = await run_agent(action, {"query": text}, BOT_API_TOKEN)
            response = result.get("data", {}).get("response", "I couldn't process that.")
            await message.channel.send(response[:2000])


if __name__ == "__main__":
    bot.run(TOKEN)
