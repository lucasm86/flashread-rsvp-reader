const FLASHREAD_WS_URL = "ws://127.0.0.1:17652";
const MENU_SELECTION_ID = "flashread-send-selection";
const MENU_PAGE_ID = "flashread-read-page";
const CONNECT_TIMEOUT_MS = 1500;
const FLASHREAD_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_SELECTION_ID,
    title: "Leer con FlashRead",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: MENU_PAGE_ID,
    title: "Leer página completa con FlashRead",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_SELECTION_ID) {
    const text = info.selectionText;
    if (text && text.trim()) sendToFlashRead({ type: "read-text", text });
    return;
  }
  if (info.menuItemId === MENU_PAGE_ID) {
    void handleReadPage(tab);
  }
});

function isPdfUrl(url) {
  const withoutQuery = url.split(/[?#]/)[0];
  return withoutQuery.toLowerCase().endsWith(".pdf");
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function handleReadPage(tab) {
  if (!tab || !tab.id || !tab.url) return;

  if (isPdfUrl(tab.url)) {
    try {
      const response = await fetch(tab.url);
      const buffer = await response.arrayBuffer();
      sendToFlashRead({ type: "read-file", ext: ".pdf", dataBase64: arrayBufferToBase64(buffer) });
    } catch {
      notify("No se pudo descargar el PDF de esta pestaña.");
    }
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => (document.body ? document.body.innerText : ""),
    });
    const text = (result || "").trim();
    if (text) sendToFlashRead({ type: "read-text", text });
    else notify("No se encontró texto en esta página.");
  } catch {
    notify("No se pudo leer el contenido de esta página.");
  }
}

function notify(message) {
  chrome.notifications.create({
    type: "basic",
    // 1x1 transparent PNG data URL — avoids bundling an icon asset for the MVP.
    iconUrl: FLASHREAD_ICON,
    title: "FlashRead",
    message,
  });
}

function sendToFlashRead(payload) {
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
    socket.send(JSON.stringify(payload));
  });

  socket.addEventListener("message", (event) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "error") notify(msg.message || "FlashRead no pudo procesar el contenido.");
    } catch {
      // ignore malformed replies
    }
    socket.close();
  });

  socket.addEventListener("error", () => {
    if (settled) return;
    settled = true;
    clearTimeout(timeout);
    notify("No se pudo conectar con FlashRead. ¿Está la app corriendo?");
  });
}
