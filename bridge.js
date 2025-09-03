(function () {
  if (window.__REOPEN_BRIDGE_INSTALLED__) return;
  window.__REOPEN_BRIDGE_INSTALLED__ = true;

  // Receive DOM event from bookmarklet and forward to background
  window.addEventListener("REOPEN_REQUEST", (e) => {
    const url = (e && e.detail ? String(e.detail) : "");
    if (url) chrome.runtime.sendMessage({ action: "reopen", url });
  });
})();