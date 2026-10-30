import {
  isOpenAICompatibleKind,
  normalizeOpenAIEndpoint,
} from "../shared/provider-endpoints.mjs";

const TIMEOUT_MS = 90_000;

class ProviderHttpError extends Error {
  constructor(message, { status = 0, detail = "" } = {}) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
    this.detail = detail;
  }
}

function cleanBaseUrl(baseUrl) {
  return String(baseUrl || "").trim().replace(/\/+$/, "");
}

function extractJson(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("模型返回了空内容");

  const withoutFence = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutFence);
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1));
      } catch {
        // Fall through to a text-only shape so users can still recover the output.
      }
    }
    return { prompt: withoutFence };
  }
}

async function readJsonResponse(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  const looksLikeJson = /^[\s]*[\[{]/.test(text);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail =
      data?.error?.message ||
      data?.message ||
      data?.raw ||
      `${response.status} ${response.statusText}`;
    const hint =
      response.status === 401
        ? "API Key 无效或已过期"
        : response.status === 403
          ? "当前密钥无权访问该模型或分组"
          : response.status === 404
            ? "接口路径或模型不存在，请检查 Base URL 与模型 ID"
            : response.status === 429
              ? "请求被限流或额度不足"
              : "模型服务返回错误";
    throw new ProviderHttpError(`${hint}（${response.status}）：${String(detail).slice(0, 360)}`, {
      status: response.status,
      detail,
    });
  }

  if (!looksLikeJson || /text\/html/i.test(contentType)) {
    throw new ProviderHttpError(
      "接口返回了网页而不是 JSON。请检查 Base URL 是否应包含 /v1，或确认地址指向 API 服务。",
      { status: 0, detail: text.slice(0, 180) },
    );
  }

  return data;
}

function openAiText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  if (Array.isArray(data?.output)) {
    return data.output
      .flatMap((item) => (Array.isArray(item?.content) ? item.content : []))
      .map((item) => item?.text || item?.output_text || "")
      .filter(Boolean)
      .join("\n");
  }
  return data?.choices?.[0]?.message?.content || "";
}

function anthropicText(data) {
  return (data?.content || [])
    .filter((item) => item?.type === "text")
    .map((item) => item.text)
    .join("\n");
}

function geminiText(data) {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((item) => item?.text || "")
    .filter(Boolean)
    .join("\n");
}

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    score: { type: "number" },
    prompt: { type: "string" },
    stagedPrompt: { type: "string" },
    concisePrompt: { type: "string" },
    checklist: { type: "array", items: { type: "string" } },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          reason: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["id", "question", "reason", "options"],
      },
    },
    spec: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          items: { type: "array", items: { type: "string" } },
        },
        required: ["title", "items"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          level: { type: "string", enum: ["high", "medium", "low"] },
          text: { type: "string" },
        },
        required: ["level", "text"],
      },
    },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          value: { type: "number" },
        },
        required: ["key", "label", "value"],
      },
    },
  },
  required: [
    "title",
    "summary",
    "score",
    "prompt",
    "stagedPrompt",
    "concisePrompt",
    "checklist",
    "questions",
    "spec",
    "risks",
    "dimensions",
  ],
};

