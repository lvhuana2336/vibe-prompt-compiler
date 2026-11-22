const SETTINGS_KEY = "yangou.user.settings.v1";
const HISTORY_KEY = "yangou.history.v1";
const WALLPAPER_DB = "yangou.assets.v1";
const WALLPAPER_STORE = "wallpaper";
const WALLPAPER_KEY = "custom-wallpaper";

function readJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function openWallpaperDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WALLPAPER_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(WALLPAPER_STORE)) {
        request.result.createObjectStore(WALLPAPER_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readWallpaperBlob() {
  const database = await openWallpaperDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(WALLPAPER_STORE, "readonly");
      const request = transaction.objectStore(WALLPAPER_STORE).get(WALLPAPER_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function writeWallpaperBlob(blob) {
  const database = await openWallpaperDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(WALLPAPER_STORE, "readwrite");
      if (blob) {
        transaction.objectStore(WALLPAPER_STORE).put(blob, WALLPAPER_KEY);
      } else {
        transaction.objectStore(WALLPAPER_STORE).delete(WALLPAPER_KEY);
      }
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function loadUserData() {
  const bridge = window.yangouDesktop;
  if (typeof bridge?.loadUserData === "function") {
    return bridge.loadUserData();
  }
  return {
    settings: readJson(SETTINGS_KEY, null),
    history: readJson(HISTORY_KEY, []),
    settingsExists: Boolean(localStorage.getItem(SETTINGS_KEY)),
    historyExists: Boolean(localStorage.getItem(HISTORY_KEY)),
    recovered: false,
    corrupt: false,
  };
}

export async function saveUserSettings(settings) {
  const bridge = window.yangouDesktop;
  if (typeof bridge?.saveUserSettings === "function") {
    return bridge.saveUserSettings(settings);
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return undefined;
}

export async function saveHistory(history, limit) {
  const bridge = window.yangouDesktop;
  if (typeof bridge?.saveHistory === "function") {
    return bridge.saveHistory(history, limit);
  }
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return undefined;
}

export async function clearPersistedHistory() {
  const bridge = window.yangouDesktop;
  if (typeof bridge?.clearHistory === "function") {
    return bridge.clearHistory();
  }
  localStorage.removeItem(HISTORY_KEY);
  return undefined;
}

export async function loadWallpaper() {
  const bridge = window.yangouDesktop;
  if (typeof bridge?.loadWallpaper === "function") {
    return bridge.loadWallpaper();
  }
  const blob = await readWallpaperBlob().catch(() => null);
  return blob ? blobToDataUrl(blob) : null;
}

export async function selectWallpaper() {
  const bridge = window.yangouDesktop;
  if (typeof bridge?.selectWallpaper === "function") {
    return bridge.selectWallpaper();
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      if (file.size > 12 * 1024 * 1024) {
        reject(new Error("壁纸文件不能超过 12 MB。"));
        return;
      }
      try {
        await writeWallpaperBlob(file);
        resolve(await blobToDataUrl(file));
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

export async function clearWallpaper() {
  const bridge = window.yangouDesktop;
  if (typeof bridge?.clearWallpaper === "function") {
    return bridge.clearWallpaper();
  }
  await writeWallpaperBlob(null);
  return undefined;
}
