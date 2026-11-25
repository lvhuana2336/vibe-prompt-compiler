import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReleaseNotes,
  extractVersionSection,
} from "../scripts/release-notes.mjs";

const changelog = `# Changelog

## v0.3.1 - 2026-11-23

### Fixed

- 修复版本误判
- 恢复中文更新说明

## v0.3.0 - 2026-11-23

### Added

- 内容生成
`;

test("从 CHANGELOG 提取当前版本的完整章节", () => {
  const section = extractVersionSection(changelog, "0.3.1");
  assert.match(section, /修复版本误判/);
  assert.match(section, /恢复中文更新说明/);
  assert.doesNotMatch(section, /内容生成/);
});

test("生成中文 Release Notes 并拒绝缺失版本", () => {
  const notes = buildReleaseNotes(changelog, "v0.3.1");
  assert.match(notes, /^## v0\.3\.1 更新内容/);
  assert.match(notes, /### 修复/);
  assert.doesNotMatch(notes, /### Fixed/);
  assert.match(notes, /修复版本误判/);
  assert.equal(buildReleaseNotes(changelog, "0.4.0"), "");
});
