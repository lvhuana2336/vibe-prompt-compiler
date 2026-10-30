import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOpenAIEndpoint,
  previewProviderEndpoint,
} from "../shared/provider-endpoints.mjs";

test("DragonAPI 首页自动规范化为 /v1", () => {
  const normalized = normalizeOpenAIEndpoint(
    "https://newapi.dragon3api.com/",
    "openai-auto",
  );
  assert.equal(normalized.baseUrl, "https://newapi.dragon3api.com/v1");
  assert.equal(normalized.endpoint, "https://newapi.dragon3api.com/v1/chat/completions");
  assert.equal(normalized.effectiveProtocol, "chat");
});

test("完整 Chat 与 Responses 端点可反推 Base URL 和协议", () => {
  const chat = normalizeOpenAIEndpoint(
    "https://relay.example.com/v1/chat/completions",
    "openai-responses",
  );
  assert.equal(chat.baseUrl, "https://relay.example.com/v1");
  assert.equal(chat.effectiveProtocol, "chat");

  const responses = normalizeOpenAIEndpoint(
    "relay.example.com/v1/responses",
    "openai-auto",
  );
  assert.equal(responses.baseUrl, "https://relay.example.com/v1");
  assert.equal(responses.endpoint, "https://relay.example.com/v1/responses");
});

test("协议预览与实际请求使用相同 URL", () => {
  assert.equal(
    previewProviderEndpoint({
      kind: "openai-chat",
      baseUrl: "https://relay.example.com",
      model: "gpt-test",
    }),
    "https://relay.example.com/v1/chat/completions",
  );
});
