import path from "node:path";
import express from "express";
import { callProvider, probeProvider } from "./model-adapters.mjs";

const codingSystemPrompt = `你是「言构」的首席需求编译器，擅长把普通人的自然语言想法转换成 AI 编程智能体能够高准确率执行的开发提示词。

你的工作不是简单润色，而是补齐真正影响交付的信息：
1. 识别产品类型、用户、目标、现有工程上下文和任务类型。
2. 删除空话，合并重复要求，把模糊形容词转化为可验证约束。
3. 在信息不足时最多提出 3 个高价值追问；不要询问可以自行稳妥假设的问题。
4. 输出必须包含主执行提示词、分阶段提示词、精简提示词、需求规格、验收清单与风险。
5. 主提示词必须能让编程智能体直接开始工作，明确要求检查真实仓库、控制改动范围、处理状态与边界、运行验证。
6. 不得虚构用户没有提供的具体业务事实，也不要在提示词里编造昂贵技术方案。
7. 保留用户明确给出的技术栈、平台和限制，冲突时指出而不是擅自覆盖。

只返回一个合法 JSON 对象，不要使用 Markdown 代码围栏。字段与结构必须遵循请求中的说明。所有面向用户的内容使用简体中文。`;

const contentSystemPrompt = `你是「言构」的首席内容提示词编译器，擅长把商务写作、数据分析和营销内容需求转换成可直接交给 AI 工具执行的完整提示词。

工作原则：
1. 先识别业务方向、具体场景、目标受众、已知事实、产出格式和目标工具。
2. 保留用户提供的事实；不得虚构数据、客户、引用、产品参数或品牌结论。
3. 只提出最多 3 个真正阻塞交付的问题。
4. 商务写作强调目的、受众、语气、结构和下一步行动。
5. 数据分析强调字段、指标、公式、异常处理、图表和证据边界。
6. 营销内容强调受众、渠道、卖点、品牌口吻和行动号召。
7. PPT、Word、Excel、PDF 和图像提示词必须使用对应产出格式的专属结构。

只返回一个合法 JSON 对象，不要使用 Markdown 代码围栏。所有面向用户的内容使用简体中文。`;

function buildCodingAiUserPrompt(payload) {
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

function buildContentAiUserPrompt(payload) {
  return `请编译下面的内容创作任务，并在本地草稿基础上提升完整度和可执行性。

## 原始需求
${payload.idea}

## 功能选择
- 业务方向：${payload.contentDomain || "business-writing"}
- 具体场景：${payload.contentScene || "auto"}
- 产出格式：${payload.contentArtifact || "text"}
- 目标工具：${payload.targetTool || "general"}

## 已补充的澄清
${JSON.stringify(payload.answers || {}, null, 2)}

## 本地编译草稿
${JSON.stringify(payload.localDraft || {}, null, 2)}

## 返回 JSON 结构
{
  "title": "简短内容任务标题，不超过 28 字",
  "summary": "用一句话概括业务方向和产出",
  "score": 0到100,
  "prompt": "可直接发送给目标 AI 的完整提示词，使用 Markdown 结构，并包含产出格式专属要求",
  "stagedPrompt": "分三阶段执行的提示词",
  "concisePrompt": "精简的一键执行版提示词",
  "checklist": ["可逐项验证的内容验收标准"],
  "questions": [{"id":"英文短id","question":"最多3个真正重要的问题","reason":"为什么重要","options":["可选答案"]}],
  "spec": [{"title":"章节名","items":["条目"]}],
  "risks": [{"level":"high|medium|low","text":"风险与补救建议"}],
  "dimensions": [
    {"key":"goal","label":"目标清晰度","value":0到100},
    {"key":"audience","label":"受众与场景","value":0到100},
    {"key":"structure","label":"内容结构","value":0到100},
    {"key":"constraint","label":"格式约束","value":0到100},
    {"key":"acceptance","label":"验收质量","value":0到100},
    {"key":"execution","label":"可执行性","value":0到100}
  ]
}

要求：
- prompt、stagedPrompt 和 concisePrompt 必须自包含。
- 不得把未提供的数字、引用或品牌事实写成已知事实。
- Excel 必须包含字段、公式、数据验证和异常处理。
- 图像提示词必须包含主体、构图、风格、光线、比例和负面提示。
- 不要复制本地草稿中的冗余排版，只提升内容准确性和可执行性。`;
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
        system: payload.compileKind === "content" ? contentSystemPrompt : codingSystemPrompt,
        user:
          payload.compileKind === "content"
            ? buildContentAiUserPrompt(payload)
            : buildCodingAiUserPrompt(payload),
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
      const output = await probeProvider({
        config,
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
