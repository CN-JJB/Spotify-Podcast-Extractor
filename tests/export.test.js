import test from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {readFile} from "node:fs/promises";
import {extractTranscript} from "../extension/extractor.js";
import {FORMATS, renderExport, safeFilename} from "../extension/formats.js";

function panel(rows) {
  return `<div id="transcript-panel">${rows.map(([type, text]) => {
    const span = new JSDOM().window.document.createElement("span");
    span.setAttribute("data-encore-id", "text");
    if (type === "speech") span.setAttribute("dir", "auto");
    if (["heading", "speaker"].includes(type)) span.className = "encore-text-marginal-bold";
    span.textContent = text;
    return `<div style="content-visibility:auto">${span.outerHTML}</div>`;
  }).join("")}</div>`;
}

function fixture(panelHtml, title = "测试单集", source = "https://open.spotify.com/episode/test123") {
  const dom = new JSDOM(`<h1>音乐库</h1><footer><h1>正在播放的另一集</h1></footer><div id="main-view"><h1></h1><a href="/show/testshow">Test Podcast</a><button id="transcript-tab" aria-selected="true">转录</button>${panelHtml}<p>推荐单集不应入稿</p></div>`, {url: source, runScripts: "outside-only"});
  dom.window.document.querySelector("#main-view h1").textContent = title;
  // A reliable regression trap: using innerText would silently return only the first sentence.
  Object.defineProperty(dom.window.HTMLElement.prototype, "innerText", {get() {return "ONLY THE VISIBLE FIRST SENTENCE";}});
  dom.window.extract = dom.window.eval(`(${extractTranscript.toString()})`);
  return dom;
}

const rows = [["note", "此文字记录自动生成，其准确性无法保证。"], ["heading", "第一章"],
  ["speech", "未标注开场。"], ["speaker", "Speaker 1"], ["speech", "Same."], ["speech", "Same."],
  ["speech", "中文、emoji 😀 and **literal** <script>alert(1)</script>."], ["speaker", "Speaker 2"],
  ["speech", "Yes."], ["speaker", "Speaker 1"], ["speech", "See you next time."]];

async function extract(dom) {
  const result = await dom.window.extract({settleMs: 1, timeoutMs: 1000});
  assert.equal(result.ok, true, result.error);
  return result.transcript;
}

test("all offscreen text survives; scope excludes recommendations and playback metadata; repeats stay", async () => {
  const dom = fixture(panel(rows));
  try {
    const data = await extract(dom);
    assert.equal(data.title, "测试单集");
    assert.equal(data.stats.sentences, 6);
    assert.equal(data.stats.last, "See you next time.");
    assert.equal(data.segments.filter(row => row.text === "Same.").length, 2);
    assert.equal(data.segments[0].speaker, null);
    assert.equal(data.stats.speakers, 2);
    assert.ok(!JSON.stringify(data).includes("推荐单集"));
    assert.ok(!JSON.stringify(data).includes("VISIBLE FIRST"));
  } finally {dom.window.close();}
});

test("Markdown separates each speaker turn in stable-color Obsidian callouts", async () => {
  const dom = fixture(panel(rows), 'Title: "你好" [x]');
  try {
    const data = await extract(dom);
    const {text} = renderExport(data, "md");
    assert.equal((text.match(/> \[!info\] Speaker 1/g) || []).length, 2);
    assert.equal((text.match(/> \[!success\] Speaker 2/g) || []).length, 1);
    assert.match(text, /> \[!quote\] 未标注说话人/);
    assert.match(text, /^title: "Title: \\"你好\\" \[x\]"$/m);
    assert.match(text, /Same\. Same\./);
    assert.match(text, /\\\*\\\*literal\\\*\\\*/);
    assert.ok(text.endsWith("> See you next time.\n"));
    const plain = renderExport(data, "md", {speakers: false}).text;
    assert.ok(!plain.includes("[!info]"));
    assert.ok(plain.includes("See you next time."));
  } finally {dom.window.close();}
});

