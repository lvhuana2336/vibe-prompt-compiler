const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("yangouDesktop", {
  getAppInfo: () => ipcRenderer.invoke("app:get-info"),
  loadUserData: () => ipcRenderer.invoke("data:load"),
  saveUserSettings: (settings) => ipcRenderer.invoke("data:save-settings", settings),
  saveHistory: (history, limit) => ipcRenderer.invoke("data:save-history", history, limit),
  clearHistory: () => ipcRenderer.invoke("data:clear-history"),
  loadWallpaper: () => ipcRenderer.invoke("wallpaper:load"),
  selectWallpaper: () => ipcRenderer.invoke("wallpaper:select"),
  clearWallpaper: () => ipcRenderer.invoke("wallpaper:clear"),
  checkForUpdates: (manual = false) => ipcRenderer.invoke("update:check", { manual }),
  openRelease: (releaseUrl) => ipcRenderer.invoke("update:open-release", releaseUrl),
});
