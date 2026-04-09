import React, { useState, useEffect, useCallback, useRef } from "react";
import RecordButton from "./components/RecordButton.jsx";
import TranscriptPane from "./components/TranscriptPane.jsx";
import { useWebSocket } from "./hooks/useWebSocket.js";
import { useAudioRecorder } from "./hooks/useAudioRecorder.js";
import "./App.css";

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function App() {
  const { connected, send, on } = useWebSocket();
  const { recording, start, stop } = useAudioRecorder();

  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  // Conversation entries: [{ speaker, text, language }]
  const [spanishEntries, setSpanishEntries] = useState([]);
  const [englishEntries, setEnglishEntries] = useState([]);

  // Streaming state
  const [streamingTranslation, setStreamingTranslation] = useState("");
  const [streamingPane, setStreamingPane] = useState(null); // "es" or "en"
  const turnCountRef = useRef(0);

  // Current transcription waiting for translation
  const pendingRef = useRef(null);

  // Register WebSocket handlers
  useEffect(() => {
    on("status", (data) => {
      setStatus(data.status);
      setError("");
    });

    on("transcription", (data) => {
      pendingRef.current = data;
      const speaker = `Speaker ${(turnCountRef.current % 2) + 1}`;

      if (data.language === "es") {
        setSpanishEntries((prev) => [...prev, { speaker, text: data.text }]);
        setStreamingPane("en"); // translation will stream into English pane
      } else {
        setEnglishEntries((prev) => [...prev, { speaker, text: data.text }]);
        setStreamingPane("es"); // translation will stream into Spanish pane
      }
    });

    on("translation_chunk", (data) => {
      setStreamingTranslation((prev) => prev + data.text);
    });

    on("translation_complete", (data) => {
      const speaker = `Speaker ${(turnCountRef.current % 2) + 1}`;
      turnCountRef.current++;

      if (data.targetLanguage === "en") {
        setEnglishEntries((prev) => [...prev, { speaker, text: data.translation }]);
      } else {
        setSpanishEntries((prev) => [...prev, { speaker, text: data.translation }]);
      }

      setStreamingTranslation("");
      setStreamingPane(null);
      setProcessing(false);
      setStatus("");
      pendingRef.current = null;
    });

    on("error", (data) => {
      setError(data.message);
      setProcessing(false);
      setStatus("");
      setStreamingTranslation("");
      setStreamingPane(null);
    });
  }, [on]);

  const handleToggleRecord = useCallback(async () => {
    if (recording) {
      const blob = await stop();
      if (!blob) return;

      setProcessing(true);
      setStreamingTranslation("");

      const base64 = await blobToBase64(blob);
      send({ type: "audio", audio: base64 });
    } else {
      setError("");
      await start();
    }
  }, [recording, start, stop, send]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Live Translation</h1>
        <div className={`connection-status ${connected ? "connected" : ""}`}>
          <span className="status-dot" />
          {connected ? "Connected" : "Connecting..."}
        </div>
      </header>

      <main className="app-main">
        <div className="transcript-container">
          <TranscriptPane
            title="Spanish"
            language="ES"
            entries={spanishEntries}
            streamingText={streamingPane === "es" ? streamingTranslation : ""}
            accentColor="var(--spanish)"
          />
          <TranscriptPane
            title="English"
            language="EN"
            entries={englishEntries}
            streamingText={streamingPane === "en" ? streamingTranslation : ""}
            accentColor="var(--english)"
          />
        </div>

        <div className="controls">
          {status && <div className="status-badge">{status === "transcribing" ? "Transcribing audio..." : "Translating..."}</div>}
          {error && <div className="error-badge">{error}</div>}
          <RecordButton
            recording={recording}
            processing={processing}
            onClick={handleToggleRecord}
            disabled={!connected}
          />
        </div>
      </main>
    </div>
  );
}
