console.log("[reopen] service worker loaded");

function normalize(input) {
  let s = (input || "").trim();
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return {
      host: u.hostname.replace(/^www\./, ""),
      path: (u.pathname + u.search).replace(/\/$/, ""),
      full: u.toString()
    };
  } catch {
    return { host: s.replace(/^www\./, ""), path: "", full: s };
  }
}

function scoreTab(tabUrl, target) {
  try {
    const u = new URL(tabUrl);
    const host = u.hostname.replace(/^www\./, "");
    let score = 0;
    if (host === target.host) score += 10;
    else if (host.endsWith("." + target.host)) score += 7;
    if (target.path && (u.pathname + u.search).replace(/\/$/, "") === target.path) score += 2;
    return score;
  } catch {
    return -1;
  }
}

async function reopenCore(input) {
  console.log("[reopen] reopenCore input:", input);
  const target = normalize(input);
  const tabs = await chrome.tabs.query({});
  let best = null, bestScore = -1;

  for (const t of tabs) {
    const s = scoreTab(t.url || "", target);
    if (s > bestScore) { bestScore = s; best = t; }
  }

  if (best && bestScore >= 7) {
    await chrome.windows.update(best.windowId, { focused: true });
    await chrome.tabs.update(best.id, { active: true });
    return;
  }

  const urlToOpen = target.full.startsWith("http") ? target.full : "https://" + target.host;
  await chrome.tabs.create({ url: urlToOpen });
}

// page/content-script → background message
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "REOPEN_REQUEST" && msg.url) {
    console.log("[reopen] background got message:", msg);
    reopenCore(msg.url);
  }
});

// Optional: if you ever remove the popup, clicking the icon still does something useful
chrome.action.onClicked?.addListener(async (tab) => {
  if (tab?.url) reopenCore(tab.url);
});

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