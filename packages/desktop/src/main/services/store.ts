import Store from "electron-store";
import { ReaderSettings, DEFAULT_SETTINGS } from "@flashread/core";

let store: Store<ReaderSettings> | null = null;

export function getStore(): Store<ReaderSettings> {
  if (!store) {
    store = new Store<ReaderSettings>({
      name: "flashread-settings",
      defaults: DEFAULT_SETTINGS,
    });
  }
  return store;
}
