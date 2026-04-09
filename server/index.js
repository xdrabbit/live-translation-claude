import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { transcribeAudio } from "./transcribe.js";
import { translateText } from "./translate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = process.env.PORT || 3001;

const app = express();
const server = createServer(app);

// Serve static client build in production (if it exists)
const clientDist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// WebSocket server
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (data) => {
    try {
      // Messages are JSON with { type, language, audio (base64) }
      const message = JSON.parse(data.toString());

      if (message.type === "audio") {
        await handleAudio(ws, message);
      }
    } catch (err) {
      console.error("Error processing message:", err);
      send(ws, { type: "error", message: err.message });
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

async function handleAudio(ws, message) {
  const { audio, language } = message;
  const audioBuffer = Buffer.from(audio, "base64");

  // Step 1: Transcribe
  send(ws, { type: "status", status: "transcribing" });

  let transcription;
  try {
    transcription = await transcribeAudio(audioBuffer, language);
  } catch (err) {
    send(ws, { type: "error", message: `Transcription failed: ${err.message}` });
    return;
  }

  if (!transcription.text || transcription.text.trim() === "") {
    send(ws, { type: "error", message: "No speech detected in audio" });
    return;
  }

  const detectedLang = transcription.language || language;

  // Send transcription result immediately
  send(ws, {
    type: "transcription",
    text: transcription.text,
    language: detectedLang,
  });

  // Step 2: Translate with streaming
  send(ws, { type: "status", status: "translating" });

  try {
    const fullTranslation = await translateText(
      transcription.text,
      detectedLang,
      (chunk) => {
        send(ws, { type: "translation_chunk", text: chunk });
      }
    );

    send(ws, {
      type: "translation_complete",
      original: transcription.text,
      translation: fullTranslation,
      sourceLanguage: detectedLang,
      targetLanguage: detectedLang === "es" ? "en" : "es",
    });
  } catch (err) {
    send(ws, { type: "error", message: `Translation failed: ${err.message}` });
  }
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// Fallback to index.html for SPA routing (production only)
if (fs.existsSync(clientDist)) {
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});
