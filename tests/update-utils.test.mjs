import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  normalizeVersion,
  sanitizeReleaseNotes,
} from "../shared/update-utils.mjs";

test("更新版本比较支持 v 前缀和多段版本", () => {
  assert.equal(compareVersions("0.2.0", "v0.2.1"), 1);
  assert.equal(compareVersions("1.9.0", "1.10.0"), 1);
  assert.equal(compareVersions("2.0.0", "v2.0.0"), 0);
  assert.equal(compareVersions("2.1.0", "2.0.9"), -1);
  assert.equal(normalizeVersion("v0.2.0-beta.1"), "0.2.0");
});

test("Release 说明会压缩空白并限制长度", () => {
  const notes = sanitizeReleaseNotes("  新增更新检查\n\n\n\n修复连接  ", 10);
  assert.equal(notes, "新增更新检查\n\n修复");
});
