(async () => {
  const ui = (msg) => (document.getElementById("status").textContent = msg);
  try {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    const u = active?.url || "";
    if (!u) { ui("No active URL"); return; }

    // Bookmarklet that talks to the bridge (works everywhere)
    const bookmarklet =
      "javascript:window.dispatchEvent(new CustomEvent('REOPEN_REQUEST',{detail:'" +
      u.replace(/'/g, "\\'") +
      "'}))";

    // try modern clipboard
    try {
      await navigator.clipboard.writeText(bookmarklet);
      ui("Copied reopen URL ✅");
      setTimeout(() => window.close(), 800);
      return;
    } catch {}

    // fallback
    const ta = document.createElement("textarea");
    ta.value = bookmarklet;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();

    if (ok) {
      ui("Copied reopen URL ✅");
      setTimeout(() => window.close(), 800);
    } else {
      ui("Copy manually (⌘C) ↓");
      const pre = document.createElement("textarea");
      pre.readOnly = true;
      pre.style.width = "420px";
      pre.style.height = "120px";
      pre.value = bookmarklet;
      document.body.appendChild(pre);
    }
  } catch (e) {
    console.error(e);
    ui("Copy failed ❌");
  }
})();