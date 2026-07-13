interface ReaderSettingsForm {
  wpm: number;
  chunkSize: number;
  usePunctuationPauses: boolean;
  sentencePauseMultiplier: number;
  commaPauseMultiplier: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  orpColor: string;
  backgroundColor: string;
  alwaysOnTop: boolean;
  globalShortcut: string;
  showTextPanel: boolean;
}

interface FlashReadSettingsAPI {
  getSettings: () => Promise<ReaderSettingsForm>;
  updateSettings: (partial: Partial<ReaderSettingsForm>) => Promise<ReaderSettingsForm>;
}

interface Window {
  flashreadSettings: FlashReadSettingsAPI;
}

(function () {
  const form = document.getElementById("settings-form") as HTMLFormElement;
  const saveStatus = document.getElementById("save-status") as HTMLSpanElement;

  const fields = {
    wpm: document.getElementById("wpm") as HTMLInputElement,
    chunkSize: document.getElementById("chunkSize") as HTMLSelectElement,
    usePunctuationPauses: document.getElementById("usePunctuationPauses") as HTMLInputElement,
    sentencePauseMultiplier: document.getElementById("sentencePauseMultiplier") as HTMLInputElement,
    commaPauseMultiplier: document.getElementById("commaPauseMultiplier") as HTMLInputElement,
    fontSize: document.getElementById("fontSize") as HTMLInputElement,
    fontFamily: document.getElementById("fontFamily") as HTMLInputElement,
    textColor: document.getElementById("textColor") as HTMLInputElement,
    orpColor: document.getElementById("orpColor") as HTMLInputElement,
    backgroundColor: document.getElementById("backgroundColor") as HTMLInputElement,
    alwaysOnTop: document.getElementById("alwaysOnTop") as HTMLInputElement,
    globalShortcut: document.getElementById("globalShortcut") as HTMLInputElement,
    showTextPanel: document.getElementById("showTextPanel") as HTMLInputElement,
  };

  function populate(settings: ReaderSettingsForm): void {
    fields.wpm.value = String(settings.wpm);
    fields.chunkSize.value = String(settings.chunkSize);
    fields.usePunctuationPauses.checked = settings.usePunctuationPauses;
    fields.sentencePauseMultiplier.value = String(settings.sentencePauseMultiplier);
    fields.commaPauseMultiplier.value = String(settings.commaPauseMultiplier);
    fields.fontSize.value = String(settings.fontSize);
    fields.fontFamily.value = settings.fontFamily;
    fields.textColor.value = settings.textColor;
    fields.orpColor.value = settings.orpColor;
    fields.backgroundColor.value = settings.backgroundColor;
    fields.alwaysOnTop.checked = settings.alwaysOnTop;
    fields.globalShortcut.value = settings.globalShortcut;
    fields.showTextPanel.checked = settings.showTextPanel;
  }

  function readForm(): Partial<ReaderSettingsForm> {
    return {
      wpm: Number(fields.wpm.value) || 300,
      chunkSize: Number(fields.chunkSize.value) as 1 | 2 | 3,
      usePunctuationPauses: fields.usePunctuationPauses.checked,
      sentencePauseMultiplier: Number(fields.sentencePauseMultiplier.value) || 2.5,
      commaPauseMultiplier: Number(fields.commaPauseMultiplier.value) || 1.6,
      fontSize: Number(fields.fontSize.value) || 48,
      fontFamily: fields.fontFamily.value || "Segoe UI, sans-serif",
      textColor: fields.textColor.value,
      orpColor: fields.orpColor.value,
      backgroundColor: fields.backgroundColor.value,
      alwaysOnTop: fields.alwaysOnTop.checked,
      globalShortcut: fields.globalShortcut.value || "CommandOrControl+Alt+R",
      showTextPanel: fields.showTextPanel.checked,
    };
  }

  window.flashreadSettings.getSettings().then(populate);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const updated = await window.flashreadSettings.updateSettings(readForm());
    populate(updated);
    saveStatus.textContent = "Guardado ✓";
    saveStatus.classList.add("visible");
    window.setTimeout(() => saveStatus.classList.remove("visible"), 1500);
  });
})();
