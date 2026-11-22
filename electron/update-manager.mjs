import fs from "node:fs/promises";
import path from "node:path";
import {
  RELEASE_API_URL,
  RELEASE_DOWNLOAD_URL_PREFIX,
  RELEASE_METADATA_ASSET_NAME,
  RELEASE_URL_PREFIX,
  buildStorageEstimate,
  compareVersions,
  normalizeByteCount,
  normalizeVersion,
  parseReleaseMetadata,
  sanitizeReleaseNotes,
} from "../shared/update-utils.mjs";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_SCHEMA_VERSION = 2;

export async function measureDirectoryBytes(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return measureDirectoryBytes(entryPath);
      if (entry.isFile()) {
        const stats = await fs.stat(entryPath);
        return stats.size;
      }
      return 0;
    }),
  );
  return sizes.reduce((total, size) => total + size, 0);
}

export function createUpdateManager({
  app,
  shell,
  fetchImpl = globalThis.fetch,
  now = Date.now,
}) {
  const cachePath = path.join(app.getPath("userData"), "update-check.json");

  async function readCache() {
    try {
      return JSON.parse(await fs.readFile(cachePath, "utf8"));
    } catch {
      return null;
    }
  }

  async function writeCache(result) {
    try {
      await fs.mkdir(path.dirname(cachePath), { recursive: true });
      await fs.writeFile(
        cachePath,
        JSON.stringify({
          ...result,
          cacheSchemaVersion: CACHE_SCHEMA_VERSION,
          cachedAt: now(),
        }),
      );
    } catch {
      // Update checks still work when the cache cannot be written.
    }
  }

  async function readReleaseMetadata(asset, latestVersion) {
    if (
      !asset?.browser_download_url ||
      !asset.browser_download_url.startsWith(RELEASE_DOWNLOAD_URL_PREFIX)
    ) {
      return null;
    }

    try {
      const response = await fetchImpl(asset.browser_download_url, {
        headers: {
          Accept: "application/json",
          "User-Agent": `YanGou/${app.getVersion()}`,
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) return null;
      const metadata = parseReleaseMetadata(await response.json());
      if (!metadata || metadata.version !== normalizeVersion(latestVersion)) return null;
      return metadata;
    } catch {
      return null;
    }
  }

  async function check({ manual = false } = {}) {
    const currentVersion = app.getVersion();
    if (!app.isPackaged) {
      return {
        status: "development",
        currentVersion,
        message: "开发模式不执行在线更新检查。",
      };
    }

    if (!manual) {
      const cached = await readCache();
      if (
        cached?.cacheSchemaVersion === CACHE_SCHEMA_VERSION &&
        now() - Number(cached.cachedAt || 0) < CACHE_TTL_MS
      ) {
        return { ...cached, cached: true };
      }
    }

    try {
      const response = await fetchImpl(RELEASE_API_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": `YanGou/${currentVersion}`,
        },
        signal: AbortSignal.timeout(12_000),
      });

      if (!response.ok) {
        throw new Error(`更新服务返回 ${response.status}`);
      }

      const release = await response.json();
      const latestVersion = release.tag_name || release.name || "";
      const hasUpdate = compareVersions(currentVersion, latestVersion) > 0;
      const installer = (release.assets || []).find(
        (asset) => /\.exe$/i.test(asset.name) && /setup/i.test(asset.name),
      );
      const metadataAsset = (release.assets || []).find(
        (asset) => asset.name === RELEASE_METADATA_ASSET_NAME,
      );
      const releaseMetadata = hasUpdate
        ? await readReleaseMetadata(metadataAsset, latestVersion)
        : null;
      const currentBytes = hasUpdate
        ? await measureDirectoryBytes(path.dirname(app.getPath("exe"))).catch(() => null)
        : null;
      const storage = buildStorageEstimate({
        currentBytes,
        nextBytes: releaseMetadata?.installedBytes,
        installerBytes: normalizeByteCount(installer?.size),
      });
      const result = {
        status: hasUpdate ? "available" : "up-to-date",
        currentVersion,
        latestVersion,
        releaseUrl: release.html_url,
        downloadUrl: installer?.browser_download_url || release.html_url,
        publishedAt: release.published_at,
        notes: sanitizeReleaseNotes(release.body),
        storage,
        checkedAt: new Date(now()).toISOString(),
      };
      await writeCache(result);
      return result;
    } catch (error) {
      return {
        status: "error",
        currentVersion,
        message: error.name === "TimeoutError" ? "更新检查超时，请稍后重试。" : error.message,
      };
    }
  }

  async function openRelease(releaseUrl) {
    const url = String(releaseUrl || "");
    if (!url.startsWith(RELEASE_URL_PREFIX)) {
      throw new Error("拒绝打开非官方更新地址。");
    }
    await shell.openExternal(url);
  }

  return { check, openRelease };
}