async function requestOpenAiResponses({ config, system, user, apiKey }) {
  const normalized = normalizeOpenAIEndpoint(config.baseUrl, "openai-responses");
  if (!normalized) throw new Error("模型接口地址格式不正确");
  const response = await fetch(normalized.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      instructions: system,
      input: user,
      max_output_tokens: 6000,
      text: {
        format: {
          type: "json_schema",
          name: "vibe_prompt_compilation",
          strict: true,
          schema: responseSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await readJsonResponse(response);
  return {
    text: openAiText(data),
    endpoint: normalized.endpoint,
    protocolUsed: "responses",
  };
}

async function requestOpenAiChat({ config, system, user, apiKey }) {
  const normalized = normalizeOpenAIEndpoint(config.baseUrl, "openai-chat");
  if (!normalized) throw new Error("模型接口地址格式不正确");
  const response = await fetch(normalized.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 6000,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await readJsonResponse(response);
  return {
    text: openAiText(data),
    endpoint: normalized.endpoint,
    protocolUsed: "chat",
  };
}

async function requestAnthropic({ config, system, user, apiKey }) {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.model,
      system,
      max_tokens: 6000,
      temperature: 0.2,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await readJsonResponse(response);
  return {
    text: anthropicText(data),
    endpoint: `${baseUrl}/messages`,
    protocolUsed: "anthropic",
  };
}

async function requestGemini({ config, system, user, apiKey }) {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const model = encodeURIComponent(config.model);
  const response = await fetch(
    `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 6000,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  const data = await readJsonResponse(response);
  return {
    text: geminiText(data),
    endpoint: `${baseUrl}/models/${model}:generateContent`,
    protocolUsed: "gemini",
  };
}

function resolveApiKey(config) {
  const envByProvider = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    kimi: "MOONSHOT_API_KEY",
    qwen: "DASHSCOPE_API_KEY",
    zhipu: "ZHIPU_API_KEY",
    siliconflow: "SILICONFLOW_API_KEY",
    dragonapi: "DRAGONAPI_API_KEY",
  };
  return (
    String(config.apiKey || "").trim() ||
    process.env[envByProvider[config.providerId]] ||
    ""
  );
}

function validateProviderConfig(config) {
  if (!config?.model) throw new Error("请先填写模型名称");
  if (!config?.baseUrl) throw new Error("请先填写模型接口地址");
}

function ensureApiKey(config, apiKey) {
  if (!apiKey && !["ollama", "lmstudio", "custom"].includes(config.providerId)) {
    throw new Error("缺少 API Key。请在模型设置中填写，或在服务端环境变量中配置。");
  }
}

export async function callProvider({ config, system, user, test = false }) {
  const startedAt = Date.now();
  validateProviderConfig(config);
  const apiKey = resolveApiKey(config);
  ensureApiKey(config, apiKey);

  let output;
  let fallback = false;
  if (config.kind === "openai-responses") {
    try {
      output = await requestOpenAiResponses({ config, system, user, apiKey });
    } catch (error) {
      if ([404, 405].includes(error.status)) {
        output = await requestOpenAiChat({ config, system, user, apiKey });
        fallback = true;
      } else {
        throw error;
      }
    }
  } else if (config.kind === "openai-auto") {
    try {
      output = await requestOpenAiChat({ config, system, user, apiKey });
    } catch (error) {
      if ([404, 405].includes(error.status)) {
        output = await requestOpenAiResponses({ config, system, user, apiKey });
        fallback = true;
      } else {
        throw error;
      }
    }
  } else if (config.kind === "anthropic") {
    output = await requestAnthropic({ config, system, user, apiKey });
  } else if (config.kind === "gemini") {
    output = await requestGemini({ config, system, user, apiKey });
  } else if (config.kind === "openai-chat") {
    output = await requestOpenAiChat({ config, system, user, apiKey });
  } else {
    throw new Error(`不支持的模型接口类型：${config.kind || "unknown"}`);
  }

  return {
    result: test ? { text: output.text } : extractJson(output.text),
    latency: Date.now() - startedAt,
    provider: config.providerId || "custom",
    model: config.model,
    endpoint: output.endpoint,
    protocolUsed: output.protocolUsed,
    fallback,
  };
}

export async function probeProvider({ config }) {
  validateProviderConfig(config);
  const startedAt = Date.now();
  const apiKey = resolveApiKey(config);
  ensureApiKey(config, apiKey);

  if (isOpenAICompatibleKind(config.kind)) {
    const normalized = normalizeOpenAIEndpoint(config.baseUrl, config.kind);
    if (!normalized) throw new Error("模型接口地址格式不正确");
    const response = await fetch(normalized.modelsEndpoint, {
      headers: {
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      signal: AbortSignal.timeout(20_000),
    });
    const data = await readJsonResponse(response);
    const models = Array.isArray(data?.data)
      ? data.data.map((item) => item?.id).filter(Boolean).slice(0, 200)
      : [];
    return {
      result: { models },
      latency: Date.now() - startedAt,
      provider: config.providerId || "custom",
      model: config.model,
      endpoint: normalized.modelsEndpoint,
      requestEndpoint: normalized.endpoint,
      protocolUsed: normalized.effectiveProtocol,
      correctedBaseUrl: normalized.inputChanged ? normalized.baseUrl : "",
    };
  }

  const output = await callProvider({
    config,
    system: "你是连接测试助手。只回复：连接成功。",
    user: "请回复：连接成功。",
    test: true,
  });
  return {
    ...output,
    result: { models: [] },
  };
}
