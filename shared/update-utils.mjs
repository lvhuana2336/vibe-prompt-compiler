export const RELEASE_REPOSITORY = "lvhuana2336/vibe-prompt-compiler";
export const RELEASE_API_URL = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases/latest`;
export const RELEASE_URL_PREFIX = `https://github.com/${RELEASE_REPOSITORY}/releases/`;

export function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "")
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
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}
