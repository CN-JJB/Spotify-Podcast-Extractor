// This function is serialized by chrome.scripting; keep all dependencies inside it.
export async function extractTranscript({settleMs = 650, timeoutMs = 30000} = {}) {
  try {
    const fail = (code, message) => {throw Object.assign(new Error(message), {code});};
    const episode = location.pathname.match(/^\/(?:intl-[^/]+\/)?episode\/([a-zA-Z0-9]+)\/?$/);
    if (location.hostname !== "open.spotify.com" || !episode) {
      fail("wrongPage", "请回到 Spotify 的播客单集页面，再点击扩展图标。");
    }
    const episodeId = episode[1];
    const originalPath = location.pathname;
    const started = Date.now();
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const ensureSameEpisode = () => {
      if (location.pathname !== originalPath) fail("navigated", "提取过程中切换了单集，请在目标单集上重新点击扩展。");
      if (Date.now() - started > timeoutMs) fail("loading", "转录仍在加载，暂未生成文件。请等待页面加载完成后重新提取。");
    };
    const main = document.querySelector("#main-view") || document.querySelector("main");
    if (!main) fail("noMain", "没有找到 Spotify 单集内容，请等待页面加载完成。");
    const tab = main.querySelector("#transcript-tab");
    if (!tab) fail("noTranscript", "这一集没有找到「转录」标签；请确认 Spotify 已提供这集的文字稿。");
    if (tab.getAttribute("aria-selected") !== "true") tab.click();

    let panel;
    while (!(panel = main.querySelector("#transcript-panel")) || panel.hidden || panel.getAttribute("aria-hidden") === "true") {
      ensureSameEpisode();
      await wait(settleMs);
    }

    const clean = (value) => (value || "").replace(/\r\n?/g, "\n").trim();
    const speakerPattern = /^(?:speaker|说话人|說話者|说话者|講者|发言人|發言人|sprecher|locuteur|hablante|orador)\s*\d+\s*[:：]?$/iu;
    function read() {
      ensureSameEpisode();
      if (!panel.isConnected || main.querySelector("#transcript-panel") !== panel || tab.getAttribute("aria-selected") !== "true") {
        fail("panelChanged", "转录面板已发生切换，请重新提取。");
      }
      const nodes = [...panel.querySelectorAll('[data-encore-id="text"]')]
        .filter(node => !node.querySelector('[data-encore-id="text"]'));
      const blocks = [];
      let speaker = null;
      for (const node of nodes) {
        // textContent includes offscreen content-visibility:auto rows. innerText does not.
        const text = clean(node.textContent);
        if (!text || node.closest('[aria-hidden="true"], [hidden], button, [role="button"], script, style')) continue;
        if (node.hasAttribute("dir")) {
          blocks.push({type: "speech", text, speaker});
        } else if (node.classList.contains("encore-text-marginal-bold")) {
          if (speakerPattern.test(text)) {
            speaker = text.replace(/[:：]\s*$/u, "");
            blocks.push({type: "speaker", text: speaker});
          } else {
            // Spotify uses the same label style for chapters. Never invent a speaker name.
            blocks.push({type: "heading", text});
          }
        } else if (/automatically generated|auto.generated|accuracy|文字记录|文字記錄|自动生成|自動生成/i.test(text)) {
          blocks.push({type: "note", text});
        } else {
          blocks.push({type: "unknown", text});
        }
      }
      const speech = blocks.filter(block => block.type === "speech");
      // Unknown markup must fail closed instead of silently omitting unparsed text.
      const recognized = new Set(nodes);
      const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT);
      const unparsed = blocks.filter(block => block.type === "unknown").map(block => block.text);
      for (let node; (node = walker.nextNode());) {
        if (!clean(node.nodeValue)) continue;
        const parent = node.parentElement;
        if (!parent || parent.closest('[aria-hidden="true"], [hidden], button, [role="button"], script, style')) continue;
        if (!recognized.has(parent.closest('[data-encore-id="text"]'))) unparsed.push(clean(node.nodeValue));
      }
      const busy = panel.matches('[aria-busy="true"]') || !!panel.querySelector('[aria-busy="true"], [role="progressbar"]');
      return {blocks, speech, busy, unparsed};
    }

    let scroller = panel.parentElement;
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) {
      scroller = scroller.parentElement;
    }
    scroller ||= document.scrollingElement;
    const originalTop = scroller?.scrollTop || 0;
    const originalBehavior = scroller?.style.scrollBehavior || "";
    let previousSpeech = [];
    let stable = 0;
    let previousSignature = "";
    let snapshot;
    let rounds = 0;
    try {
      if (scroller) {
        scroller.style.scrollBehavior = "auto";
        // Visit the start, then the end. This triggers ordinary lazy append loaders.
        scroller.scrollTop = Math.max(0, originalTop + panel.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
      }
      while (stable < 3) {
        ensureSameEpisode();
        snapshot = read();
        if (snapshot.speech.length) {
          const texts = snapshot.speech.map(row => row.text);
          if (previousSpeech.some((text, index) => texts[index] !== text)) {
            fail("recycled", "页面正在替换或回收字幕行，无法确认全文完整；没有导出可能缺失的文件。请等转录稳定后重试。");
          }
          previousSpeech = texts;
        }
        const signature = JSON.stringify(snapshot.blocks);
        const isAtEnd = !scroller || panel.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().bottom + 2 || scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
        stable = snapshot.speech.length && !snapshot.busy && isAtEnd && signature === previousSignature ? stable + 1 : 0;
        previousSignature = signature;
        if (scroller) {
          scroller.scrollTop += panel.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom + 2;
        }
        rounds++;
        await wait(settleMs);
      }
      // One final read after the last quiet interval; don't export an outdated snapshot.
      const final = read();
      if (final.busy || JSON.stringify(final.blocks) !== previousSignature) fail("updated", "转录刚刚更新，请重新提取，以免遗漏新加载的内容。");
      snapshot = final;
      if (snapshot.unparsed.length) fail("structure", "Spotify 转录结构有变化，检测到无法识别的文字。为避免漏字，本次未导出。");
      if (!snapshot.speech.length) fail("empty", "转录面板没有可读取的字幕正文。");
    } finally {
      if (scroller && location.pathname === originalPath) {
        scroller.scrollTop = originalTop;
        scroller.style.scrollBehavior = originalBehavior;
      }
    }
    const show = main.querySelector('a[href*="/show/"]');
    const title = clean(main.querySelector("h1")?.textContent) || clean(document.title.replace(/\s*[|•]\s*.*$/, ""));
    const segments = snapshot.speech.map((row, index) => ({index: index + 1, speaker: row.speaker, text: row.text}));
    return {ok: true, transcript: {
      schemaVersion: 1,
      title,
      podcast: clean(show?.textContent),
      podcastUrl: show?.href || "",
      source: `https://open.spotify.com/episode/${episodeId}`,
      episodeId,
      exportedAt: new Date().toISOString(),
      blocks: snapshot.blocks,
      segments,
      stats: {
        sentences: segments.length,
        characters: segments.reduce((sum, segment) => sum + [...segment.text].length, 0),
        speakers: new Set(segments.map(row => row.speaker).filter(Boolean)).size,
        first: segments[0].text,
        last: segments.at(-1).text
      },
      verification: {method: "transcript-panel-textContent", stablePasses: stable, rounds, scope: "all-loaded-panel-rows"}
    }};
  } catch (error) {
    return {ok: false, error: error?.message || String(error), errorCode: error?.code || null};
  }
}
