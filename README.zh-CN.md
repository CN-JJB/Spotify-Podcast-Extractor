# Spotify-Podcast-Extractor

[English](README.md) · 简体中文

Chrome / Edge 本地扩展。在 Spotify 播客单集页面点击扩展，读取「转录」面板原文，唤起浏览器下载。无需账号配置、API Key 或外部转写服务。

这是同名开源项目的 Chrome 扩展产品，免费、中英双语，采用 MIT 许可。Chrome 网上应用店尚未发布；可从 [GitHub Releases](https://github.com/CN-JJB/Spotify-Podcast-Extractor/releases) 获取手工安装包。

维护目录：`G:\ai_project\Chrome\Spotify-Podcast-Extractor`。如之前从 Oracle 旧路径加载了扩展，请在扩展管理页改为加载本目录下的 `extension/`。

## 安装

1. Chrome 地址栏打开 `chrome://extensions`（Edge 为 `edge://extensions`）。
2. 打开右上角「开发者模式」，点击「加载已解压的扩展程序」。
3. 选择本目录的 **extension** 文件夹（里面直接包含 `manifest.json`）。若使用 ZIP，先解压，选择解压后含 `manifest.json` 的 `Spotify-Podcast-Extractor` 文件夹。
4. 把「Spotify-Podcast-Extractor」固定到工具栏。

## 使用

1. 打开 `https://open.spotify.com/episode/…` 单集页面。可先打开「转录」；未打开时扩展会自动选择。
2. 点击工具栏扩展图标，打开独立导出页。它不会因点击别处而消失。
3. 等待读取完成，核对句数、首句、末句；可展开「查看全部正文」。
4. 选择格式并点击下载，由 Chrome / Edge 的下载功能保存。默认弹出保存位置选择框，可以直接选 Obsidian 仓库。
5. 需要另一个格式时，可继续在同一导出页下载。下载完成前保留导出页。

| 格式 | 内容 |
| --- | --- |
| Markdown | Obsidian 属性、来源链接、章节、完整正文；每次说话人切换分成独立彩色引用块。Speaker 1 蓝色、Speaker 2 绿色。未标明身份的段落标记「未标注说话人」 |
| TXT | 纯文本原文，可选说话人、元信息及每句分段 |
| HTML | 自包含离线阅读网页，可通过浏览器打印为 PDF |
| JSON | 原始字幕条目、说话人、章节、提示、元信息、完整性核对记录 |
| CSV | 每句一行：序号、说话人、正文，UTF-8 BOM；以公式字符开头的单元格加单引号保护 |

Markdown 的说话人示例：

```markdown
> [!info] Speaker 1
>
> First speaker's original words.

> [!success] Speaker 2
>
> Second speaker's original words.
```

## 完整性处理

- 严格限定当前单集的 `#transcript-panel`；不混入推荐单集、播放器中另一个节目的标题或网站导航。
- 按字幕节点读取 `textContent`，不使用会漏掉 `content-visibility:auto` 屏幕外内容的 `innerText`、屏幕可见性筛选或截短预览。
- 保留全部字幕句子、原有重复句和原始措辞，不按文本去重，不摘要、不翻译、不润色。
- 自动检查转录开头与末尾，触发常规追加加载，并等待连续三轮内容稳定；之后恢复滚动位置。
- 页面正在加载、切换单集、回收旧字幕行或出现无法解析的结构时，停止并说明原因，不把部分字幕标成成功。
- 下载基于完整内存数据生成 Blob，由 `chrome.downloads` 保存，不经过剪贴板、地址栏或第三方服务，不设字符截断长度。
- 当前适配依据为 Spotify 2026-11-06 的网页转录结构。完成状态表示已读完并核对**当前面板中的全部字幕节点**，不是对 Spotify 原始音频、付费文本或后台未提供内容的保证。
- 本集页面没有逐句时间码。五种格式均保存原文；不伪造时间码来拼 SRT / VTT。
- 页面把章节标题替代了某些说话人标签时，保留章节，不从音频或上下文猜测人名。

## 权限与维护

只使用 `activeTab`、`scripting`、`downloads`，用户点击时才访问当前标签页；无常驻网站权限、Cookie 读取、远端脚本、统计上报或服务器依赖。

源码在 `extension/`，安装无需 npm。开发验证与打包：

```powershell
npm ci --ignore-scripts
npm test
python package.py
```

`dist/` 包含 webstore 上传包和 manual 手工安装包，`outputs/` 保存导出的文字稿，`tmp/` 保存真实页面验收样本与临时浏览器配置，均位于本工具目录内，不入 Git。

已在用户当前的 AEE 2713 单集上逐句验收：301 句、14,929 个正文字符，包含末句；8 组自动检查与五种格式的浏览器实际下载检查通过。详见 `docs/experience.md`。

额外浏览器验收可运行 `node tests/browser-smoke.mjs`，需要本机已安装 Playwright 和 Chromium、以及上述真实页面样本。若 Playwright 不在本项目依赖中，可用 `SPOTIFY_TEST_PLAYWRIGHT` 指定其 `index.mjs` 绝对路径。它仅使用隔离浏览器配置，不操作日常 Chrome 账号。

实现参考：[Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)、[Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)、[Downloads](https://developer.chrome.com/docs/extensions/reference/api/downloads)。

## 开源与发布

扩展顶部提供 GitHub 链接。问题反馈请使用 [Issues](https://github.com/CN-JJB/Spotify-Podcast-Extractor/issues)，不要提交私人转录或账号信息。

- [产品设计](store/产品设计.md)
- [商店上架操作指南](store/上架操作指南.md)
- [审核与隐私填写](store/审核与隐私填写.md)
- [隐私政策](PRIVACY.md)
- [MIT 许可](LICENSE) 与 [选型说明](docs/license-choice.md)

仓库中的代码和原创素材采用 MIT；第三方播客正文与平台商标不在许可授权范围内。
