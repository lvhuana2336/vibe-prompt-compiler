import fs from "node:fs/promises";
import path from "node:path";

const MAX_HISTORY_LIMIT = 200;
const MAX_WALLPAPER_BYTES = 12 * 1024 * 1024;
const WALLPAPER_MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeHistory(value, limit = 100) {
  if (!Array.isArray(value)) return [];
  const safeLimit = Math.max(1, Math.min(MAX_HISTORY_LIMIT, Number(limit) || 100));
  return value
    .filter((item) => isObject(item) && typeof item.id === "string" && isObject(item.result))
    .slice(0, safeLimit);
}

async function readJsonFile(filePath) {
  try {
    return { data: JSON.parse(await fs.readFile(filePath, "utf8")), exists: true };
  } catch (error) {
    if (error.code === "ENOENT") return { data: null, exists: false };
    try {
      return {
        data: JSON.parse(await fs.readFile(`${filePath}.bak`, "utf8")),
        exists: true,
        recovered: true,
      };
    } catch {
      return { data: null, exists: true, corrupt: true };
    }
  }
}

async function writeJsonFile(filePath, value, { backup = true } = {}) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");

  if (backup) {
    try {
      await fs.copyFile(filePath, `${filePath}.bak`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  try {
    await fs.rename(temporaryPath, filePath);
  } catch {
    await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await fs.rm(temporaryPath, { force: true });
  }
}

export function createDataStore({ app, dialog }) {
  const dataDirectory = path.join(app.getPath("userData"), "data");
  const settingsPath = path.join(dataDirectory, "settings.json");
  const historyPath = path.join(dataDirectory, "history.json");
  let writeQueue = Promise.resolve();

  function enqueueWrite(task) {
    writeQueue = writeQueue.then(task, task);
    return writeQueue;
  }

  async function load() {
    const [settings, history] = await Promise.all([
      readJsonFile(settingsPath),
      readJsonFile(historyPath),
    ]);
    return {
      settings: isObject(settings.data) ? settings.data : null,
      history: normalizeHistory(history.data?.items, history.data?.limit || 100),
      settingsExists: settings.exists,
      historyExists: history.exists,
      recovered: Boolean(settings.recovered || history.recovered),
      corrupt: Boolean(settings.corrupt || history.corrupt),
    };
  }

  function saveSettings(settings) {
    return enqueueWrite(async () => {
      if (!isObject(settings)) throw new Error("设置数据格式无效。");
      await writeJsonFile(settingsPath, settings);
    });
  }

  function saveHistory(history, limit = 100) {
    return enqueueWrite(async () => {
      if (!Array.isArray(history)) throw new Error("历史记录格式无效。");
      await writeJsonFile(historyPath, {
        schemaVersion: 1,
        limit,
        updatedAt: new Date().toISOString(),
        items: normalizeHistory(history, limit),
      });
    });
  }

  function clearHistory() {
    return enqueueWrite(async () => {
      await writeJsonFile(
        historyPath,
        { schemaVersion: 1, limit: 100, updatedAt: new Date().toISOString(), items: [] },
        { backup: false },
      );
      await fs.rm(`${historyPath}.bak`, { force: true });
    });
  }

  async function findWallpaper() {
    for (const extension of Object.keys(WALLPAPER_MIME_TYPES)) {
      const candidate = path.join(dataDirectory, `wallpaper${extension}`);
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // Continue checking supported formats.
      }
    }
    return null;
  }

  async function wallpaperDataUrl(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = WALLPAPER_MIME_TYPES[extension];
    if (!mimeType) throw new Error("不支持的壁纸格式。");
    const buffer = await fs.readFile(filePath);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
  }

  async function loadWallpaper() {
    const filePath = await findWallpaper();
    return filePath ? wallpaperDataUrl(filePath) : null;
  }

  async function selectWallpaper(parentWindow) {
    const result = await dialog.showOpenDialog(parentWindow, {
      title: "选择言构壁纸",
      properties: ["openFile"],
      filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (result.canceled || !result.filePaths[0]) return null;

    const sourcePath = result.filePaths[0];
    const extension = path.extname(sourcePath).toLowerCase();
    if (!WALLPAPER_MIME_TYPES[extension]) throw new Error("壁纸仅支持 PNG、JPG 和 WebP。");
    const stats = await fs.stat(sourcePath);
    if (stats.size > MAX_WALLPAPER_BYTES) throw new Error("壁纸文件不能超过 12 MB。");

    const previous = await findWallpaper();
    const destination = path.join(dataDirectory, `wallpaper${extension}`);
    await fs.mkdir(dataDirectory, { recursive: true });
    await fs.copyFile(sourcePath, destination);
    if (previous && previous !== destination) await fs.rm(previous, { force: true });
    return wallpaperDataUrl(destination);
  }

  async function clearWallpaper() {
    const filePath = await findWallpaper();
    if (filePath) await fs.rm(filePath, { force: true });
  }

  return {
    load,
    saveSettings,
    saveHistory,
    clearHistory,
    loadWallpaper,
    selectWallpaper,
    clearWallpaper,
  };
}
