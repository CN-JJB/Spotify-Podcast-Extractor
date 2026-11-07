const requested = new URL(location.href).searchParams.get("lang") || chrome.i18n.getUILanguage();
export const language = requested.toLowerCase().startsWith("zh") ? "zh" : "en";
const messages = {
  brand: ["Spotify-Podcast-Extractor", "Spotify-Podcast-Extractor"],
  local: ["在本机处理", "Processed on your device"],
  help: ["使用帮助", "Help"],
  privacyLink: ["隐私说明", "Privacy"],
  eyebrow: ["从聆听到笔记", "FROM LISTENING TO NOTES"],
  readingTitle: ["正在读取转录原文…", "Reading the transcript…"],
  readingSubtitle: ["读取完毕后，可以核对全文并选择下载格式。", "Review the transcript, then choose a download format."],
  loading: ["正在检查转录面板与末尾内容，请保留原标签页，提取完成前不要切换单集。", "Checking the transcript and its ending. Keep the source tab open and stay on this episode."],
  exportTitle: ["导出文件", "Export transcript"],
  format: ["文件格式", "File format"],
  mdOption: ["Markdown · Obsidian (.md)", "Markdown · Obsidian (.md)"],
  txtOption: ["纯文本 (.txt)", "Plain text (.txt)"],
  htmlOption: ["离线阅读网页 (.html)", "Offline reading page (.html)"],
  jsonOption: ["原始数据 (.json)", "Structured data (.json)"],
  csvOption: ["逐句表格 (.csv)", "Sentence table (.csv)"],
  layout: ["文字排版", "Text layout"],
  speakers: ["保留说话人", "Include speaker labels"],
  metadata: ["附标题、节目与来源链接", "Include title, podcast and source"],
  sentenceLines: ["每句单独分段", "One paragraph per sentence"],
  saveAs: ["下载时选择保存位置", "Choose where to save"],
  retry: ["重新提取", "Read transcript again"],
  download: ["下载 {{format}}", "Download {{format}}"],
  checkTitle: ["全文核对", "Review your transcript"],
  source: ["打开原单集 ↗", "Open episode ↗"],
  sentences: ["字幕句数", "Sentences"],
  characters: ["正文字符", "Text characters"],
  speakerCount: ["已标记说话人", "Labeled speakers"],
  first: ["首句", "First line"],
  last: ["末句", "Last line"],
  preview: ["查看全部正文", "Read the full transcript"],
  unknown: ["未标注说话人", "Unlabeled speaker"],
  footnote: ["保留原始措辞与重复句。核对范围为当前转录面板，不保证 Spotify 本身的转录准确性。", "Original wording and repeated lines are preserved. Checks cover the current panel, not Spotify’s transcription accuracy."],
  privacySummary: ["仅在你点击时读取本集标题、链接与转录，用于在本机生成下载文件。内容不会上传。", "Reads this episode’s title, URL and transcript only when you click, to create local downloads. Content is not uploaded."],
  timestamps: ["未提供逐句时间码的转录，不生成 SRT / VTT。", "SRT / VTT are not generated without sentence timestamps."],
  affiliation: ["独立工具，与 Spotify 或 Obsidian 无隶属或官方合作关系。", "Independent tool. Not affiliated with or endorsed by Spotify or Obsidian."],
  success: ["已读取当前面板中的全部正文，并检查末尾与加载稳定性。下载包含全部提取内容。", "All text in the current panel was read and checked for a stable ending. Downloads include the entire extracted transcript."],
  failedTitle: ["暂时无法提取转录", "The transcript could not be read"],
  failedSubtitle: ["没有生成可能缺失的文件。请按下面的提示重试。", "No potentially incomplete file was created. Follow the message below to try again."],
  permissionError: ["原标签页已关闭或访问授权已失效，请回到 Spotify 单集页面重新点击扩展图标。", "The source tab was closed or access expired. Go back to the Spotify episode and click the extension icon again."],
  startFromEpisode: ["请在 Spotify 单集页面点击浏览器工具栏中的扩展图标。", "Click this extension’s toolbar icon while viewing a Spotify episode."],
  readError: ["读取失败，请回到 Spotify 页面重新点击扩展。", "Reading failed. Return to Spotify and click the extension again."],
  startedDownload: ["已交给浏览器下载，请等待完成后关闭此导出页。", "Download started. Keep this export tab open until it finishes."],
  downloaded: ["已下载：{{filename}}", "Downloaded: {{filename}}"],
  downloadError: ["下载未完成：{{error}}。可以重新点击下载。", "Download did not finish: {{error}}. You can try again."],
  canceled: ["已取消", "Canceled"],
  hint_md: ["独立彩色引用块区分说话人：Speaker 1 蓝色、Speaker 2 绿色；附 Obsidian 属性。", "Separate colored callouts for each speaker turn: blue for Speaker 1, green for Speaker 2. Includes Obsidian properties."],
  hint_txt: ["通用纯文本，保留全部原文，适合复制或继续整理。", "Plain text with all extracted wording, ready to copy or edit."],
  hint_html: ["可离线阅读的网页；也可通过浏览器打印为 PDF。", "A self-contained reading page. Your browser can also print it to PDF."],
  hint_json: ["保留原文、说话人、段落与核对信息；不受排版选项影响。", "Keeps the source text, speakers, structure and check results. Layout options do not change this archive."],
  hint_csv: ["每句一行，含序号、说话人和正文；不受排版选项影响。", "One sentence per row, with index, speaker and text. Layout options do not change this table."],
  error_wrongPage: ["请回到 Spotify 的播客单集页面，再点击扩展图标。", "Open a Spotify podcast episode, then click the extension icon."],
  error_navigated: ["提取过程中切换了单集，请在目标单集上重新点击扩展。", "The episode changed while reading. Click the extension on your intended episode again."],
  error_loading: ["转录仍在加载，暂未生成文件。请加载完成后重试。", "The transcript is still loading. No file was created. Wait for it to finish, then try again."],
  error_noMain: ["没有找到单集内容，请等待页面加载完成。", "Episode content was not found. Wait for the page to finish loading."],
  error_noTranscript: ["没有找到「转录」标签。仅支持 Spotify 已提供转录的单集。", "No Transcript tab was found. This extension needs a transcript already provided by Spotify."],
  error_panelChanged: ["转录面板发生了切换，请重新提取。", "The transcript panel changed. Please read it again."],
  error_recycled: ["页面正在替换或回收字幕行，无法确认完整；本次未导出。请等页面稳定后重试。", "The page is replacing or recycling transcript rows. Completeness could not be confirmed, so no file was created. Wait and try again."],
  error_updated: ["转录刚刚更新，请重新提取，以免遗漏新内容。", "The transcript just updated. Read it again to include the latest text."],
  error_structure: ["Spotify 转录结构有变化，检测到无法识别的文字。本次未导出，请通过 GitHub 链接反馈。", "Spotify’s transcript structure has changed and some text could not be recognized. No file was created. Report the error through the GitHub link."],
  error_empty: ["转录面板没有可读取的字幕正文。", "There is no readable transcript text in this panel."]
};
export function t(key, values = {}) {
  const text = messages[key]?.[language === "zh" ? 0 : 1] || key;
  return text.replace(/\{\{(\w+)\}\}/g, (_, name) => String(values[name] ?? ""));
}
export function applyTranslations() {
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  for (const element of document.querySelectorAll("[data-i18n]")) element.textContent = t(element.dataset.i18n);
  document.title = t("brand");
}
