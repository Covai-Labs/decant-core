# Subreddit outreach drafts

Post text frames the _problem_ (parser breakage), not the project. Link the repo; keep the AGPL
mention in the body as context, not a pitch.

## r/webdev

Title:

> Every AI chat exporter maintains its own ChatGPT/Claude/Gemini parser — I built a shared one

Body:

Web apps change. AI chat frontends change constantly. If you've built a scraper, exporter, or
clipper that reads ChatGPT/Claude/Gemini/DeepSeek you know the treadmill: a UI change or new
message feature breaks parsing and you have to reverse-engineer the DOM (or the React fiber) all
over again.

Instead of doing that per-project, I open-sourced the extraction layer used by two of my
extensions: decant-core (AGPL-3.0).

What's inside:

- 17 AI chat platform parsers with normalized output plus web-article extraction
- `isAiChatUrl` / `detectPlatform` detection helpers
- LaTeX and GFM Markdown handling that survives Obsidian/Logseq round-trips
- npm package, tree-shakeable subpaths

The pitch isn't "use my parser" — it's "if you have a parser for a platform I don't, contribute
it, and we all stop maintaining 40 private copies".

## r/LocalLLaMA

Title:

> Sharing the parsing layer under AI chat exporters — 17 platforms, one AGPL lib

Body:

Exported conversations from ChatGPT/Claude/Gemini/Perplexity recently? The extraction logic that
does that is the same fragile, per-project reverse-engineering work across every exporter and
archiver in the AI space — and it breaks every time an AI frontend ships a feature.

I've been extracting and packaging that logic as decant-core (AGPL-3.0): 17 platform parsers +
web article extraction + detection, distributed as an npm package. Two extensions (AI Chat
Exporter, Decant) run on it today. If you build export/archival tooling, the interesting part for
you is contributing back rather than paying the cost of a private parser every cycle.

## r/ObsidianMD

Title:

> Web clipper for Obsidian with batch tab capture → ZIP and frontmatter — Decant (AGPL-3.0)

Body:

I built Decant, an M3 web clipper that extracts pages to clean Markdown locally (Mozilla
Readability on-device, zero telemetry — nothing you clip leaves your machine). The PKM-focused
bits:

- Obsidian via `obsidian://new` with custom frontmatter, plus Logseq, Bear, NotePlan, Drafts
- Alt+Shift+A batch-clips all open tabs into one structured ZIP of Markdown
- Preview with KaTeX math and code highlighting before you save
- Export as .md / .html / .doc / .json

It's free and open source (AGPL-3.0). Same shared parsing engine as AI Chat Exporter
(decant-core). Happy to answer questions on frontmatter templates or vault workflows.

## Rules of thumb

- Post the repo/website, not an ad; reply in-thread, don't spam across subreddits same day.
- Keep AGPL as a factual line; several communities are copyleft-friendly, `r/webdev` is not always.
- Link receipts (real breakage examples) when arguing why shared parsing matters.
