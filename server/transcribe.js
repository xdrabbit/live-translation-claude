import FormData from "form-data";

const WHISPER_URL =
  process.env.WHISPER_URL || "http://localhost:8787/transcribe";

/**
 * Send audio buffer to the faster-whisper server for transcription.
 * @param {Buffer} audioBuffer - Raw audio bytes
 * @param {string} language - Expected source language ("es" or "en")
 * @param {string} filename - Original filename for mime-type inference
 * @returns {Promise<{text: string, language: string}>}
 */
export async function transcribeAudio(audioBuffer, language, filename = "audio.webm") {
  const form = new FormData();
  form.append("audio", audioBuffer, { filename, contentType: "audio/webm" });
  if (language) {
    form.append("language", language);
  }

  const response = await fetch(WHISPER_URL, {
    method: "POST",
    body: form,
    headers: form.getHeaders(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Whisper transcription failed (${response.status}): ${err}`);
  }

  return response.json();
}
