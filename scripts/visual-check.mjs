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

const contentPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
contentPage.setDefaultTimeout(12_000);
await contentPage.goto(baseUrl, { waitUntil: "networkidle" });
await contentPage.locator(".function-trigger").click();
await contentPage.locator(".function-drawer").waitFor();
const creationModeCount = await contentPage.locator(".creation-mode-grid button").count();
await contentPage.getByRole("button", { name: /商务写作/ }).click();
const artifactOptionsVisible = await contentPage.locator(".artifact-option-grid").isVisible();
await contentPage
  .locator(".artifact-option-grid button")
  .filter({ hasText: "PPT 演示" })
  .click();
await contentPage.waitForTimeout(250);
await contentPage.screenshot({
  path: path.join(screenshotDir, "02b-function-drawer.png"),
  fullPage: true,
});
await contentPage.locator(".function-drawer .primary-action").click();
await contentPage.locator("textarea").fill(
  "向管理层汇报第三季度项目进展，说明风险、负责人和下一步计划。",
);
await contentPage.locator(".compile-button").click();
await contentPage.locator(".result-main").waitFor();
const contentCategory = (
  await contentPage.locator(".result-title-block > div > span").innerText()
).trim();
const contentPrompt = await contentPage.locator(".prompt-document pre").innerText();
const contentOverflow = await contentPage.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);
await contentPage.screenshot({
  path: path.join(screenshotDir, "03b-content-result.png"),
  fullPage: true,
});

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
await page.waitForTimeout(350);
await page.screenshot({ path: path.join(screenshotDir, "04-settings.png"), fullPage: true });

await page.getByRole("tab", { name: "个性化" }).click();
const settingsTabCount = await page.locator(".settings-tabs [role=tab]").count();
const standardHeadingSize = await page
  .locator(".drawer-head h2")
  .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
await page.getByRole("button", { name: "大", exact: true }).click();
const largeHeadingSize = await page
  .locator(".drawer-head h2")
  .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
await page.getByRole("button", { name: "夜晚", exact: true }).click();
const darkModeApplied = await page.evaluate(
  () => document.documentElement.dataset.colorMode === "dark",
);
await page.locator(".range-setting input").fill("60");
await page.waitForFunction(
  () => document.documentElement.style.getPropertyValue("--field-opacity") === "0.6",
);
const fieldOpacityApplied = true;
const fileChooserPromise = page.waitForEvent("filechooser");
await page.getByRole("button", { name: "选择壁纸" }).click();
const wallpaperChooser = await fileChooserPromise;
await wallpaperChooser.setFiles(path.resolve("docs/screenshots/workspace.png"));
await page.waitForFunction(
  () => document.documentElement.style.getPropertyValue("--wallpaper-image") !== "none",
);
const wallpaperApplied = await page
  .locator(".wallpaper-preview")
  .evaluate((element) => getComputedStyle(element).backgroundImage !== "none");
await page.waitForTimeout(350);
await page.screenshot({ path: path.join(screenshotDir, "04b-personalization-dark.png"), fullPage: true });

await page.getByRole("tab", { name: "数据" }).click();
const dataSettingsVisible = await page.locator(".data-summary-card").isVisible();
const historyLimitOptions = await page.locator(".data-settings select option").count();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "导出数据" }).click();
const backupDownload = await downloadPromise;
const backupPath = await backupDownload.path();
const exportDownloaded = backupDownload.suggestedFilename().endsWith(".json");
page.once("dialog", (dialog) => dialog.accept());
const importChooserPromise = page.waitForEvent("filechooser");
await page.getByRole("button", { name: "导入数据" }).click();
const importChooser = await importChooserPromise;
await importChooser.setFiles(backupPath);
await page.getByText("已导入 1 条记录。").waitFor();
const importCompleted = true;

await page.getByRole("tab", { name: "更新" }).click();
const updateSettingsVisible = await page.locator(".update-settings-card").isVisible();
await page.locator(".settings-drawer .icon-button").click();

await page.setViewportSize({ width: 390, height: 844 });
await page.reload({ waitUntil: "networkidle" });
const appearancePersistedAfterReload = await page.evaluate(
  () =>
    document.documentElement.dataset.colorMode === "dark" &&
    document.documentElement.style.getPropertyValue("--field-opacity") === "0.6",
);
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
    getAppInfo: async () => ({ version: "0.3.1", platform: "win32", packaged: true }),
    checkForUpdates: async () => ({
      status: "available",
      currentVersion: "0.3.1",
      latestVersion: "0.3.2",
      releaseUrl:
        "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/tag/v0.3.2",
      downloadUrl:
        "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/download/v0.3.2/YanGou-Setup-0.3.2.exe",
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
const updateVersionText = await updatePage.locator(".update-version-route").innerText();
const normalizedUpdateVersions =
  !updateVersionText.includes("vv") &&
  updateVersionText.includes("v0.3.1") &&
  updateVersionText.includes("v0.3.2");
await updatePage.waitForTimeout(350);
await updatePage.screenshot({ path: path.join(screenshotDir, "06-update-dialog.png"), fullPage: true });
await updatePage.locator(".update-later-button").click();
await updatePage.locator(".header-icon-button").last().click();
await updatePage.getByRole("tab", { name: "更新" }).click();
const automaticUpdateToggle = updatePage.getByRole("checkbox", {
  name: /启动时自动检测更新/,
});
const automaticUpdateEnabled = await automaticUpdateToggle.isChecked();
await automaticUpdateToggle.uncheck();
await updatePage.waitForFunction(
  () => {
    const settings = JSON.parse(localStorage.getItem("yangou.user.settings.v1") || "null");
    return (
      localStorage.getItem("yangou.updates.auto.v1") === "false" &&
      settings?.autoCheckUpdates === false
    );
  },
);
const automaticUpdateDisabled = true;
await updatePage.reload({ waitUntil: "networkidle" });
await updatePage.waitForTimeout(1_200);
const automaticUpdateDialogDisabled = (await updatePage.locator(".update-dialog").count()) === 0;
await updatePage.locator(".header-icon-button").last().click();
await updatePage.getByRole("tab", { name: "更新" }).click();
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
    getAppInfo: async () => ({ version: "0.3.1", platform: "win32", packaged: true }),
    checkForUpdates: async () => ({
      status: "error",
      currentVersion: "0.3.1",
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
      creationModeCount,
      artifactOptionsVisible,
      contentCategory,
      contentPromptHasSlides: contentPrompt.includes("演讲备注"),
      contentOverflow,
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
      settingsTabCount,
      standardHeadingSize,
      largeHeadingSize,
      darkModeApplied,
      fieldOpacityApplied,
      appearancePersistedAfterReload,
      wallpaperApplied,
      dataSettingsVisible,
      historyLimitOptions,
      exportDownloaded,
      importCompleted,
      updateSettingsVisible,
      autoUpdateDialogVisible,
      updateNotesVisible,
      updateStorageVisible,
      normalizedUpdateVersions,
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
