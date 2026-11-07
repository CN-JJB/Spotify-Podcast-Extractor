Free, bilingual transcript export for Spotify, with local processing and an MIT license.

- Markdown for Obsidian with clearly labeled, colored speaker callouts.
- TXT, offline HTML, JSON and CSV downloads from the same extracted transcript.
- Full available-panel text, including offscreen nodes, repeated sentences and the ending.
- English/Chinese UI, original icons, help, privacy policy and GitHub links.

**Install:** download `Spotify-Podcast-Extractor-1.1.0-manual.zip`, unzip it, open `chrome://extensions`, enable Developer mode, and Load unpacked → the folder containing `manifest.json`.

**For Chrome Web Store submission:** use `Spotify-Podcast-Extractor-1.1.0-webstore.zip`. The publishing kit contains the packages, listing copy, privacy/review guidance and promotional assets; it is not the ZIP to upload as the extension.

The Chrome Web Store listing is **not published yet**. This GitHub release is available for manual installation now. Export requires a Spotify episode with an available Transcript panel. It does not perform speech recognition or guarantee Spotify's transcript accuracy. Unsupported or unstable markup produces an error instead of a success claim.

Validation: eight local regression groups passed, including a 301-sentence real-page snapshot comparison. Five browser downloads matched the complete rendered content. Original-demo checks covered both UI languages, five English downloads, speaker preview, help/privacy pages, narrow layout and localized errors. The private live-page snapshot is not distributed.

---

免费、中英双语，本机处理，采用 MIT 许可。

普通用户下载 **manual.zip**，解压后在 Chrome 开发者模式中加载直接含 `manifest.json` 的文件夹。商店发布者使用 **webstore.zip** 上传；**publishing-kit.zip** 是含宣传图、文案和审核说明的资料包。

Chrome 网上应用店尚未发布，目前可以通过本 GitHub Release 手工安装。只支持 Spotify 已提供的单集转录，不做音频转写，不保证平台原始转录准确性。Markdown 明确区分每次说话人切换，另支持 TXT、HTML、JSON、CSV。
