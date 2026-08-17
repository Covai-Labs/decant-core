# @covai/parser-core

Shared AI chat platform parsers and detection logic for [Covai](https://github.com/Covai-Labs) browser extensions.

This package powers the AI chat extraction features in both [AI Chat Exporter](https://github.com/Covai-Labs/ai-chat-exporter) and [Decant](https://github.com/Covai-Labs/decant).

## Supported Platforms

| Platform | Parser |
|----------|--------|
| ChatGPT | `ChatGPTParser` |
| Claude | `ClaudeParser` |
| Copilot | `CopilotParser` |
| DeepSeek | `DeepSeekParser` |
| Gemini | `GeminiParser` |
| Gemini Cloud Assist | `GeminiCloudAssistParser` |
| Google AI Studio | `GoogleAIStudioParser` |
| Google Search AI | `GoogleSearchAIParser` |
| Lumo | `LumoParser` |
| Meta AI | `MetaParser` |
| Mistral | `MistralParser` |
| NotebookLM | `NotebookLMParser` |
| Perplexity | `PerplexityParser` |
| Qwen | `QwenParser` |
| Z AI | `ZAiParser` |

## Installation

```bash
npm install @covai/parser-core
```

For local development:

```bash
npm install @covai/parser-core@file:../parser-core
```

## Usage

```js
import { detectPlatform, parsers, isAiChatUrl } from '@covai/parser-core';

// Check if a URL is an AI chat platform
if (isAiChatUrl(window.location.href)) {
  const platform = detectPlatform(window.location.href);
  const ParserClass = parsers.find((p) => p.platform === platform);

  if (ParserClass) {
    const parser = new ParserClass();
    if (parser.canParse(window.location.href)) {
      const result = parser.parse();
      // result.title, result.messages, result.model, etc.
    }
  }
}
```

### Subpath imports

```js
// Individual parser
import { ChatGPTParser } from '@covai/parser-core';

// Detection helpers
import { detectPlatform, isAiChatUrl, AI_CHAT_DOMAINS } from '@covai/parser-core';

// Utilities
import { convertToMarkdown, cleanMarkdown } from '@covai/parser-core';
```

## Project Structure

```
parser-core/
  ai/                          # Parser classes
    base.js                    # Base parser class
    chatgpt.js                 # ChatGPT parser + linearize
    chatgpt_helper.js          # Injected helper for ChatGPT scroll collection
    chatgpt_scroll_collector.js # Scroll/dedup logic for ChatGPT
    claude.js                  # Claude parser (DOM + API)
    claude_react_reader.js     # Injected helper for Claude React tree
    copilot.js                 # Copilot parser (multi-domain)
    deepseek.js                # DeepSeek parser (DOM + API)
    gemini.js                  # Gemini parser
    gemini_cloud_assist.js     # Gemini Cloud Assist parser
    google_ai_studio.js        # Google AI Studio parser
    google_search_ai.js        # Google Search AI / SGE parser
    index.js                   # Barrel export
    lumo.js                    # Lumo parser
    meta.js                    # Meta AI parser
    mistral.js                 # Mistral parser
    notebooklm.js              # NotebookLM parser
    perplexity.js              # Perplexity parser
    qwen.js                    # Qwen parser
    z_ai.js                    # Z AI parser
  detection/                   # Platform detection
    detect-platform.js         # detectPlatform(), isAiChatUrl(), parsers[]
    domains.js                 # AI_CHAT_DOMAINS, URL_PATTERNS
  lib/                         # Vendored libraries
    turndown.js                # Turndown HTML→Markdown converter
  utils/                       # Utilities
    html-to-markdown.js        # AI-specific Turndown rules
```

## Development

```bash
npm install
npm run lint
npm run format:check
```

## License

[AGPL-3.0](LICENSE)
