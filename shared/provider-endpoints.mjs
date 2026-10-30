export const OPENAI_COMPATIBLE_KINDS = new Set([
  "openai-auto",
  "openai-chat",
  "openai-responses",
]);

export function isOpenAICompatibleKind(kind) {
  return OPENAI_COMPATIBLE_KINDS.has(kind);
}

function toUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function trimPath(pathname) {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "";
}

export function normalizeOpenAIEndpoint(baseUrl, kind = "openai-auto") {
  const parsed = toUrl(baseUrl);
  if (!parsed) return null;

  let path = trimPath(parsed.pathname);
  let protocol =
    kind === "openai-responses" ? "responses" : kind === "openai-chat" ? "chat" : "auto";

  if (path.endsWith("/chat/completions")) {
    path = path.slice(0, -"/chat/completions".length);
    protocol = "chat";
  } else if (path.endsWith("/responses")) {
    path = path.slice(0, -"/responses".length);
    protocol = "responses";
  }

  const appendedV1 = !path;
  if (appendedV1) path = "/v1";

  parsed.search = "";
  parsed.hash = "";
  const resolvedBaseUrl = `${parsed.origin}${path}`;
  const effectiveProtocol = protocol === "auto" ? "chat" : protocol;
  const suffix = effectiveProtocol === "responses" ? "/responses" : "/chat/completions";

  return {
    baseUrl: resolvedBaseUrl,
    endpoint: `${resolvedBaseUrl}${suffix}`,
    modelsEndpoint: `${resolvedBaseUrl}/models`,
    protocol,
    effectiveProtocol,
    appendedV1,
    inputChanged: resolvedBaseUrl !== String(baseUrl || "").trim().replace(/\/+$/, ""),
  };
}

export function previewProviderEndpoint(provider) {
  if (!provider?.baseUrl) return "";
  if (isOpenAICompatibleKind(provider.kind)) {
    return normalizeOpenAIEndpoint(provider.baseUrl, provider.kind)?.endpoint || "";
  }

  const base = String(provider.baseUrl).trim().replace(/\/+$/, "");
  if (provider.kind === "anthropic") return `${base}/messages`;
  if (provider.kind === "gemini") {
    const model = provider.model ? encodeURIComponent(provider.model) : "{model}";
    return `${base}/models/${model}:generateContent`;
  }
  return "";
}

export function describeProtocol(kind) {
  if (kind === "openai-responses") return "Responses";
  if (kind === "openai-auto") return "Auto（优先 Chat）";
  if (kind === "openai-chat") return "Chat Completions";
  if (kind === "anthropic") return "Anthropic Messages";
  if (kind === "gemini") return "Gemini Generate Content";
  return kind || "未配置";
}
