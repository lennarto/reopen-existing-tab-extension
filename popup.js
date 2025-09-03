(async () => {
  const ui = (m) => (document.getElementById("status").textContent = m);
  try {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    const u = active?.url || "";
    if (!u) { ui("No active URL"); return; }

    // Bookmarklet that talks to bridge.js via postMessage
    const b = "javascript:window.postMessage({type:'REOPEN_REQUEST',url:'" +
              u.replace(/'/g, "\\'") + "'},'*')";

    try {
      await navigator.clipboard.writeText(b);
      ui("   Copied reopen URL");
      setTimeout(() => window.close(), 800);
      return;
    } catch {}

    // Fallback copy path
    const ta = document.createElement("textarea");
    ta.value = b;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();

    if (ok) {
      ui("   Copied reopen URL");
      setTimeout(() => window.close(), 800);
    } else {
      ui("Copy manually (⌘C) ↓");
      const pre = document.createElement("textarea");
      pre.readOnly = true;
      pre.style.width = "420px";
      pre.style.height = "120px";
      pre.value = b;
      document.body.appendChild(pre);
    }
  } catch (e) {
    console.error(e);
    ui(" Copy failed ❌");
  }
})();