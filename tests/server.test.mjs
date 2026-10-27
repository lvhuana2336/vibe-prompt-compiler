import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startLocalServer } from "../server/app.mjs";

test("生产服务支持主页、SPA 回退与参数校验", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "yangou-server-test-"));
  await mkdir(path.join(root, "dist"), { recursive: true });
  await writeFile(
    path.join(root, "dist", "index.html"),
    "<!doctype html><title>言构测试</title><main>spa-ready</main>",
  );

  const localServer = await startLocalServer({ root, isDev: false, port: 0 });
  t.after(async () => {
    await localServer.close();
    await rm(root, { recursive: true, force: true });
  });

  const health = await fetch(`${localServer.url}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const homepage = await fetch(localServer.url);
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /spa-ready/);

  const spaRoute = await fetch(`${localServer.url}/history/example`);
  assert.equal(spaRoute.status, 200);
  assert.match(await spaRoute.text(), /spa-ready/);
  assert.equal(spaRoute.headers.get("content-security-policy"), "frame-ancestors 'none'");

  const invalidRequest = await fetch(`${localServer.url}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(invalidRequest.status, 400);
  assert.match((await invalidRequest.json()).error, /不能为空/);
});
