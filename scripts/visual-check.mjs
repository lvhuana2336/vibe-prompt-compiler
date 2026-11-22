import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const baseUrl = process.env.APP_URL || "http://127.0.0.1:5173";
const screenshotDir = path.resolve("artifacts/screenshots");
await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.setDefaultTimeout(12_000);
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(screenshotDir, "01-intro.png"), fullPage: true });

const heading = await page.locator("h1").first().innerText();
const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
const serviceWorkerState = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return "unsupported";
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 3_000)),
  ]);
  return registration?.active?.state || "missing";
});
const initialOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);

await page.locator("textarea").fill(
  "做一个记录每天喝水的小程序，界面清爽一点，能提醒我。",
);
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(screenshotDir, "02-typed.png"), fullPage: true });

const compileButton = page.locator(".compile-button");
await compileButton.dispatchEvent("pointerdown", { clientX: 100, clientY: 100, pointerId: 1 });
const rippleCount = await compileButton.locator(".button-ripple").count();
await compileButton.click();
await page.locator(".result-main").waitFor();
await page.screenshot({ path: path.join(screenshotDir, "03-result.png"), fullPage: true });

const resultTitle = await page.locator(".result-title-block h1").innerText();
const promptLength = (await page.locator(".prompt-document pre").innerText()).length;
const outputSectionCount = await page.locator(".prompt-tabs [role=tab]").count();
const outputSubtabCount = await page.locator(".output-subtabs [role=tab]").count();
const desktopOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);

await page.getByRole("tab", { name: "分步版" }).click();
const stagedContainsVerification = (await page.locator(".prompt-document pre").innerText()).includes(
  "验证",
);

await page.locator(".header-icon-button").last().click();
await page.locator(".settings-drawer").waitFor();
const providerCount = await page.locator(".provider-card").count();
const updateSettingsVisible = await page.locator(".update-settings-card").isVisible();
await page.screenshot({ path: path.join(screenshotDir, "04-settings.png"), fullPage: true });
await page.locator(".settings-drawer .icon-button").click();

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
await page.locator("textarea").fill(
  "我的 React 页面在手机上导航挤压，帮我修复并优化。",
);
await page.locator(".compile-button").click();
await page.locator(".result-main").waitFor();
const mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);
await page.screenshot({ path: path.join(screenshotDir, "05-mobile-result.png"), fullPage: true });

const updatePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await updatePage.addInitScript(() => {
  window.yangouDesktop = {
    getAppInfo: async () => ({ version: "0.2.1", platform: "win32", packaged: true }),
    checkForUpdates: async () => ({
      status: "available",
      currentVersion: "0.2.1",
      latestVersion: "0.2.2",
      releaseUrl:
        "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/tag/v0.2.2",
      downloadUrl:
        "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/download/v0.2.2/YanGou-Setup-0.2.2.exe",
      publishedAt: "2026-11-22T00:00:00Z",
      notes: "新增更新询问弹窗\n展示新版本改动与预计磁盘占用变化\n保留手动检查更新",
      storage: {
        currentBytes: 188_000_000,
        estimatedNextBytes: 196_000_000,
        deltaBytes: 8_000_000,
        installerBytes: 72_000_000,
        estimated: false,
      },
    }),
    openRelease: async () => {},
  };
});
await updatePage.goto(baseUrl, { waitUntil: "networkidle" });
await updatePage.locator(".update-dialog").waitFor();
const autoUpdateDialogVisible = await updatePage.locator(".update-dialog").isVisible();
const updateNotesVisible = (await updatePage.locator(".update-notes").innerText()).includes(
  "更新询问弹窗",
);
const updateStorageVisible = (await updatePage.locator(".storage-comparison").innerText()).includes(
  "更新前",
);
await updatePage.waitForTimeout(350);
await updatePage.screenshot({ path: path.join(screenshotDir, "06-update-dialog.png"), fullPage: true });
await updatePage.locator(".update-later-button").click();
await updatePage.locator(".header-icon-button").last().click();
const automaticUpdateToggle = updatePage.getByRole("checkbox", {
  name: /启动时自动检测更新/,
});
const automaticUpdateEnabled = await automaticUpdateToggle.isChecked();
await automaticUpdateToggle.uncheck();
await updatePage.waitForFunction(
  () => localStorage.getItem("yangou.updates.auto.v1") === "false",
);
const automaticUpdateDisabled = true;
await updatePage.reload({ waitUntil: "networkidle" });
await updatePage.waitForTimeout(1_200);
const automaticUpdateDialogDisabled = (await updatePage.locator(".update-dialog").count()) === 0;
await updatePage.locator(".header-icon-button").last().click();
await updatePage
  .getByRole("checkbox", { name: /启动时自动检测更新/ })
  .check();
await updatePage.getByRole("button", { name: "检查更新" }).click();
await updatePage.locator(".update-dialog").waitFor();
const manualUpdateDialogVisible = await updatePage.locator(".update-dialog").isVisible();
await updatePage.locator(".update-dialog-close").click();
await updatePage.locator(".settings-drawer .icon-button").click();

const updateFailurePage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await updateFailurePage.addInitScript(() => {
  window.yangouDesktop = {
    getAppInfo: async () => ({ version: "0.2.1", platform: "win32", packaged: true }),
    checkForUpdates: async () => ({
      status: "error",
      currentVersion: "0.2.1",
      message: "更新服务暂时不可用。",
    }),
    openRelease: async () => {},
  };
});
await updateFailurePage.goto(baseUrl, { waitUntil: "networkidle" });
await updateFailurePage.locator(".update-dialog.is-error").waitFor();
const automaticUpdateFailureVisible = await updateFailurePage
  .locator(".update-dialog.is-error")
  .isVisible();
await updateFailurePage.waitForTimeout(350);
await updateFailurePage.screenshot({
  path: path.join(screenshotDir, "07-update-error.png"),
  fullPage: true,
});

console.log(
  JSON.stringify(
    {
      heading,
      manifestHref,
      serviceWorkerState,
      resultTitle,
      initialOverflow,
      desktopOverflow,
      mobileOverflow,
      promptLength,
      outputSectionCount,
      outputSubtabCount,
      rippleCount,
      stagedContainsVerification,
      providerCount,
      updateSettingsVisible,
      autoUpdateDialogVisible,
      updateNotesVisible,
      updateStorageVisible,
      automaticUpdateEnabled,
      automaticUpdateDisabled,
      automaticUpdateDialogDisabled,
      manualUpdateDialogVisible,
      automaticUpdateFailureVisible,
      consoleErrors,
      screenshots: screenshotDir,
    },
    null,
    2,
  ),
);

await browser.close();
