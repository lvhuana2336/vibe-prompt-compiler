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
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.screenshot({ path: path.join(screenshotDir, "01-intro.png"), fullPage: true });

const heading = await page.locator("h1").first().innerText();
const initialOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth - window.innerWidth,
);

await page.locator("textarea").fill(
  "做一个记录每天喝水的小程序，界面清爽一点，能提醒我。",
);
await page.waitForTimeout(250);
await page.screenshot({ path: path.join(screenshotDir, "02-typed.png"), fullPage: true });

await page.locator(".compile-button").click();
await page.locator(".result-main").waitFor();
await page.screenshot({ path: path.join(screenshotDir, "03-result.png"), fullPage: true });

const resultTitle = await page.locator(".result-title-block h1").innerText();
const promptLength = (await page.locator(".prompt-document pre").innerText()).length;
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

console.log(
  JSON.stringify(
    {
      heading,
      resultTitle,
      initialOverflow,
      desktopOverflow,
      mobileOverflow,
      promptLength,
      stagedContainsVerification,
      providerCount,
      consoleErrors,
      screenshots: screenshotDir,
    },
    null,
    2,
  ),
);

await browser.close();
