(async () => {
  const p = new URLSearchParams(location.search);
  const u = (p.get("u") || "").trim();
  chrome.runtime.sendMessage({ action: "reopen", url: u });
  // this tab is the *temp* tab opened by the bookmarklet, safe to close
  window.close();
})();
