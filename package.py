"""Build a root-manifest Web Store ZIP and a separate manual-install ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import hashlib

root = Path(__file__).resolve().parent
version = json.loads((root / "extension" / "manifest.json").read_text(encoding="utf-8"))["version"]
out = root / "dist"
out.mkdir(exist_ok=True)
files = [p for p in sorted((root / "extension").rglob("*")) if p.is_file()]
allowed = {".json", ".js", ".html", ".css", ".png", ".txt"}
if any(p.suffix not in allowed for p in files):
    raise SystemExit("Unexpected file type in extension directory; inspect before packaging")
manifest = json.loads((root / "extension" / "manifest.json").read_text(encoding="utf-8"))
if set(manifest["permissions"]) != {"activeTab", "scripting", "downloads"} or manifest.get("host_permissions"):
    raise SystemExit("Unexpected extension permissions; release blocked")
for locale in (root / "extension" / "_locales").glob("*/messages.json"):
    messages = json.loads(locale.read_text(encoding="utf-8"))
    assert len(messages["extensionDescription"]["message"]) <= 132
for relative in manifest["icons"].values():
    assert (root / "extension" / relative).is_file(), relative
packages = []
for mode in ("webstore", "manual"):
    target = out / f"Spotify-Podcast-Extractor-{version}-{mode}.zip"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for path in files:
            relative = path.relative_to(root / "extension")
            archive.write(path, relative if mode == "webstore" else Path("Spotify-Podcast-Extractor") / relative)
        if mode == "manual":
            archive.writestr("INSTALL.txt", """Spotify-Podcast-Extractor

1. Unzip this archive. Open chrome://extensions and enable Developer mode.
2. Choose Load unpacked, then select the Spotify-Podcast-Extractor folder containing manifest.json.
3. Open a Spotify episode with a Transcript tab, then click this extension's toolbar icon.
4. Review the text, select a format, and Download. Keep the source and export tabs open until finished.

1. 解压本文件，打开 chrome://extensions，开启开发者模式。
2. 点击“加载已解压的扩展程序”，选择里面直接包含 manifest.json 的 Spotify-Podcast-Extractor 文件夹。
3. 打开 Spotify 有“转录”标签的播客单集，点击本扩展的工具栏图标。
4. 核对原文、选择格式并下载。完成前保留原单集和导出标签页。

Free · English / 中文 · MIT
Source / Help: https://github.com/CN-JJB/Spotify-Podcast-Extractor
Support: https://github.com/CN-JJB/Spotify-Podcast-Extractor/issues
Independent project; not affiliated with Spotify or Obsidian.
""")
    with ZipFile(target) as archive:
        names = archive.namelist()
        expected = "manifest.json" if mode == "webstore" else "Spotify-Podcast-Extractor/manifest.json"
        assert expected in names
        assert not any(part in {"tmp", "outputs", "tests", "node_modules"} for name in names for part in Path(name).parts)
    print(target)
    packages.append(target)

kit = out / f"Spotify-Podcast-Extractor-{version}-publishing-kit.zip"
with ZipFile(kit, "w", ZIP_DEFLATED) as archive:
    for package in packages:
        archive.write(package, package.name)
    for file in sorted((root / "store").rglob("*")):
        if file.is_file(): archive.write(file, file.relative_to(root))
    archive.write(root / "PRIVACY.md", "PRIVACY.md")
    archive.write(root / "LICENSE", "LICENSE")
packages.append(kit)
print(kit)
(out / "SHA256SUMS.txt").write_text("".join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n" for p in packages), encoding="utf-8")
