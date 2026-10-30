import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { isNativeAndroid } from "./lib/platform.js";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && !window.yangouDesktop && !isNativeAndroid && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const serviceWorkerUrl = new URL("sw.js", document.baseURI).href;
    const scope = new URL(".", document.baseURI).pathname;
    navigator.serviceWorker.register(serviceWorkerUrl, { scope }).catch(() => {});
  });
}
