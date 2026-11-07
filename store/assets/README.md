# Store artwork

All graphics are original to this project; no Spotify or Obsidian logo is used.

| File | Use |
| --- | --- |
| `icon-source.svg` | Editable geometric icon source |
| `store-icon-128.png` | 128×128 store icon, transparent padding |
| `promo-440x280.png` | Small promotional tile; original speaker-to-document illustration |
| `promo-1400x560.png` | Optional marquee; original typography and illustration |
| `screenshot-1-en-1280x800.png` | Actual English export screen |
| `screenshot-2-speakers-1280x800.png` | Actual full-preview screen with speaker turns |
| `screenshot-3-zh-1280x800.png` | Actual Chinese export screen |

The screenshots use original demonstration dialogue, clearly labeled Demo in the episode title. This is a local test fixture, not a published Spotify show. No user account, real transcript or invented usage statistic appears in the store assets.

Regenerate icons and small promo: `python scripts/make-store-art.py` (Pillow).
Regenerate screenshots and marquee: `npm run preview:store` (Playwright + Chromium).
The marquee's editable source is `store/promo.html`; it is an illustration, not an interface screenshot.
