import test from "node:test";
import assert from "node:assert/strict";
import { callProvider, probeProvider } from "../server/model-adapters.mjs";

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("OpenAI Responses 适配器使用结构化 JSON 输出", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.openai.test/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer sk-test");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "gpt-test");
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.instructions, "system");
    return jsonResponse({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: '{"title":"测试提示词","score":90}',
            },
          ],
        },
      ],
    });
  });

  const output = await callProvider({
    config: {
      providerId: "openai",
      kind: "openai-responses",
      baseUrl: "https://api.openai.test/v1",
      model: "gpt-test",
      apiKey: "sk-test",
    },
    system: "system",
    user: "user",
  });

  assert.equal(output.result.title, "测试提示词");
  assert.equal(output.result.score, 90);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("OpenAI-compatible Chat 适配器允许本地无密钥服务", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://127.0.0.1:11434/v1/chat/completions");
    assert.equal(options.headers.Authorization, undefined);
    const body = JSON.parse(options.body);
    assert.equal(body.messages.length, 2);
    return jsonResponse({
      choices: [{ message: { content: '```json\n{"title":"本地模型"}\n```' } }],
    });
  });

  const output = await callProvider({
    config: {
      providerId: "ollama",
      kind: "openai-chat",
      baseUrl: "http://127.0.0.1:11434/v1/",
      model: "qwen-test",
      apiKey: "",
    },
    system: "system",
    user: "user",
  });

  assert.equal(output.result.title, "本地模型");
});

test("Anthropic 适配器发送 Messages API 所需头与内容", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.anthropic.test/v1/messages");
    assert.equal(options.headers["x-api-key"], "anthropic-test");
    assert.equal(options.headers["anthropic-version"], "2023-06-01");
    return jsonResponse({
      content: [{ type: "text", text: '{"title":"Claude 结果"}' }],
    });
  });

  const output = await callProvider({
    config: {
      providerId: "anthropic",
      kind: "anthropic",
      baseUrl: "https://api.anthropic.test/v1/",
      model: "claude-test",
      apiKey: "anthropic-test",
    },
    system: "system",
    user: "user",
  });

  assert.equal(output.result.title, "Claude 结果");
});

test("Gemini 适配器把密钥放入查询参数并解析候选内容", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(
      url,
      "https://generativelanguage.test/v1beta/models/gemini-test:generateContent?key=gemini-key",
    );
    const body = JSON.parse(options.body);
    assert.equal(body.systemInstruction.parts[0].text, "system");
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    return jsonResponse({
      candidates: [{ content: { parts: [{ text: '{"title":"Gemini 结果"}' }] } }],
    });
  });

  const output = await callProvider({
    config: {
      providerId: "gemini",
      kind: "gemini",
      baseUrl: "https://generativelanguage.test/v1beta/",
      model: "gemini-test",
      apiKey: "gemini-key",
    },
    system: "system",
    user: "user",
  });

  assert.equal(output.result.title, "Gemini 结果");
});

test("OpenAI-compatible 探测使用 /models 且不消耗生成请求", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://newapi.example.com/v1/models");
    assert.equal(options.headers.Authorization, "Bearer relay-key");
    return jsonResponse({
      data: [{ id: "gpt-5-mini" }, { id: "deepseek-chat" }],
    });
  });

  const output = await probeProvider({
    config: {
      providerId: "dragonapi",
      kind: "openai-auto",
      baseUrl: "https://newapi.example.com/",
      model: "gpt-5-mini",
      apiKey: "relay-key",
    },
  });

  assert.deepEqual(output.result.models, ["gpt-5-mini", "deepseek-chat"]);
  assert.equal(output.endpoint, "https://newapi.example.com/v1/models");
  assert.equal(output.correctedBaseUrl, "https://newapi.example.com/v1");
});

test("Auto 协议在 Chat 路径不存在时回退 Responses", async (t) => {
  let call = 0;
  t.mock.method(globalThis, "fetch", async () => {
    call += 1;
    if (call === 1) {
      return new Response(JSON.stringify({ error: { message: "not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return jsonResponse({
      output: [
        {
          content: [{ type: "output_text", text: '{"title":"Responses 回退"}' }],
        },
      ],
    });
  });

  const output = await callProvider({
    config: {
      providerId: "custom",
      kind: "openai-auto",
      baseUrl: "https://relay.example.com/v1",
      model: "gpt-test",
      apiKey: "relay-key",
    },
    system: "system",
    user: "user",
  });

  assert.equal(output.result.title, "Responses 回退");
  assert.equal(output.fallback, true);
  assert.equal(output.protocolUsed, "responses");
  assert.equal(call, 2);
});

test("200 网页不会被误判为模型连接成功", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    new Response("<!doctype html><title>New API</title>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }),
  );

  await assert.rejects(
    () =>
      callProvider({
        config: {
          providerId: "custom",
          kind: "openai-chat",
          baseUrl: "https://relay.example.com/responses",
          model: "gpt-test",
          apiKey: "relay-key",
        },
        system: "system",
        user: "user",
      }),
    /网页而不是 JSON/,
  );
});
