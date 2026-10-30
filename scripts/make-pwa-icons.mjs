import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const chromePath =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const svg = await fs.readFile(path.resolve("public/favicon.svg"), "utf8");
const outputDir = path.resolve("public/icons");
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ executablePath: chromePath, headless: true });
try {
  const renderSvg = async (source, size, target) => {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    await page.setContent(
      `<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${source}`,
    );
    await page.screenshot({ path: target, omitBackground: true });
    await page.close();
  };

  for (const size of [192, 512]) {
    await renderSvg(svg, size, path.join(outputDir, `icon-${size}.png`));
  }

  const androidRes = path.resolve("android/app/src/main/res");
  try {
    await fs.access(androidRes);
    const foreground = svg.replace(
      /<rect width="64" height="64" rx="16" fill="#1b1d18"\/>/,
      "",
    );
    const densities = [
      ["mdpi", 48],
      ["hdpi", 72],
      ["xhdpi", 96],
      ["xxhdpi", 144],
      ["xxxhdpi", 192],
    ];
    const foregroundDensities = [
      ["mdpi", 108],
      ["hdpi", 162],
      ["xhdpi", 216],
      ["xxhdpi", 324],
      ["xxxhdpi", 432],
    ];

    for (const [density, size] of densities) {
      const directory = path.join(androidRes, `mipmap-${density}`);
      await renderSvg(svg, size, path.join(directory, "ic_launcher.png"));
      await renderSvg(svg, size, path.join(directory, "ic_launcher_round.png"));
    }
    for (const [density, size] of foregroundDensities) {
      await renderSvg(
        foreground,
        size,
        path.join(androidRes, `mipmap-${density}`, "ic_launcher_foreground.png"),
      );
    }

    const splashSizes = [
      ["drawable", 480, 320],
      ["drawable-land-hdpi", 800, 480],
      ["drawable-land-mdpi", 480, 320],
      ["drawable-land-xhdpi", 1280, 720],
      ["drawable-land-xxhdpi", 1600, 960],
      ["drawable-land-xxxhdpi", 1920, 1280],
      ["drawable-port-hdpi", 480, 800],
      ["drawable-port-mdpi", 320, 480],
      ["drawable-port-xhdpi", 720, 1280],
      ["drawable-port-xxhdpi", 960, 1600],
      ["drawable-port-xxxhdpi", 1280, 1920],
    ];
    for (const [directory, width, height] of splashSizes) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.setContent(`
        <style>
          html, body { margin: 0; width: 100%; height: 100%; background: #f2efe7; }
          body { display: grid; place-items: center; }
          .brand { display: grid; justify-items: center; gap: ${Math.max(12, Math.round(Math.min(width, height) * 0.04))}px; }
          svg { width: ${Math.round(Math.min(width, height) * 0.28)}px; height: auto; }
          strong { color: #1b1d18; font: 700 ${Math.round(Math.min(width, height) * 0.07)}px "Songti SC", serif; letter-spacing: .12em; }
        </style>
        <div class="brand">${svg}<strong>言构</strong></div>
      `);
      await page.screenshot({ path: path.join(androidRes, directory, "splash.png") });
      await page.close();
    }
    console.log("Generated Android adaptive and legacy launcher icons");
    console.log("Generated Android branded splash screens");
  } catch {
    // The Android project is optional for a browser-only build.
  }
} finally {
  await browser.close();
}

console.log("Generated PWA icons: 192x192, 512x512");
