"""Generate the public Markdown policy from the extension's local HTML policy."""
from html.parser import HTMLParser
from pathlib import Path
import re

class Policy(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts = []
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "main": self.active = True
        if not self.active: return
        if tag in ("h1", "h2", "h3"):
            self.parts.append("\n\n" + "#" * (int(tag[1]) + 1) + " ")
        elif tag == "p": self.parts.append("\n\n")
        elif tag == "li": self.parts.append("\n- ")
        elif tag == "a":
            self.links.append(attrs.get("href", ""))
            self.parts.append("[")
        elif tag == "strong": self.parts.append("**")

    def handle_endtag(self, tag):
        if not self.active: return
        if tag == "main": self.active = False
        elif tag == "a": self.parts.append("](" + self.links.pop() + ") ")
        elif tag == "strong": self.parts.append("**")
        elif tag in ("ul", "ol", "section", "nav"): self.parts.append("\n\n")

    def handle_data(self, data):
        if self.active: self.parts.append(data)

root = Path(__file__).resolve().parents[1]
parser = Policy()
parser.feed((root / "extension/privacy.html").read_text(encoding="utf-8"))
body = re.sub(r"\n{3,}", "\n\n", "".join(parser.parts)).strip()
body = body.replace("[English](#english) [中文](#chinese)", "")
(root / "PRIVACY.md").write_text("# Spotify-Podcast-Extractor — Privacy\n\n" + body.strip() + "\n", encoding="utf-8")
print("Updated PRIVACY.md from extension/privacy.html")
