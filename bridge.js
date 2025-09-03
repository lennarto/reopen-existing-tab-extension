(() => {
  if (window.__REOPEN_BRIDGE__) return;
  window.__REOPEN_BRIDGE__ = true;

  window.addEventListener("message", (e) => {
    if (e.source !== window) return;
    if (!e.data || e.data.type !== "REOPEN_REQUEST") return;
    const url = String(e.data.url || "").trim();
    if (url) chrome.runtime.sendMessage({ type: "REOPEN_REQUEST", url });
  });
})();

// --- ensure bridge is present on existing tabs (content_scripts only run on future navigations) ---
async function ensureBridgeInjected(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'ISOLATED',
      func: () => {
        if (window.__REOPEN_BRIDGE__) return;
        window.__REOPEN_BRIDGE__ = true;
        window.addEventListener("message", (e) => {
          if (e.source !== window) return;
          if (!e.data || e.data.type !== "REOPEN_REQUEST") return;
          const url = String(e.data.url || "").trim();
          if (url) chrome.runtime.sendMessage({ type: "REOPEN_REQUEST", url });
        });
      }
    });
  } catch (e) {
    // ignore tabs we cannot inject into (chrome://, extension pages, etc.)
  }
}
// inject into all existing tabs on install/reload
chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  for (const t of tabs) if (t.id != null) ensureBridgeInjected(t.id);
});
// also try when a tab finishes loading
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'complete') ensureBridgeInjected(tabId);
});