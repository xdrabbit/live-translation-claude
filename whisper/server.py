"""
Faster-whisper transcription server.
Loads the model once at startup and serves transcription requests via HTTP.
Runs on port 8787 by default.
"""

import os
import tempfile
import logging
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, UploadFile, Form
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_SIZE = os.environ.get("WHISPER_MODEL", "large-v3")
DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "float16")
PORT = int(os.environ.get("WHISPER_PORT", "8787"))

app = FastAPI(title="Whisper Transcription Server")

model: WhisperModel | None = None


@app.on_event("startup")
async def load_model():
    global model
    logger.info(f"Loading whisper model: {MODEL_SIZE} on {DEVICE} ({COMPUTE_TYPE})")
    model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    logger.info("Model loaded successfully")


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: str = Form(default=None),
):
    """Transcribe an audio file. Optionally specify source language (es/en)."""
    suffix = Path(audio.filename or "audio.webm").suffix or ".webm"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp.flush()

        segments, info = model.transcribe(
            tmp.name,
            language=language,
            beam_size=5,
            vad_filter=True,
        )

        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())

    full_text = " ".join(text_parts)
    detected_language = info.language

    logger.info(f"Transcribed ({detected_language}): {full_text[:100]}...")

    return {
        "text": full_text,
        "language": detected_language,
        "language_probability": info.language_probability,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": model is not None}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)
