import path from "node:path";
import express from "express";
import { callProvider } from "./model-adapters.mjs";

const systemPrompt = `你是「言构」的首席需求编译器，擅长把普通人的自然语言想法转换成 AI 编程智能体能够高准确率执行的开发提示词。

你的工作不是简单润色，而是补齐真正影响交付的信息：
1. 识别产品类型、用户、目标、现有工程上下文和任务类型。
2. 删除空话，合并重复要求，把模糊形容词转化为可验证约束。
3. 在信息不足时最多提出 3 个高价值追问；不要询问可以自行稳妥假设的问题。
4. 输出必须包含主执行提示词、分阶段提示词、精简提示词、需求规格、验收清单与风险。
5. 主提示词必须能让编程智能体直接开始工作，明确要求检查真实仓库、控制改动范围、处理状态与边界、运行验证。
6. 不得虚构用户没有提供的具体业务事实，也不要在提示词里编造昂贵技术方案。
7. 保留用户明确给出的技术栈、平台和限制，冲突时指出而不是擅自覆盖。

只返回一个合法 JSON 对象，不要使用 Markdown 代码围栏。字段与结构必须遵循请求中的说明。所有面向用户的内容使用简体中文。`;

function buildAiUserPrompt(payload) {
  return `请编译下面的需求，并在本地草稿基础上提升准确性。不要省略可执行细节。

## 原始需求
${payload.idea}

## 用户选择
- 任务类型：${payload.taskType || "auto"}
- 目标编程工具：${payload.targetTool || "codex"}

## 已补充的澄清
${JSON.stringify(payload.answers || {}, null, 2)}

## 本地编译草稿
${JSON.stringify(payload.localDraft || {}, null, 2)}

## 返回 JSON 结构
{
  "title": "简短任务标题，不超过 28 字",
  "summary": "用一句话概括产品与技术任务",
  "score": 0到100,
  "prompt": "可直接发送给编程智能体的完整主提示词，使用 Markdown 结构",
  "stagedPrompt": "分阶段执行版提示词",
  "concisePrompt": "更短的一键执行版提示词",
  "checklist": ["可逐项验证的验收标准"],
  "questions": [{"id":"英文短id","question":"最多3个真正重要的问题","reason":"为什么重要","options":["可选答案"]}],
  "spec": [{"title":"章节名","items":["条目"]}],
  "risks": [{"level":"high|medium|low","text":"风险与补救建议"}],
  "dimensions": [
    {"key":"goal","label":"目标清晰度","value":0到100},
    {"key":"context","label":"使用场景","value":0到100},
    {"key":"interaction","label":"交互完整度","value":0到100},
    {"key":"constraint","label":"边界约束","value":0到100},
    {"key":"technology","label":"技术可执行性","value":0到100}
  ]
}

要求：
- prompt 与 stagedPrompt 必须自包含，不能依赖聊天上下文。
- 不要输出“请根据实际情况调整”这类无法执行的空话。
- 如果原始需求是修 Bug，必须强调复现、根因、最小修复和回归验证。
- 如果本地草稿已经准确，可以保留其事实，不要为了差异化而改坏技术约束。`;
}

export function loadEnvironment(root) {
  try {
    process.loadEnvFile?.(path.join(root, ".env"));
  } catch {
    // A packaged app commonly has no .env file. Browser settings still work.
  }
}

export async function startLocalServer({ root, isDev = false, port = 0 }) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_request, response, next) => {
    response.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    next();
  });
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({
      ok: true,
      desktop: true,
      time: new Date().toISOString(),
      serverKeys: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
      },
    });
  });

  app.post("/api/generate", async (request, response) => {
    const payload = request.body || {};
    if (!String(payload.idea || "").trim()) {
      return response.status(400).json({ error: "需求描述不能为空。" });
    }

    try {
      const output = await callProvider({
        config: payload.provider,
        system: systemPrompt,
        user: buildAiUserPrompt(payload),
      });
      response.json(output);
    } catch (error) {
      console.error("[model generate]", error.message);
      response.status(502).json({ error: error.message || "模型生成失败。" });
    }
  });

  app.post("/api/test", async (request, response) => {
    const config = request.body?.provider;
    try {
      const output = await callProvider({
        config,
        system: "你是连接测试助手。只回复：连接成功。",
        user: "请回复：连接成功。",
        test: true,
      });
      response.json(output);
    } catch (error) {
      response.status(502).json({ error: error.message || "连接失败。" });
    }
  });

  let vite;
  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root, "dist")));
    app.get(/.*/, (_request, response) => {
      response.sendFile("index.html", { root: path.join(root, "dist") });
    });
  }

  const server = await new Promise((resolve, reject) => {
    const instance = app.listen(port, "127.0.0.1", () => resolve(instance));
    instance.once("error", reject);
  });

  return {
    app,
    server,
    vite,
    port: server.address().port,
    url: `http://127.0.0.1:${server.address().port}`,
    async close() {
      await vite?.close();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
