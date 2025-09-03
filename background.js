console.debug("[reopen] service worker loaded");

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
  console.debug("[reopen] reopenCore input:", input);
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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.action === "reopen") {
    console.debug("[reopen] background got message:", msg);
    reopenCore(msg.url || "");
  }
});

chrome.omnibox.onInputEntered.addListener((text) => {
  if (text && text.trim()) reopenCore(text);
});

// Optional: if you ever remove the popup, clicking the icon will still do something useful
chrome.action.onClicked?.addListener(async (tab) => {
  if (tab?.url) reopenCore(tab.url);
});