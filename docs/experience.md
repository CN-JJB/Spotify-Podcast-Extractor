# Spotify 转录导出经验

## 2026-11-06：屏幕外字幕不是尚未加载的字幕

真实页面 AEE 2713 的转录已有 301 个正文节点、14,929 个正文字符，末句为 `See you next time.`。整块 `textContent` 还包括说话人、章节和提示，因此会更长。不同滚动位置下 `innerText` 只有约 2–3 千字符。

- 原因是 `content-visibility:auto`。用 `innerText` 或可见元素筛选会漏读，直接把预览文本拿来下载也会截断。
- 以 `#main-view #transcript-panel` 为读取范围，逐个读取 `[data-encore-id="text"][dir]` 的 `textContent`。全文验证要逐句比较，不能只看末句或长度。
- 当前播放器可以播放另一集；单集标题、节目名只能从 `#main-view` 取，不从底部播放器取。
- 章节与 `Speaker N` 标签使用相同的语义样式。区分后保留，未知说话人不要通过章节或上下文猜测。
- 真实页面样本及验收产物仅存本工具的 `tmp/`，不入 Git。

已验证：8 组自动检查全部通过，覆盖屏幕外文字、重复句、长正文、Unicode、五种格式、Markdown 说话人颜色、CSV 安全、异步追加、切换单集、未识别结构和真实页面逐句对照。隔离 Chromium 中五种实际下载的文件内容，与完整格式化结果逐字一致；导出页面无脚本错误。

浏览器测试用的是隔离配置和真实页面的本地快照。为在无工具栏点击的环境中注入快照，临时测试副本增加 Spotify 站点权限；交付版本仍只有 `activeTab`、`scripting`、`downloads`。测试不替代用户安装后的工具栏授权步骤。

## 2026-11-06：迁入 Chrome 工具目录

按用户要求迁入 `G:\ai_project\Chrome\spotify-transcript`。源码、安装包、已导出的文字稿及本地验收样本一同搬迁，`outputs/` 与 `tmp/` 收到工具目录内；测试路径改为相对本工具解析。扩展源码与导出文件迁移前后哈希一致。

## 2026-11-06：独立产品与开源目录

用户将产品正式命名为 Spotify-Podcast-Extractor，确认免费、中英双语，并指定 CN-JJB/Spotify-Podcast-Extractor 开源仓库。现独立根目录为 `G:\ai_project\Chrome\Spotify-Podcast-Extractor`，仓库原有 MIT 许可证与历史保留，扩展位于 `extension/`。原 `spotify-transcript` 目录不再维护源码。

1.1.0 增加双语界面与导出标题、原生图标、离线帮助、双语隐私政策、GitHub 链接及商店资料。提取算法保持原有面板核对边界，异常返回增加稳定的错误代码用于翻译。商店 ZIP 将 manifest 置于根目录，手工 ZIP 独立提供。

本地 8 组回归通过；原创演示场景的两种语言、五种英文下载、说话人预览、390px 窄屏、帮助隐私页与英文错误提示通过。商店截图来自实际扩展界面，使用原创演示内容。它们不代表新增真实节目覆盖率。
