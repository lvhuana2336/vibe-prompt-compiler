import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractVersionSection(changelog, version) {
  const normalized = String(version || "").replace(/^v+/i, "");
  if (!normalized) return "";
  const headingPattern = new RegExp(`^##\\s+v?${escapeRegExp(normalized)}(?:\\s|$).*$`, "m");
  const heading = headingPattern.exec(changelog);
  if (!heading) return "";

  const bodyStart = heading.index + heading[0].length;
  const rest = changelog.slice(bodyStart);
  const nextHeading = /^##\s+/m.exec(rest);
  const body = (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
  return body;
}

export function buildReleaseNotes(changelog, version) {
  const section = extractVersionSection(changelog, version);
  if (!section) return "";
  const localizedSection = section
    .replace(/^### Added\s*$/gim, "### 新增")
    .replace(/^### Changed\s*$/gim, "### 变更")
    .replace(/^### Fixed\s*$/gim, "### 修复")
    .replace(/^### Removed\s*$/gim, "### 移除")
    .replace(/^### Security\s*$/gim, "### 安全");
  return `## v${String(version).replace(/^v+/i, "")} 更新内容\n\n${localizedSection}\n`;
}

async function main() {
  const root = process.cwd();
  const outputPath = path.resolve(process.argv[2] || path.join(root, "release", "release-notes.md"));
  const packageInfo = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
  const changelog = await fs.readFile(path.join(root, "CHANGELOG.md"), "utf8");
  const notes = buildReleaseNotes(changelog, packageInfo.version);
  if (!notes.trim()) {
    throw new Error(`CHANGELOG.md does not contain v${packageInfo.version}`);
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, notes, "utf8");
  console.log(`Wrote ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
