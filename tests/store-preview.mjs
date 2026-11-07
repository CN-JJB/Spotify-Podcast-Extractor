// Original demo content, real extension UI. No Spotify account or live transcript.
import assert from "node:assert/strict";
import {cp, mkdir, readFile, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const {chromium} = await import(process.env.SPOTIFY_TEST_PLAYWRIGHT ? pathToFileURL(process.env.SPOTIFY_TEST_PLAYWRIGHT).href : "playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const assets = path.join(root, "store", "assets");
const run = path.join(root, "tmp", `store-preview-${Date.now()}`);
const extension = path.join(run, "extension");
await mkdir(assets, {recursive: true});
await cp(path.join(root, "extension"), extension, {recursive: true});
const manifest = JSON.parse(await readFile(path.join(extension, "manifest.json"), "utf8"));
assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "downloads"]);
assert.ok(!manifest.host_permissions);
// A disposable test copy substitutes for the toolbar's activeTab gesture.
manifest.host_permissions = ["https://open.spotify.com/*"];
await writeFile(path.join(extension, "manifest.json"), JSON.stringify(manifest));
const rows = [
  ["speaker", "Speaker 1"],
  ["speech", "A good conversation can become a useful note."],
  ["speech", "I like to save the original words before adding my own thoughts."],
  ["speaker", "Speaker 2"],
  ["speech", "Keeping each speaker separate helps me follow the exchange."],
  ["speech", "It also makes it easier to return to an idea a week later."],
  ["speaker", "Speaker 1"],
  ["speech", "My notes begin with one question: what do I want to remember?"],
  ["speech", "Then I choose a passage and explain why it matters to me."],
  ["speaker", "Speaker 2"],
  ["speech", "I keep the episode link beside the passage."],
  ["speech", "That way I can listen again and check the context."],
  ["speaker", "Speaker 1"],
  ["speech", "Sometimes I need a reading page; sometimes I need a plain text file."],
  ["speech", "Having a few export formats lets the same source fit different tasks."],
  ["speaker", "Speaker 2"],
  ["speech", "Before saving, I check the first line and the ending."],
  ["speech", "The words stay the same, and my notes can grow around them."]
];
const sourceUrl = "https://open.spotify.com/episode/OriginalDemo";
const html = `<!doctype html><meta charset="utf-8"><title>Original demo</title><main id="main-view"><h1>A conversation worth keeping · Demo</h1><a href="/show/OriginalDemo">Original demonstration • Not a published podcast</a><button id="transcript-tab" aria-selected="true">Transcript</button><div id="transcript-panel">${rows.map(([type, text]) => `<div><span data-encore-id="text" ${type === "speech" ? 'dir="auto"' : 'class="encore-text-marginal-bold"'}>${text}</span></div>`).join("")}</div></main>`;
const context = await chromium.launchPersistentContext(path.join(run, "profile"), {
  channel: "chromium", headless: true, acceptDownloads: true,
  viewport: {width: 1280, height: 800}, deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  await context.route("https://open.spotify.com/**", route => route.fulfill({contentType: "text/html; charset=utf-8", body: html}));
  let worker = context.serviceWorkers()[0];
  worker ||= await context.waitForEvent("serviceworker");
  const extensionId = new URL(worker.url()).host;
  const source = await context.newPage();
  await source.goto(sourceUrl);
  const tabId = await worker.evaluate(async url => (await chrome.tabs.query({url}))[0].id, sourceUrl);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`chrome-extension://${extensionId}/export.html?tab=${tabId}&lang=en`);
  await page.locator("#download:enabled").waitFor();
  assert.equal(await page.locator("#sentences").textContent(), "12");
  assert.equal(await page.locator("#last").textContent(), rows.at(-1)[1]);
  assert.equal(await page.locator('a:text-is("GitHub ↗")').getAttribute("href"), "https://github.com/CN-JJB/Spotify-Podcast-Extractor");
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.ok((await page.locator("#download").textContent()).startsWith("Download"));
  await page.screenshot({path: path.join(assets, "screenshot-1-en-1280x800.png")});
  await page.locator("summary").click();
  await page.locator("#preview .speaker-turn").first().waitFor();
  await page.evaluate(() => window.scrollTo(0, 390));
  await page.screenshot({path: path.join(assets, "screenshot-2-speakers-1280x800.png")});
  await page.locator("#saveAs").uncheck();
  for (const format of ["md", "txt", "html", "json", "csv"]) {
    await page.locator("#format").selectOption(format);
    const event = page.waitForEvent("download");
    await page.locator("#download").click();
    const download = await event;
    const file = path.join(run, `demo.${format}`);
    await download.saveAs(file);
    assert.equal(await download.failure(), null);
    const content = await readFile(file, "utf8");
    for (const [type, text] of rows) if (type === "speech") assert.ok(content.includes(text), `${format} lost a demo sentence`);
    if (format === "md") {assert.ok(content.includes("## Transcript")); assert.ok(content.includes("[!success] Speaker 2"));}
    if (format === "html") assert.ok(content.includes('lang="en"'));
    if (format === "csv") assert.ok(content.includes('"Index","Speaker","Text"'));
  }
  await page.locator("#language").selectOption("zh");
  await page.waitForURL(/lang=zh/);
  await page.locator("#download:enabled").waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(await page.locator("html").getAttribute("lang"), "zh-CN");
  assert.equal(await page.locator("#last").textContent(), rows.at(-1)[1]);
  assert.ok((await page.locator("#download").textContent()).startsWith("下载"));
  await page.screenshot({path: path.join(assets, "screenshot-3-zh-1280x800.png")});
  await page.setViewportSize({width: 390, height: 844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Narrow layout overflows");
  const docs = await context.newPage();
  for (const name of ["help", "privacy"]) {
    await docs.goto(`chrome-extension://${extensionId}/${name}.html`);
    assert.equal(await docs.locator("#english").count(), 1);
    assert.equal(await docs.locator("#chinese").count(), 1);
    assert.ok((await docs.locator("body").textContent()).includes("Spotify-Podcast-Extractor"));
  }
  await source.locator("#transcript-tab").evaluate(el => el.remove());
  await page.goto(`chrome-extension://${extensionId}/export.html?tab=${tabId}&lang=en`);
  await page.locator("#status.error").waitFor();
  assert.ok((await page.locator("#status").textContent()).includes("No Transcript tab"));
  assert.ok(await page.locator("#download").isDisabled());
  assert.deepEqual(errors, []);
  const promo = await context.newPage();
  await promo.setViewportSize({width: 1400, height: 560});
  await promo.goto(pathToFileURL(path.join(root, "store", "promo.html")).href);
  await promo.screenshot({path: path.join(assets, "promo-1400x560.png")});
  console.log("PASS: bilingual UI, original demo, speaker preview, five English downloads, mobile layout, help/privacy, localized error; three store screenshots generated.");
} finally {await context.close();}
