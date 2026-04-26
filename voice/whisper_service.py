"""
Whisper Voice Service — transcribes audio and maps it to ProjectIQ actions.
Exposes POST /transcribe and POST /command endpoints.
"""

import io
import logging
import os
import tempfile
from typing import Optional

import httpx
import structlog
import whisper
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")

logger = structlog.get_logger()
app = FastAPI(title="ProjectIQ Voice Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper model at startup
_model: Optional[whisper.Whisper] = None


def get_model() -> whisper.Whisper:
    global _model
    if _model is None:
        logger.info("Loading Whisper model", size=WHISPER_MODEL_SIZE)
        _model = whisper.load_model(WHISPER_MODEL_SIZE)
    return _model


def _map_to_action(text: str) -> tuple[str, dict]:
    """Map transcribed text to a backend agent action."""
    lower = text.lower()
    if any(w in lower for w in ["gap", "coverage", "short-staffed"]):
        return "check_coverage", {"query": text}
    if any(w in lower for w in ["schedule", "shift", "assign"]):
        return "schedule_shift", {"query": text}
    if any(w in lower for w in ["task", "todo", "complete", "done"]):
        return "create_task", {"query": text}
    if any(w in lower for w in ["notify", "alert", "send"]):
        return "send_notification", {"query": text}
    return "detect_gaps", {"query": text}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """Transcribe an audio file and return the text."""
    data = await audio.read()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        model = get_model()
        result = model.transcribe(tmp_path)
        text: str = result["text"].strip()
        return {"text": text}
    except Exception as exc:
        logger.error("Transcription failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Transcription failed")
    finally:
        os.unlink(tmp_path)


@app.post("/command")
async def voice_command(audio: UploadFile = File(...), token: str = ""):
    """Transcribe audio and execute the corresponding ProjectIQ agent action."""
    data = await audio.read()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        model = get_model()
        result = model.transcribe(tmp_path)
        text: str = result["text"].strip()
        logger.info("Voice command transcribed", text=text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")
    finally:
        os.unlink(tmp_path)

    action, payload = _map_to_action(text)

    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(base_url=BACKEND_URL, timeout=60) as client:
        try:
            resp = await client.post(
                "/api/agents/run",
                json={"action": action, "payload": payload},
                headers=headers,
            )
            resp.raise_for_status()
            agent_result = resp.json()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail="Agent call failed")

    return {
        "transcription": text,
        "action": action,
        "agent_result": agent_result.get("data"),
    }


@app.get("/health")
async def health():
    return {"status": "ok", "model": WHISPER_MODEL_SIZE}
