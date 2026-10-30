import { Capacitor } from "@capacitor/core";

export const isNativeAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";

export const remoteApiBaseUrl = String(import.meta.env.VITE_YANGOU_API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

export function apiUrl(path) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${remoteApiBaseUrl}${suffix}`;
}

export function platformLabel(platform) {
  if (platform === "win32") return "Windows";
  if (platform === "android") return "Android";
  if (platform === "web") return "Web";
  return platform || "Web";
}
