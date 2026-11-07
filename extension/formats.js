export const FORMATS = {
  md: {label: "Markdown · Obsidian", extension: "md", mime: "text/markdown;charset=utf-8"},
  txt: {label: "纯文本 TXT", extension: "txt", mime: "text/plain;charset=utf-8"},
  html: {label: "网页 HTML", extension: "html", mime: "text/html;charset=utf-8"},
  json: {label: "原始数据 JSON", extension: "json", mime: "application/json;charset=utf-8"},
  csv: {label: "逐句表格 CSV", extension: "csv", mime: "text/csv;charset=utf-8"}
};

export function safeFilename(title) {
  let value = [...String(title || "Spotify 转录").normalize("NFC")
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ").trim()].slice(0, 110).join("").replace(/[. ]+$/g, "");
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) value = `_${value}`;
  return value || "Spotify 转录";
}

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[char]));
const escapeMarkdown = (text) => String(text).replace(/\\/g, "\\\\").replace(/([`*_\[\]<>#|~!])/g, "\\$1")
  .replace(/^(\s*)([-+])\s/gm, "$1\\$2 ").replace(/^(\s*\d+)\./gm, "$1\\.").replace(/\n/g, "  \n");

export function paragraphs(transcript, {speakers = true, sentenceLines = false} = {}) {
  const result = [];
  let current = null;
  for (const block of transcript.blocks) {
    if (block.type === "heading") {
      current = null;
      result.push({type: "heading", text: block.text});
    } else if (block.type === "speaker") {
      current = null;
    } else if (block.type === "speech") {
      const speaker = speakers ? block.speaker : null;
      if (!current || current.speaker !== speaker || sentenceLines) {
        current = {type: "paragraph", speaker, lines: []};
        result.push(current);
      }
      current.lines.push(block.text);
    }
  }
  return result;
}

export function renderExport(transcript, format, options = {}) {
  const settings = {speakers: true, metadata: true, sentenceLines: false, language: "zh", ...options};
  const english = settings.language === "en";
  const wording = english ? {unknown: "Unlabeled speaker", source: "Open episode on Spotify", transcript: "Transcript", csv: ["Index", "Speaker", "Text"]} :
    {unknown: "未标注说话人", source: "在 Spotify 打开原单集", transcript: "转录原文", csv: ["序号", "说话人", "字幕"]};
  if (!FORMATS[format]) throw new Error("不支持的导出格式");
  if (!transcript.segments?.length) throw new Error("没有可导出的字幕");
  const blocks = paragraphs(transcript, settings);
  let text;
  if (format === "json") {
    // JSON is an unmodified, lossless archive, independent of display options.
    text = JSON.stringify(transcript, null, 2) + "\n";
  } else if (format === "csv") {
    const quote = value => {
      let text = String(value ?? "");
      if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    text = "\uFEFF" + [wording.csv, ...transcript.segments.map(row => [row.index, row.speaker, row.text])]
      .map(row => row.map(quote).join(",")).join("\r\n") + "\r\n";
  } else if (format === "txt") {
    const header = settings.metadata ? `${transcript.title}\n${transcript.podcast}\n${transcript.source}\n\n` : "";
    text = header + blocks.map(block => block.type === "heading" ? block.text :
      (block.speaker ? `${block.speaker}\n` : "") + block.lines.join(" ")).join("\n\n") + "\n";
  } else if (format === "md") {
    const yaml = value => JSON.stringify(String(value ?? ""));
    const header = settings.metadata ? ["---", `title: ${yaml(transcript.title)}`, `podcast: ${yaml(transcript.podcast)}`,
      `source: ${yaml(transcript.source)}`, `exported_at: ${yaml(transcript.exportedAt)}`, "type: podcast-transcript",
      "tags:", "  - podcast", "  - spotify", "  - transcript", "---", "", `# ${escapeMarkdown(transcript.title)}`, "",
      `[${wording.source}](${transcript.source})`, "", `## ${wording.transcript}`, ""].join("\n") : "";
    const colors = ["info", "success", "warning", "example", "abstract", "tip"];
    const named = [...new Set(transcript.segments.map(row => row.speaker).filter(Boolean))];
    text = header + blocks.map(block => {
      if (block.type === "heading") return `### ${escapeMarkdown(block.text)}`;
      const body = block.lines.map(escapeMarkdown).join(" ");
      if (!settings.speakers) return body;
      const number = block.speaker?.match(/(\d+)$/)?.[1];
      const index = number ? Number(number) - 1 : named.indexOf(block.speaker);
      const color = block.speaker ? colors[((index % colors.length) + colors.length) % colors.length] : "quote";
      return `> [!${color}] ${escapeMarkdown(block.speaker || wording.unknown)}\n>\n${body.split("\n").map(line => `> ${line}`).join("\n")}`;
    }).join("\n\n") + "\n";
  } else {
    const body = blocks.map(block => block.type === "heading" ? `<h2>${escapeHtml(block.text)}</h2>` :
      `<section>${block.speaker ? `<h3>${escapeHtml(block.speaker)}</h3>` : ""}<p>${block.lines.map(escapeHtml).join(" ")}</p></section>`).join("\n");
    const source = /^https:\/\/open\.spotify\.com\/episode\/[A-Za-z0-9]+$/.test(transcript.source) ? transcript.source : "#";
    const header = settings.metadata ? `<header><h1>${escapeHtml(transcript.title)}</h1><p>${escapeHtml(transcript.podcast)}</p><a href="${escapeHtml(source)}" rel="noreferrer">${wording.source}</a></header>` : "";
    text = `<!doctype html>\n<html lang="${english ? "en" : "zh-CN"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(transcript.title)}</title><style>body{max-width:800px;margin:48px auto;padding:0 24px;background:#faf9f6;color:#222;font:18px/1.8 system-ui,sans-serif}header{border-bottom:1px solid #ddd;padding-bottom:24px;margin-bottom:32px}h1{font-size:32px;line-height:1.3}h2{font-size:24px;margin-top:2em}h3{font-size:14px;color:#486556;margin-bottom:4px}p{margin-top:0;white-space:pre-wrap}a{color:#16724c}@media print{body{background:white;margin:0}}</style></head><body><main>${header}${body}</main></body></html>\n`;
  }
  return {text, filename: `${safeFilename(transcript.title)}.${FORMATS[format].extension}`, mime: FORMATS[format].mime};
}
