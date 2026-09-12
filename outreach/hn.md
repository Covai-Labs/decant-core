# Show HN: decant-core — the shared extraction layer for AI chat exporters

## Title (pick ONE of these)

Preferred (ethos, not the badge):

> **Show HN: decant-core — shared AI-chat parsing so exporter fixes happen once**

Backup:

> **Show HN: Stop rewriting ChatGPT parsers — decant-core, one extraction layer for 17 AI chats + web articles**

Avoid leading with the license in the title ("AGPL" in a title invites a licensing flamewar before anyone reads the project).

## Body (draft)

Every AI chat exporter maintains its own fragile parser stack for ChatGPT, Claude, Gemini,
DeepSeek, Perplexity... and every one of those platforms re-decorates its DOM or ships a new
message type roughly monthly. When that happens, each exporter re-debugs the same broken
extraction independently. The fixes vanish into private forks.

decant-core is an attempt at shared infrastructure for that problem:

- 17 AI chat platform parsers with normalized output (messages, model, metadata, Markdown)
- Web article extraction (Mozilla Readability + Defuddle + Article-Extractor run concurrently and arbitrate by content-quality scoring)
- Detection utilities (`isAiChatUrl`, `detectPlatform`) that decide which parser to run
- LaTeX + GFM Markdown handling that survives Obsidian/Logseq round-trips
- npm package, tree-shakeable subpath imports (`decant-core/ai/chatgpt`, `decant-core/article`)

It power two shipped extensions today: AI Chat Exporter (Chrome/Firefox/Edge) and Decant (web clipper). Those are demonstrations, not the point.

Licensed AGPL-3.0. That's deliberate: if the parsers are shared commons, a platform update gets fixed once and everyone downstream inherits the fix.

[receipts to paste when people ask "why github.com/xxx": see receipts.md]

Questions I'd love feedback on:
1. Would you depend on an AGPL parser library, and under what license does your own project ship?
2. Which platform parser is most fragile for you right now — where did the last break happen?

## Haiku

Heads-up: posting before a store launch is fine — link the repos, don't run ads.