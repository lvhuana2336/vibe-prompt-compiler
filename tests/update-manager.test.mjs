import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createUpdateManager, measureDirectoryBytes } from "../electron/update-manager.mjs";

const RELEASE_PAGE =
  "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/tag/v0.2.2";
const INSTALLER_URL =
  "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/download/v0.2.2/YanGou-Setup-0.2.2.exe";
const METADATA_URL =
  "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/download/v0.2.2/release-metadata.json";

test("更新检查返回改动说明、安装包与更新前后存储占用", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yangou-update-"));
  const installDirectory = path.join(root, "install");
  const cacheDirectory = path.join(root, "cache");
  await fs.mkdir(installDirectory, { recursive: true });
  await fs.writeFile(path.join(installDirectory, "言构.exe"), Buffer.alloc(120));
  await fs.mkdir(path.join(installDirectory, "resources"));
  await fs.writeFile(path.join(installDirectory, "resources", "app.asar"), Buffer.alloc(80));

  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    if (String(url).endsWith("/releases/latest")) {
      return Response.json({
        tag_name: "v0.2.2",
        html_url: RELEASE_PAGE,
        published_at: "2026-11-22T00:00:00Z",
        body: "新增更新询问弹窗\n新增发布元数据",
        assets: [
          {
            name: "YanGou-Setup-0.2.2.exe",
            size: 2_048,
            browser_download_url: INSTALLER_URL,
          },
          {
            name: "release-metadata.json",
            size: 100,
            browser_download_url: METADATA_URL,
          },
        ],
      });
    }
    if (String(url) === METADATA_URL) {
      return Response.json({ version: "0.2.2", installedBytes: 5_000 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const manager = createUpdateManager({
      app: {
        isPackaged: true,
        getVersion: () => "0.2.1",
        getPath: (name) => {
          if (name === "userData") return cacheDirectory;
          if (name === "exe") return path.join(installDirectory, "言构.exe");
          throw new Error(`Unexpected path: ${name}`);
        },
      },
      shell: { openExternal: async () => {} },
      fetchImpl,
      now: () => Date.parse("2026-11-22T01:00:00Z"),
    });

    const result = await manager.check({ manual: true });

    assert.equal(result.status, "available");
    assert.equal(result.latestVersion, "0.2.2");
    assert.match(result.notes, /更新询问弹窗/);
    assert.deepEqual(result.storage, {
      currentBytes: 200,
      estimatedNextBytes: 5_000,
      deltaBytes: 4_800,
      installerBytes: 2_048,
      estimated: false,
    });
    assert.deepEqual(requestedUrls, [
      "https://api.github.com/repos/lvhuana2336/vibe-prompt-compiler/releases/latest",
      METADATA_URL,
    ]);
    assert.equal(await measureDirectoryBytes(installDirectory), 200);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("自动检查不会复用其他应用版本留下的缓存", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yangou-update-cache-"));
  const cacheDirectory = path.join(root, "cache");
  await fs.mkdir(cacheDirectory, { recursive: true });
  await fs.writeFile(
    path.join(cacheDirectory, "update-check.json"),
    JSON.stringify({
      cacheSchemaVersion: 3,
      cachedAt: Date.parse("2026-11-23T01:00:00Z"),
      currentVersion: "0.2.2",
      status: "available",
      latestVersion: "0.3.0",
    }),
  );
  const requestedUrls = [];

  try {
    const manager = createUpdateManager({
      app: {
        isPackaged: true,
        getVersion: () => "0.3.0",
        getPath: (name) => {
          if (name === "userData") return cacheDirectory;
          if (name === "exe") return path.join(root, "install", "言构.exe");
          throw new Error(`Unexpected path: ${name}`);
        },
      },
      shell: { openExternal: async () => {} },
      fetchImpl: async (url) => {
        requestedUrls.push(String(url));
        return Response.json({
          tag_name: "vv0.3.1",
          html_url:
            "https://github.com/lvhuana2336/vibe-prompt-compiler/releases/tag/v0.3.1",
          body: "## 中文更新说明\n\n- 修复版本缓存",
          assets: [],
        });
      },
      now: () => Date.parse("2026-11-23T02:00:00Z"),
    });

    const result = await manager.check();
    assert.equal(result.currentVersion, "0.3.0");
    assert.equal(result.latestVersion, "0.3.1");
    assert.equal(result.status, "available");
    assert.match(result.notes, /中文更新说明/);
    assert.equal(requestedUrls.length, 1);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("自动检查失败返回可展示的错误，非法更新地址会被拒绝", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yangou-update-error-"));
  try {
    const manager = createUpdateManager({
      app: {
        isPackaged: true,
        getVersion: () => "0.2.1",
        getPath: (name) => {
          if (name === "userData") return path.join(root, "cache");
          if (name === "exe") return path.join(root, "install", "言构.exe");
          throw new Error(`Unexpected path: ${name}`);
        },
      },
      shell: { openExternal: async () => {} },
      fetchImpl: async () => {
        throw new Error("network unavailable");
      },
    });

    const result = await manager.check();
    assert.equal(result.status, "error");
    assert.match(result.message, /network unavailable/);
    await assert.rejects(
      manager.openRelease("https://example.com/YanGou-Setup-0.2.2.exe"),
      /拒绝打开非官方更新地址/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
