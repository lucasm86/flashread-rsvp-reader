import { WebSocketServer } from "ws";

export const LOCAL_SERVER_PORT = 17652;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://");
}

/**
 * Local, loopback-only WebSocket server the browser extension talks to.
 * Bound to 127.0.0.1 (never 0.0.0.0) and rejects connections whose Origin
 * header isn't a browser extension origin.
 */
export function startLocalServer(onText: (text: string) => void): WebSocketServer {
  const wss = new WebSocketServer({ host: "127.0.0.1", port: LOCAL_SERVER_PORT });

  wss.on("connection", (socket, request) => {
    if (!isAllowedOrigin(request.headers.origin)) {
      socket.close();
      return;
    }

    socket.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg && msg.type === "read-text" && typeof msg.text === "string" && msg.text.trim()) {
          onText(msg.text);
          socket.send(JSON.stringify({ type: "ack" }));
        }
      } catch {
        // ignore malformed messages
      }
    });
  });

  wss.on("error", (err) => {
    console.error("[localServer] error:", err.message);
  });

  return wss;
}
