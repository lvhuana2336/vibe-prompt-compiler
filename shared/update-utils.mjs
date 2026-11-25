export const RELEASE_REPOSITORY = "lvhuana2336/vibe-prompt-compiler";
export const RELEASE_API_URL = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;
export const RELEASE_URL_PREFIX = `https://github.com/${RELEASE_REPOSITORY}/releases/`;
export const RELEASE_DOWNLOAD_URL_PREFIX = `https://github.com/${RELEASE_REPOSITORY}/releases/download/`;
export const RELEASE_METADATA_ASSET_NAME = "release-metadata.json";

export function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v+/i, "")
    .split("-")[0];
}

export function compareVersions(current, candidate) {
  const currentParts = normalizeVersion(current).split(".").map((part) => Number(part) || 0);
  const candidateParts = normalizeVersion(candidate).split(".").map((part) => Number(part) || 0);
  const length = Math.max(currentParts.length, candidateParts.length);

  for (let index = 0; index < length; index += 1) {
    const difference = (candidateParts[index] || 0) - (currentParts[index] || 0);
    if (difference !== 0) return difference > 0 ? 1 : -1;
  }

  return 0;
}

export function sanitizeReleaseNotes(value, maxLength = 1200) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/^\s*Full Changelog\s*:?\s*https?:\/\/\S+\s*$/gim, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function normalizeByteCount(value) {
  if (value === null || value === undefined || value === "") return null;
  const bytes = Number(value);
  return Number.isFinite(bytes) && bytes >= 0 ? Math.round(bytes) : null;
}

export function parseReleaseMetadata(value) {
  let metadata = value;
  if (typeof value === "string") {
    try {
      metadata = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!metadata || typeof metadata !== "object") return null;
  const installedBytes = normalizeByteCount(metadata.installedBytes);
  if (installedBytes === null) return null;

  return {
    version: normalizeVersion(metadata.version),
    installedBytes,
    generatedAt: typeof metadata.generatedAt === "string" ? metadata.generatedAt : "",
  };
}

export function buildStorageEstimate({ currentBytes, nextBytes, installerBytes }) {
  const before = normalizeByteCount(currentBytes);
  const exactNext = normalizeByteCount(nextBytes);
  const installer = normalizeByteCount(installerBytes);
  const estimatedNext =
    exactNext !== null
      ? exactNext
      : before !== null && installer !== null
        ? before + installer
        : null;
  const delta = before !== null && estimatedNext !== null ? estimatedNext - before : null;

  return {
    currentBytes: before,
    estimatedNextBytes: estimatedNext,
    deltaBytes: delta,
    installerBytes: installer,
    estimated: exactNext === null,
  };
}

export function formatByteSize(value, { signed = false } = {}) {
  const bytes = normalizeByteCount(value);
  if (bytes === null) return "未知";

  const units = ["B", "KB", "MB", "GB"];
  let amount = bytes;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  const rounded = amount >= 100 || unitIndex === 0 ? Math.round(amount) : Math.round(amount * 10) / 10;
  const prefix = signed && bytes > 0 ? "+" : "";
  return `${prefix}${rounded} ${units[unitIndex]}`;
}
