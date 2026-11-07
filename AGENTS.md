# Spotify-Podcast-Extractor

This directory is the independent root for this product and its Git repository.

- `extension/` is the distributable Chrome product. `extractor.js` and `formats.js` are reusable ES modules; keep one implementation.
- Preserve the existing MIT license and project history.
- Keep the original transcript wording, repetitions and speaker labels. Never infer missing speaker identities or timestamps.
- Completeness means the current Spotify transcript panel, not the source audio or unavailable backend content. Fail clearly on unsupported or unstable markup.
- Keep `activeTab`, `scripting`, `downloads` as the only release permissions unless the product requirements change. No analytics, accounts, remote scripts or transcript uploads.
- `store/` contains public listing copy, original artwork and screenshots. Use original demo text, never private transcripts or account screenshots.
- `outputs/`, `tmp/`, `dist/`, `node_modules/` remain local and ignored. Do not commit live-page snapshots, browser profiles or credentials.
- Run `npm test`, `python package.py`; for UI changes also run `npm run preview:store` with Playwright installed. `tests/browser-smoke.mjs` uses the optional private local snapshot.
- Work only in this root for this product. Other Chrome products get sibling independent roots under `G:\ai_project\Chrome`.
