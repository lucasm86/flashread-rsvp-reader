const FLASHREAD_WS_URL = "ws://127.0.0.1:17652";
const MENU_ID = "flashread-send-selection";
const CONNECT_TIMEOUT_MS = 1500;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: "Leer con FlashRead",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== MENU_ID) return;
  const text = info.selectionText;
  if (!text || !text.trim()) return;
  sendToFlashRead(text);
});

function notify(message) {
  chrome.notifications.create({
    type: "basic",
    // 1x1 transparent PNG data URL — avoids bundling an icon asset for the MVP.
    iconUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    title: "FlashRead",
    message,
  });
}

function sendToFlashRead(text) {
  let settled = false;
  let socket;

  const timeout = setTimeout(() => {
    if (settled) return;
    settled = true;
    socket && socket.close();
    notify("No se pudo conectar con FlashRead. ¿Está la app corriendo?");
  }, CONNECT_TIMEOUT_MS);

  try {
    socket = new WebSocket(FLASHREAD_WS_URL);
  } catch {
    clearTimeout(timeout);
    notify("No se pudo conectar con FlashRead. ¿Está la app corriendo?");
    return;
  }

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "read-text", text }));
  });

  socket.addEventListener("message", () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    socket.close();
  });

  socket.addEventListener("error", () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    notify("No se pudo conectar con FlashRead. ¿Está la app corriendo?");
  });
}