test("all five formats contain the last sentence and do not cut large exports", async () => {
  const dom = fixture(panel(rows));
  try {
    const data = await extract(dom);
    const long = "长句😀".repeat(100000) + " ENDMARK";
    data.blocks.push({type: "speech", speaker: "Speaker 1", text: long});
    data.segments.push({index: 7, speaker: "Speaker 1", text: long});
    for (const format of Object.keys(FORMATS)) {
      const result = renderExport(data, format);
      assert.ok(result.text.includes("ENDMARK"), format);
      assert.ok(result.text.includes("See you next time."), format);
      assert.ok(result.text.length > 400000, format);
    }
    assert.deepEqual(JSON.parse(renderExport(data, "json").text), JSON.parse(JSON.stringify(data)));
    const html = renderExport(data, "html").text;
    assert.ok(!html.includes("<script>alert"));
    assert.ok(html.includes("&lt;script&gt;"));
  } finally {dom.window.close();}
});

test("CSV preserves quoting and protects spreadsheet formula cells", async () => {
  const dom = fixture(panel([["speech", '=HYPERLINK("bad")'], ["speech", "text, with\nnewline"]]));
  try {
    const data = await extract(dom);
    const csv = renderExport(data, "csv").text;
    assert.ok(csv.startsWith("\uFEFF"));
    assert.ok(csv.includes(`"'=HYPERLINK(""bad"")"`));
    assert.ok(csv.includes('"text, with\nnewline"'));
  } finally {dom.window.close();}
});

test("Windows filenames keep Unicode and handle reserved names, separators and trailing dots", () => {
  assert.equal(safeFilename("CON"), "_CON");
  assert.equal(safeFilename("你好: 测试?/\\<>. "), "你好 测试");
  assert.equal(safeFilename("..."), "Spotify 转录");
  assert.ok([...safeFilename("😀".repeat(150))].length <= 110);
});

test("lazy appended rows are collected before declaring stability", async () => {
  const dom = fixture(panel([["speech", "First."]]));
  try {
    setTimeout(() => {
      dom.window.document.querySelector("#transcript-panel").insertAdjacentHTML("beforeend", '<div><span data-encore-id="text" dir="auto">Delayed ending.</span></div>');
    }, 2);
    const data = await extract(dom);
    assert.equal(data.stats.sentences, 2);
    assert.equal(data.stats.last, "Delayed ending.");
  } finally {dom.window.close();}
});

test("unknown markup, recycling rows, route changes, and loading timeout refuse partial success", async () => {
  const unknown = fixture(panel([["speech", "Known."]]).replace("</div>", "<p>Unknown speech</p></div>"));
  try {
    const result = await unknown.window.extract({settleMs: 1, timeoutMs: 1000});
    assert.equal(result.ok, false);
    assert.match(result.error, /无法识别/);
  } finally {unknown.window.close();}
  const recycled = fixture(panel([["speech", "First."], ["speech", "Second."]]));
  try {
    setTimeout(() => recycled.window.document.querySelector('[dir="auto"]').textContent = "Replaced.", 2);
    const result = await recycled.window.extract({settleMs: 1, timeoutMs: 1000});
    assert.equal(result.ok, false);
    assert.match(result.error, /回收字幕行/);
  } finally {recycled.window.close();}
  const changed = fixture(panel(rows));
  try {
    setTimeout(() => changed.window.history.replaceState(null, "", "/episode/different"), 2);
    assert.equal((await changed.window.extract({settleMs: 1, timeoutMs: 1000})).ok, false);
  } finally {changed.window.close();}
  const busy = fixture(panel(rows).replace('id="transcript-panel"', 'id="transcript-panel" aria-busy="true"'));
  try {
    const result = await busy.window.extract({settleMs: 1, timeoutMs: 15});
    assert.equal(result.ok, false);
    assert.match(result.error, /仍在加载/);
  } finally {busy.window.close();}
});

test("real AEE 2713 panel: every speech node matches verbatim, including final sign-off", async t => {
  let sample;
  try {sample = JSON.parse(await readFile(new URL("../tmp/live-page.json", import.meta.url), "utf8"));}
  catch {t.skip("Local live-page snapshot not present"); return;}
  const dom = fixture(sample.panel, sample.title, sample.url);
  try {
    const expected = [...dom.window.document.querySelectorAll('#transcript-panel [data-encore-id="text"][dir]')].map(node => node.textContent.trim());
    const data = await extract(dom);
    assert.deepEqual(JSON.parse(JSON.stringify(data.segments.map(row => row.text))), expected);
    assert.equal(data.stats.last, "See you next time.");
    assert.ok(data.stats.characters > 14000);
    assert.ok(data.stats.sentences > 280);
    for (const format of Object.keys(FORMATS)) assert.ok(renderExport(data, format).text.includes("See you next time."));
  } finally {dom.window.close();}
});
