const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("yangouDesktop", {
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  checkForUpdates: (manual = false) => ipcRenderer.invoke("update:check", { manual }),
  openRelease: (releaseUrl) => ipcRenderer.invoke("update:open-release", releaseUrl),
});
