"""Original geometric artwork; Pillow is used only when regenerating assets."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
icons = root / "extension" / "icons"
assets = root / "store" / "assets"
icons.mkdir(parents=True, exist_ok=True)
assets.mkdir(parents=True, exist_ok=True)

svg = '''<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
<rect x="16" y="16" width="96" height="96" rx="24" fill="#245c43"/>
<rect x="31" y="34" width="43" height="32" rx="9" fill="#bcd3bd"/>
<path d="M39 62v12l13-12" fill="#bcd3bd"/>
<rect x="55" y="49" width="35" height="43" rx="7" fill="#fff9e8"/>
<path d="M64 60h17M64 67h10M73 74v11m-6-5 6 6 6-6" fill="none" stroke="#245c43" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''
(assets / "icon-source.svg").write_text(svg, encoding="utf-8")
scale = 4
image = Image.new("RGBA", (128 * scale, 128 * scale))
d = ImageDraw.Draw(image)
box = lambda x: tuple(int(v * scale) for v in x)
d.rounded_rectangle(box((16,16,112,112)), radius=24*scale, fill="#245c43")
d.rounded_rectangle(box((31,34,74,66)), radius=9*scale, fill="#bcd3bd")
d.polygon([box(p) for p in ((39,62),(39,74),(52,62))], fill="#bcd3bd")
d.rounded_rectangle(box((55,49,90,92)), radius=7*scale, fill="#fff9e8")
for points in [[(64,60),(81,60)],[(64,67),(74,67)],[(73,74),(73,85)],[(67,80),(73,86),(79,80)]]:
    d.line([box(p) for p in points], fill="#245c43", width=4*scale, joint="curve")
for size in (16,32,48,128):
    image.resize((size,size), Image.Resampling.LANCZOS).save(icons / f"icon{size}.png")
image.resize((128,128), Image.Resampling.LANCZOS).save(assets / "store-icon-128.png")

scale = 3
promo = Image.new("RGB", (440*scale,280*scale), "#174d38")
d = ImageDraw.Draw(promo)
d.ellipse(box((-65,-100,235,200)), fill="#225b43")
d.ellipse(box((250,110,530,390)), fill="#225b43")
d.rounded_rectangle(box((40,53,226,115)),radius=15*scale,fill="#d5e5f5")
d.rounded_rectangle(box((58,132,244,194)),radius=15*scale,fill="#d7e8d4")
for y, x in ((76,60),(93,60),(155,78),(172,78)):
    d.rounded_rectangle(box((x,y,x+115,y+5)),radius=2*scale,fill="#668076")
d.line([box((235,100)),box((267,100)),box((267,137)),box((296,137))],fill="#d6c177",width=5*scale,joint="curve")
d.polygon([box(p) for p in ((288,129),(301,137),(288,145))],fill="#d6c177")
d.rounded_rectangle(box((301,68,399,213)),radius=12*scale,fill="#c1d4bc")
d.rounded_rectangle(box((289,56,387,201)),radius=12*scale,fill="#fff9e8")
for y in (82,99,116):
    d.rounded_rectangle(box((306,y,368,y+6)),radius=3*scale,fill="#245c43")
d.line([box((338,139)),box((338,172))],fill="#245c43",width=6*scale)
d.line([box((326,160)),box((338,174)),box((350,160))],fill="#245c43",width=6*scale,joint="curve")
promo.resize((440,280),Image.Resampling.LANCZOS).save(assets / "promo-440x280.png")
print("Generated original icon sizes and 440x280 promotional image")
