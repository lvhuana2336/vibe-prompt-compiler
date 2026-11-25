import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStorageEstimate,
  compareVersions,
  formatByteSize,
  normalizeVersion,
  parseReleaseMetadata,
  sanitizeReleaseNotes,
} from "../shared/update-utils.mjs";

test("更新版本比较支持 v 前缀和多段版本", () => {
  assert.equal(compareVersions("0.2.0", "v0.2.1"), 1);
  assert.equal(compareVersions("1.9.0", "1.10.0"), 1);
  assert.equal(compareVersions("2.0.0", "v2.0.0"), 0);
  assert.equal(compareVersions("2.1.0", "2.0.9"), -1);
  assert.equal(normalizeVersion("v0.2.0-beta.1"), "0.2.0");
  assert.equal(normalizeVersion("vv0.3.0"), "0.3.0");
});

test("Release 说明会压缩空白并限制长度", () => {
  const notes = sanitizeReleaseNotes("  新增更新检查\n\n\n\n修复连接  ", 10);
  assert.equal(notes, "新增更新检查\n\n修复");
});

test("Release 中文说明会清理 Markdown 并移除自动摘要", () => {
  const notes = sanitizeReleaseNotes(`## v0.3.1 更新内容

### Fixed

- **修复版本缓存**：[查看详情](https://example.com)
- 保留中文说明

**Full Changelog**: https://github.com/example/compare/v0.3.0...v0.3.1`);

  assert.match(notes, /v0\.3\.1 更新内容/);
  assert.match(notes, /• 修复版本缓存：查看详情/);
  assert.match(notes, /• 保留中文说明/);
  assert.doesNotMatch(notes, /Full Changelog|https:\/\/example\.com/);
});

test("Release 元数据只接受有效的安装体积", () => {
  assert.deepEqual(parseReleaseMetadata('{"version":"v0.2.1","installedBytes":4096}'), {
    version: "0.2.1",
    installedBytes: 4096,
    generatedAt: "",
  });
  assert.equal(parseReleaseMetadata('{"version":"0.2.1","installedBytes":-1}'), null);
  assert.equal(parseReleaseMetadata("not-json"), null);
});

test("存储占用估算优先使用发布元数据并在缺失时保守估算", () => {
  assert.deepEqual(
    buildStorageEstimate({ currentBytes: 1_000, nextBytes: 2_500, installerBytes: 800 }),
    {
      currentBytes: 1_000,
      estimatedNextBytes: 2_500,
      deltaBytes: 1_500,
      installerBytes: 800,
      estimated: false,
    },
  );

  assert.deepEqual(
    buildStorageEstimate({ currentBytes: 1_000, nextBytes: null, installerBytes: 800 }),
    {
      currentBytes: 1_000,
      estimatedNextBytes: 1_800,
      deltaBytes: 800,
      installerBytes: 800,
      estimated: true,
    },
  );
});

test("存储大小使用易读单位并支持变化量符号", () => {
  assert.equal(formatByteSize(0), "0 B");
  assert.equal(formatByteSize(1_024), "1 KB");
  assert.equal(formatByteSize(1_536), "1.5 KB");
  assert.equal(formatByteSize(1_048_576, { signed: true }), "+1 MB");
  assert.equal(formatByteSize(-100), "未知");
});
