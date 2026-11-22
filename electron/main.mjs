import path from "node:path";
import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from "electron";
import { loadEnvironment, startLocalServer } from "../server/app.mjs";
import { createDataStore } from "./data-store.mjs";
import { createUpdateManager } from "./update-manager.mjs";

const isDev = process.argv.includes("--dev");
const isSmokeTest = process.argv.includes("--smoke-test");
const applicationId = "com.yangou.promptcompiler";

let mainWindow;
let localServer;
let isQuitting = false;
let updateManager;
let dataStore;

app.setName("言构");
app.setAppUserModelId(applicationId);
if (isSmokeTest) {
  app.setPath("userData", path.join(app.getPath("temp"), `yangou-smoke-${process.pid}`));
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
}

function hardenWebContents(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });

  contents.on("will-navigate", (event, url) => {
    if (localServer?.url && !url.startsWith(localServer.url)) {
      event.preventDefault();
    }
  });
}

async function createWindow() {
  loadEnvironment(app.getAppPath());
  localServer = await startLocalServer({
    root: app.getAppPath(),
    isDev,
    port: 0,
  });

  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });

  mainWindow = new BrowserWindow({
    title: "言构 · Vibe Prompt Compiler",
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#f2efe7",
    icon: path.join(app.getAppPath(), "build", "icon.ico"),
    webPreferences: {
      preload: path.join(app.getAppPath(), "electron", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
      spellcheck: true,
    },
  });

  hardenWebContents(mainWindow.webContents);
  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`[preload] ${preloadPath}: ${error.message}`);
  });

  mainWindow.once("ready-to-show", () => {
    if (!isSmokeTest) mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", (_event, code, description, url) => {
    if (isSmokeTest) {
      console.error(`[desktop smoke] load failed ${code} ${description} ${url}`);
      app.exit(1);
      return;
    }
    dialog.showErrorBox("言构启动失败", `本地界面加载失败：${description}（${code}）`);
  });

  mainWindow.webContents.once("did-finish-load", async () => {
    if (!isSmokeTest) return;
    try {
      const health = await fetch(`${localServer.url}/api/health`).then((response) => response.json());
      const title = await mainWindow.webContents.executeJavaScript(
        "document.querySelector('h1')?.textContent.replace(/\\s+/g, ' ').trim()",
      );
      const desktopBridge = await mainWindow.webContents.executeJavaScript(
        "window.yangouDesktop ? window.yangouDesktop.getAppInfo().then(async info => { const storage = await window.yangouDesktop.loadUserData(); await window.yangouDesktop.saveHistory([{ id: 'smoke', idea: 'test', result: { title: 'test' }, createdAt: new Date().toISOString() }], 100); const roundTrip = await window.yangouDesktop.loadUserData(); return { available: true, info, storage, historyRoundTrip: roundTrip.history?.length === 1, update: await window.yangouDesktop.checkForUpdates(false) }; }) : { available: false }",
      );
      console.log(
        JSON.stringify({
          ok: health.ok === true,
          title,
          port: localServer.port,
          desktopBridge,
        }),
      );
      app.quit();
    } catch (error) {
      console.error(`[desktop smoke] ${error.message}`);
      app.exit(1);
    }
  });

  await mainWindow.loadURL(localServer.url);
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  updateManager = createUpdateManager({ app, shell });
  dataStore = createDataStore({ app, dialog });
  ipcMain.handle("app:get-info", () => ({
    version: app.getVersion(),
    platform: process.platform,
    packaged: app.isPackaged,
  }));
  ipcMain.handle("data:load", () => dataStore.load());
  ipcMain.handle("data:save-settings", (_event, settings) => dataStore.saveSettings(settings));
  ipcMain.handle("data:save-history", (_event, history, limit) =>
    dataStore.saveHistory(history, limit),
  );
  ipcMain.handle("data:clear-history", () => dataStore.clearHistory());
  ipcMain.handle("wallpaper:load", () => dataStore.loadWallpaper());
  ipcMain.handle("wallpaper:select", () => dataStore.selectWallpaper(mainWindow));
  ipcMain.handle("wallpaper:clear", () => dataStore.clearWallpaper());
  ipcMain.handle("update:check", (_event, options) =>
    updateManager.check({ manual: Boolean(options?.manual) }),
  );
  ipcMain.handle("update:open-release", (_event, releaseUrl) =>
    updateManager.openRelease(releaseUrl),
  );

  try {
    await createWindow();
  } catch (error) {
    dialog.showErrorBox("言构启动失败", error.message);
    app.exit(1);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", async (event) => {
  if (isQuitting) return;
  isQuitting = true;
  if (localServer) {
    event.preventDefault();
    await localServer.close().catch(() => {});
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
