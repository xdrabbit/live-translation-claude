import { useEffect, useRef, useCallback, useState } from "react";

export function useWebSocket(url) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef({});

  const on = useCallback((event, handler) => {
    handlersRef.current[event] = handler;
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = url || `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const handler = handlersRef.current[data.type];
          if (handler) handler(data);
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Reconnect after 2 seconds
        setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [url]);

  return { connected, send, on };
}
