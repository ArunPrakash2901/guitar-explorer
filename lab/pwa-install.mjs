/**
 * Keep installability independent of audio permissions. The app continues to
 * work normally when SW registration is unavailable, rejected, or unsupported.
 * The SW scope is relative, supporting preview and root-subpath deployments.
 */
if ("serviceWorker" in navigator &&
    (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("./sw.js", import.meta.url), { scope: "./" })
      .catch((error) => console.warn("Guitar Explorer offline cache unavailable:", error));
  }, { once: true });
}
