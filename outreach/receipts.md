# Breakage receipts — evidence for "parsers break, fixes should be shared"

The strongest Show HN / forum copy includes 1–2 concrete, linkable examples of AI-platform
parsing breaking. Collect them before posting. Add real links; delete template rows.

## Template

- Platform: ChatGPT / Claude / Gemini / DeepSeek / ...
- What broke: e.g. "message DOM changed from X to Y", "new thinking/reasoning block appeared",
  "rendering moved to canvas", "internal API response shape changed".
- Where: GitHub issue / changelog / release note / store comment / forum thread (URL)
- Impact: e.g. "exporter X reported 300 open issues on parser breakage"

## Evidence to gather

| Platform   | Break claim                          | Link | Impact |
| ---------- | ------------------------------------ | ---- | ------ |
| ChatGPT    | —                                    | —    | —      |
| Claude     | artifacts/widget re-render           | —    | —      |
| Gemini     | thinking blocks / batchexecute shape | —    | —      |
| DeepSeek   | —                                    | —    | —      |
| Perplexity | —                                    | —    | —      |

## Data points that count as receipts

- Open GitHub issues titled like "parser broken, cannot export since <date>" across exporter repos
  (search `github.com "exporter" "DOM changed"`)
- Store reviews mentioning the latest update broke export
- Release-note diffs where a parser was patched right after a UI change
- The decant-core `tests/fixtures/*.html` snapshots themselves are proof the parsers target
  specific DOM shapes (point to them if a platform changes)

## After posting, update this file

Record which links worked & which threads got engagement. Aim: at least one non-Covai project
depending on decant-core within 90 days.
