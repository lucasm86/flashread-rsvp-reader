interface FlashReadPasteAPI {
  openReaderWithText: (text: string) => void;
  extractFileText: (filePath: string) => Promise<string>;
  getPathForFile: (file: File) => string;
}

interface Window {
  flashreadPaste: FlashReadPasteAPI;
}

(function () {
  const dropzone = document.getElementById("dropzone") as HTMLDivElement;
  const textInput = document.getElementById("text-input") as HTMLTextAreaElement;
  const fileStatus = document.getElementById("file-status") as HTMLParagraphElement;
  const btnRead = document.getElementById("btn-read") as HTMLButtonElement;

  const SUPPORTED = [".txt", ".pdf", ".docx"];

  function setStatus(message: string, isError = false): void {
    fileStatus.textContent = message;
    fileStatus.classList.toggle("error", isError);
  }

  function startReading(): void {
    const text = textInput.value.trim();
    if (!text) {
      setStatus("Escribí o pegá texto, o arrastrá un archivo.", true);
      return;
    }
    window.flashreadPaste.openReaderWithText(text);
  }

  async function handleFile(file: File): Promise<void> {
    const lower = file.name.toLowerCase();
    if (!SUPPORTED.some((ext) => lower.endsWith(ext))) {
      setStatus(`Formato no soportado: ${file.name}`, true);
      return;
    }
    setStatus(`Leyendo ${file.name}…`);
    try {
      const path = window.flashreadPaste.getPathForFile(file);
      const text = await window.flashreadPaste.extractFileText(path);
      textInput.value = text;
      setStatus(`Listo: ${file.name} (${text.length} caracteres)`);
    } catch (err) {
      setStatus(`Error al leer ${file.name}: ${(err as Error).message}`, true);
    }
  }

  btnRead.addEventListener("click", startReading);

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      startReading();
    }
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) void handleFile(file);
  });
})();
