import React, { useEffect, useRef } from "react";
import "./TranscriptPane.css";

export default function TranscriptPane({ title, language, entries, streamingText, accentColor }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, streamingText]);

  return (
    <div className="transcript-pane" style={{ "--pane-accent": accentColor }}>
      <div className="pane-header">
        <span className="pane-dot" />
        <h2 className="pane-title">{title}</h2>
        <span className="pane-lang">{language}</span>
      </div>
      <div className="pane-content" ref={scrollRef}>
        {entries.length === 0 && !streamingText && (
          <p className="pane-empty">Conversation will appear here...</p>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="pane-entry">
            <span className="entry-speaker">{entry.speaker}</span>
            <p className="entry-text">{entry.text}</p>
          </div>
        ))}
        {streamingText && (
          <div className="pane-entry streaming">
            <p className="entry-text">{streamingText}<span className="cursor" /></p>
          </div>
        )}
      </div>
    </div>
  );
}
