import {extractTranscript} from "./extractor.js";
import {FORMATS, paragraphs, renderExport} from "./formats.js";
import {language, t, applyTranslations} from "./i18n.js";

const $ = id => document.getElementById(id);
const tabParam = new URL(location.href).searchParams.get("tab");
const tabId = tabParam && /^\d+$/.test(tabParam) ? Number(tabParam) : null;
let transcript = null;
const pendingDownloads = new Map();
applyTranslations();
$("language").value = language;
$("language").addEventListener("change", () => {const url = new URL(location.href); url.searchParams.set("lang", $("language").value); location.replace(url.href);});

function settings() {return {speakers: $("speakers").checked, metadata: $("metadata").checked, sentenceLines: $("sentenceLines").checked, language};}
function setStatus(text, error = false) {$("status").textContent = text; $("status").classList.toggle("error", error);}
function refreshPreview() {
  $("preview").replaceChildren();
  if (!transcript || !$("previewDetails").open) return;
  const fragment = document.createDocumentFragment();
  for (const block of paragraphs(transcript, settings())) {
    if (block.type === "heading") {
      const heading = document.createElement("h2"); heading.textContent = block.text; fragment.append(heading);
    } else {
      const section = document.createElement("section");
      if (settings().speakers) {
        section.className = "speaker-turn";
        section.dataset.tone = block.speaker ? String(Number(block.speaker.match(/(\d+)$/)?.[1] || 1) % 6) : "unknown";
        const label = document.createElement("h3"); label.textContent = block.speaker || t("unknown"); section.append(label);
      }
      const paragraph = document.createElement("p"); paragraph.textContent = block.lines.join(" "); section.append(paragraph); fragment.append(section);
    }
  }
  $("preview").append(fragment);
}
function formatChanged() {
  const format = $("format").value;
  $("formatHint").textContent = t(`hint_${format}`);
  $("options").disabled = format === "json" || format === "csv";
  $("download").textContent = t("download", {format: FORMATS[format].extension.toUpperCase()});
  refreshPreview();
}
async function load() {
  transcript = null;
  $("download").disabled = true;
  $("retry").disabled = true;
  $("preview").replaceChildren();
  $("source").hidden = true;
  for (const id of ["sentences", "characters", "speakerCount", "first", "last"]) $(id).textContent = "—";
  $("downloadStatus").textContent = "";
  setStatus(t("loading"));
  try {
    if (tabId == null) throw new Error(t("startFromEpisode"));
    const results = await chrome.scripting.executeScript({target: {tabId}, func: extractTranscript});
    const result = results[0]?.result;
    if (!result?.ok) throw new Error(result?.errorCode ? t(`error_${result.errorCode}`) : result?.error || t("readError"));
    transcript = result.transcript;
    $("title").textContent = transcript.title;
    document.title = `${transcript.title} · ${t("brand")}`;
    $("podcast").textContent = transcript.podcast;
    $("source").href = transcript.source;
    $("source").hidden = false;
    $("sentences").textContent = transcript.stats.sentences.toLocaleString();
    $("characters").textContent = transcript.stats.characters.toLocaleString();
    $("speakerCount").textContent = transcript.stats.speakers;
    $("first").textContent = transcript.stats.first;
    $("last").textContent = transcript.stats.last;
    setStatus(t("success"));
    $("download").disabled = false;
    refreshPreview();
  } catch (error) {
    $("title").textContent = t("failedTitle");
    $("podcast").textContent = t("failedSubtitle");
    const message = /Cannot access|No tab|Missing host permission|tab was closed/i.test(error.message) ? t("permissionError") : error.message;
    setStatus(message, true);
  } finally {$("retry").disabled = false;}
}

function finishDownload(item) {
  const pending = pendingDownloads.get(item.id);
  if (!pending || !["complete", "interrupted"].includes(item.state)) return;
  URL.revokeObjectURL(pending.url);
  pendingDownloads.delete(item.id);
  $("downloadStatus").textContent = item.state === "complete" ? t("downloaded", {filename: pending.filename}) : t("downloadError", {error: item.error || t("canceled")});
}
chrome.downloads.onChanged.addListener(delta => {
  if (delta.state?.current) finishDownload({id: delta.id, state: delta.state.current, error: delta.error?.current});
});
$("download").addEventListener("click", async () => {
  if (!transcript) return;
  $("download").disabled = true;
  let url;
  try {
    const file = renderExport(transcript, $("format").value, settings());
    url = URL.createObjectURL(new Blob([file.text], {type: file.mime}));
    const id = await chrome.downloads.download({url, filename: file.filename, saveAs: $("saveAs").checked, conflictAction: "uniquify"});
    pendingDownloads.set(id, {url, filename: file.filename});
    $("downloadStatus").textContent = t("startedDownload");
    const [item] = await chrome.downloads.search({id});
    if (item) finishDownload(item);
  } catch (error) {
    if (url) URL.revokeObjectURL(url);
    $("downloadStatus").textContent = t("downloadError", {error: error.message});
  } finally {$("download").disabled = !transcript;}
});
$("retry").addEventListener("click", load);
$("format").addEventListener("change", formatChanged);
for (const id of ["speakers", "metadata", "sentenceLines"]) $(id).addEventListener("change", refreshPreview);
$("previewDetails").addEventListener("toggle", refreshPreview);
formatChanged();
load();
