import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDataStore, normalizeHistory } from "../electron/data-store.mjs";

function historyItem(id) {
  return {
    id,
    idea: `idea-${id}`,
    result: { title: `title-${id}`, score: 80 },
    createdAt: "2026-11-23T00:00:00Z",
  };
}

test("用户设置和历史记录可跨启动读取并限制数量", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yangou-data-"));
  const userData = path.join(root, "user-data");
  try {
    const store = createDataStore({
      app: { getPath: () => userData },
      dialog: {},
    });
    await store.saveSettings({
      appearance: { fontScale: "large", theme: "ocean" },
      history: { enabled: true, limit: 2 },
    });
    await store.saveHistory([historyItem("a"), historyItem("b"), historyItem("c")], 2);

    const restartedStore = createDataStore({
      app: { getPath: () => userData },
      dialog: {},
    });
    const loaded = await restartedStore.load();
    assert.deepEqual(loaded.settings, {
      appearance: { fontScale: "large", theme: "ocean" },
      history: { enabled: true, limit: 2 },
    });
    assert.deepEqual(loaded.history.map((item) => item.id), ["a", "b"]);
    assert.equal(loaded.historyExists, true);
    assert.equal(loaded.settingsExists, true);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("历史文件损坏时从备份恢复，清空后不会复活旧记录", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "yangou-data-recovery-"));
  const userData = path.join(root, "user-data");
  try {
    const store = createDataStore({
      app: { getPath: () => userData },
      dialog: {},
    });
    await store.saveHistory([historyItem("first")], 100);
    await store.saveHistory([historyItem("second")], 100);

    const historyPath = path.join(userData, "data", "history.json");
    await fs.writeFile(historyPath, "{broken", "utf8");
    const recovered = await store.load();
    assert.deepEqual(recovered.history.map((item) => item.id), ["first"]);
    assert.equal(recovered.recovered, true);

    await store.clearHistory();
    const cleared = await store.load();
    assert.deepEqual(cleared.history, []);
    assert.equal(cleared.recovered, false);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("导入历史会过滤无效记录并应用上限", () => {
  assert.deepEqual(normalizeHistory([historyItem("a"), { id: "bad" }, historyItem("b")], 1), [
    historyItem("a"),
  ]);
});
