const TIMEOUT_MS = 90_000;

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
    throw new Error(`模型接口返回 ${response.status}：${String(detail).slice(0, 360)}`);
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
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/responses`, {
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
  return openAiText(data);
}

async function requestOpenAiChat({ config, system, user, apiKey }) {
  const baseUrl = cleanBaseUrl(config.baseUrl);
  const response = await fetch(`${baseUrl}/chat/completions`, {
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
  return openAiText(data);
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
  return anthropicText(data);
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
  return geminiText(data);
}

export async function callProvider({ config, system, user, test = false }) {
  const startedAt = Date.now();
  if (!config?.model) throw new Error("请先填写模型名称");
  if (!config?.baseUrl) throw new Error("请先填写模型接口地址");

  const envByProvider = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    gemini: "GEMINI_API_KEY",
    deepseek: "DEEPSEEK_API_KEY",
    kimi: "MOONSHOT_API_KEY",
    qwen: "DASHSCOPE_API_KEY",
    zhipu: "ZHIPU_API_KEY",
    siliconflow: "SILICONFLOW_API_KEY",
  };
  const apiKey =
    String(config.apiKey || "").trim() ||
    process.env[envByProvider[config.providerId]] ||
    "";

  if (!apiKey && !["ollama", "lmstudio", "custom"].includes(config.providerId)) {
    throw new Error("缺少 API Key。请在模型设置中填写，或在服务端环境变量中配置。");
  }

  let text;
  if (config.kind === "openai-responses") {
    text = await requestOpenAiResponses({ config, system, user, apiKey });
  } else if (config.kind === "anthropic") {
    text = await requestAnthropic({ config, system, user, apiKey });
  } else if (config.kind === "gemini") {
    text = await requestGemini({ config, system, user, apiKey });
  } else if (config.kind === "openai-chat") {
    text = await requestOpenAiChat({ config, system, user, apiKey });
  } else {
    throw new Error(`不支持的模型接口类型：${config.kind || "unknown"}`);
  }

  return {
    result: test ? { text } : extractJson(text),
    latency: Date.now() - startedAt,
    provider: config.providerId || "custom",
    model: config.model,
  };
}
