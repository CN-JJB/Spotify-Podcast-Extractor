// Isolated Chromium test: no user profile, credentials, or live network access.
import assert from "node:assert/strict";
import {cp, mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {renderExport, safeFilename, FORMATS} from "../extension/formats.js";

const {chromium} = await import(process.env.SPOTIFY_TEST_PLAYWRIGHT ? pathToFileURL(process.env.SPOTIFY_TEST_PLAYWRIGHT).href : "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const tempRoot = path.resolve(root, "tmp");
const sample = JSON.parse(await readFile(path.join(tempRoot, "live-page.json"), "utf8"));
const run = path.join(tempRoot, `browser-${Date.now()}`);
const extension = path.join(run, "extension");
await mkdir(run, {recursive: true});
await cp(path.join(root, "extension"), extension, {recursive: true});
const manifest = JSON.parse(await readFile(path.join(extension, "manifest.json"), "utf8"));
assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "downloads"]);
assert.ok(!manifest.host_permissions);
// Headless Chromium has no toolbar click. Only this disposable copy is allowed
// to inject into the fixture origin; the distributed extension keeps activeTab only.
manifest.host_permissions = ["https://open.spotify.com/*"];
await writeFile(path.join(extension, "manifest.json"), JSON.stringify(manifest));
const context = await chromium.launchPersistentContext(path.join(run, "profile"), {
  channel: "chromium", headless: true, acceptDownloads: true,
  downloadsPath: path.join(run, "downloads"), viewport: {width: 1280, height: 1000},
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  await context.route("https://open.spotify.com/**", async route => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Fixture</title><style>#main-view{height:700px;overflow-y:auto}#transcript-panel>div{content-visibility:auto;contain-intrinsic-size:50px;padding:10px}</style></head><body><h1>音乐库</h1><div id="main-view"><h1></h1><a href="${sample.showUrl}"></a><button id="transcript-tab" aria-selected="true">转录</button>${sample.panel}<p>Recommended episode should never be exported.</p></div><footer>Now playing a different episode</footer></body></html>`;
    await route.fulfill({contentType: "text/html; charset=utf-8", body: html});
  });
  let worker = context.serviceWorkers()[0];
  worker ||= await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  const source = await context.newPage();
  await source.goto(sample.url);
  await source.evaluate(({title, show}) => {
    document.querySelector("#main-view h1").textContent = title;
    document.querySelector("#main-view a").textContent = show;
  }, sample);
  const before = await source.locator("#transcript-panel").evaluate(panel => ({visible: panel.innerText.length, all: panel.textContent.length}));
  assert.ok(before.visible < before.all / 2, "Fixture must reproduce offscreen truncation");
  const tabId = await worker.evaluate(async url => (await chrome.tabs.query({url}))[0].id, sample.url);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/export.html?tab=${tabId}&lang=zh`);
  await page.locator("#download:enabled").waitFor({timeout: 35000});
  assert.equal(await page.locator("#title").textContent(), sample.title);
  assert.equal(await page.locator("#sentences").textContent(), "301");
  assert.equal(await page.locator("#last").textContent(), "See you next time.");
  await page.locator("#saveAs").uncheck();
  const files = {};
  for (const format of ["json", "md", "txt", "html", "csv"]) {
    await page.locator("#format").selectOption(format);
    const pending = page.waitForEvent("download", {timeout: 15000});
    await page.locator("#download").click();
    const download = await pending;
    const target = path.join(run, `${safeFilename(sample.title)}.${FORMATS[format].extension}`);
    await download.saveAs(target);
    assert.equal(await download.failure(), null);
    const text = await readFile(target, "utf8");
    files[format] = {target, bytes: Buffer.byteLength(text), text};
    assert.ok(text.includes("See you next time."));
    assert.ok(text.length > 14929);
    console.log(JSON.stringify({format, bytes: files[format].bytes, filename: download.suggestedFilename()}));
  }
  const transcript = JSON.parse(files.json.text);
  const expected = await source.locator('#transcript-panel [data-encore-id="text"][dir]').allTextContents();
  assert.deepEqual(transcript.segments.map(row => row.text), expected.map(text => text.trim()));
  for (const format of ["md", "txt", "html", "csv"]) {
    assert.equal(files[format].text, renderExport(transcript, format).text, `${format}: downloaded bytes differ from full export`);
  }
  assert.match(files.md.text, /> \[!info\] Speaker 1/);
  assert.match(files.md.text, /> \[!success\] Speaker 2/);
  await page.locator("#format").selectOption("md");
  await page.locator("summary").click();
  await page.locator("#preview p").first().waitFor();
  const previewText = await page.locator("#preview").textContent();
  for (const row of transcript.segments) assert.ok(previewText.includes(row.text), "Full preview must include every source sentence");
  assert.ok(await page.locator('#preview [data-tone="1"]').count() > 1);
  assert.ok(await page.locator('#preview [data-tone="2"]').count() > 1);
  await page.screenshot({path: path.join(run, "export-preview.png"), fullPage: true});
  assert.deepEqual(errors, []);
  await writeFile(path.join(tempRoot, "browser-acceptance.json"), JSON.stringify({run, extensionId, before, stats: transcript.stats, files: Object.fromEntries(Object.entries(files).map(([format, file]) => [format, {target: file.target, bytes: file.bytes}])), screenshot: path.join(run, "export-preview.png"), errors, permissionTestNote: "Headless fixture injection uses a disposable origin permission; release manifest remains activeTab-only."}, null, 2));
  console.log("PASS: all five browser downloads match complete export bytes; 301 source sentences match verbatim.");
} finally {await context.close();}
