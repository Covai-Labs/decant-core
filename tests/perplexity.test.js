import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";
import { PerplexityParser } from "../ai/perplexity.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("PerplexityParser isAvailable matches perplexity URLs", () => {
  const parser = new PerplexityParser();
  assert.equal(
    parser.isAvailable("https://www.perplexity.ai/search/123"),
    true,
  );
  assert.equal(parser.isAvailable("https://perplexity.ai/"), true);
  assert.equal(parser.isAvailable("https://claude.ai/chat/123"), false);
});

test("PerplexityParser extracts multi-turn conversation, user timestamps, and math from live fixture", async () => {
  const fixturePath = path.join(__dirname, "fixtures", "perplexity-chat.html");
  const html = fs.readFileSync(fixturePath, "utf-8");

  const dom = parseHTML(html);
  globalThis.document = dom.document;
  globalThis.window = dom.window;

  const parser = new PerplexityParser();
  const result = await parser.parse();

  assert.equal(result.metadata.Source, "Perplexity");
  assert.equal(result.metadata.Method, "DOM");
  assert.equal(result.title, "Tell me why open source software matters.");

  // Should extract both User and Perplexity messages
  const userMessages = result.messages.filter((m) => m.role === "User");
  const assistantMessages = result.messages.filter(
    (m) => m.role === "Perplexity",
  );

  assert.ok(
    userMessages.length >= 6,
    `Expected at least 6 user messages, got ${userMessages.length}`,
  );
  assert.ok(
    assistantMessages.length >= 7,
    `Expected at least 7 assistant messages, got ${assistantMessages.length}`,
  );

  // First user message verification
  const firstUser = userMessages[0];
  assert.equal(firstUser.timestamp, "11:21 AM");
  assert.ok(
    firstUser.content.includes(
      "Why does the RSS claim that they are indigenous to India",
    ),
    "Expected prompt text to match",
  );
  // Ensure buttons were not leaked into prompt text
  assert.equal(firstUser.content.includes("Edit query"), false);
  assert.equal(firstUser.content.includes("Copy query"), false);
  assert.equal(firstUser.content.endsWith("11:21 AM"), false);

  // Subsequent user messages have timestamps
  assert.equal(userMessages[1].timestamp, "11:33 AM");
  assert.equal(userMessages[2].timestamp, "11:35 AM");

  // Verify math extraction in Euler identity response
  const eulerMessage = assistantMessages.find(
    (m) =>
      m.content.includes("Euler’s identity") ||
      m.content.includes("Euler's identity"),
  );
  assert.ok(eulerMessage, "Euler response should be extracted");
  assert.ok(
    eulerMessage.content.includes("$$e^{i\\pi}+1=0.$$"),
    "Block math should be preserved",
  );
  assert.ok(
    eulerMessage.content.includes("$e$"),
    "Inline math should be preserved",
  );

  // Verify table extraction in extinction response
  const tableMessage = assistantMessages.find((m) =>
    m.content.includes("Thylacine"),
  );
  assert.ok(tableMessage, "Table response should be extracted");
  assert.ok(
    tableMessage.content.includes("| Species | Region and extinction status |"),
    "Table header preserved",
  );
});

test("PerplexityParser backward compatibility with legacy .group/query selector", async () => {
  const legacyHtml = `
    <html>
      <head><title>Legacy Perplexity</title></head>
      <body>
        <div class="max-w-threadContentWidth">
          <h1 class="group/query">What is quantum computing?</h1>
          <div class="prose">Quantum computing is a field of computer science.</div>
        </div>
      </body>
    </html>
  `;
  const dom = parseHTML(legacyHtml);
  globalThis.document = dom.document;
  globalThis.window = dom.window;

  const parser = new PerplexityParser();
  const result = await parser.parse();

  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, "User");
  assert.equal(result.messages[0].content, "What is quantum computing?");
  assert.equal(result.messages[0].timestamp, undefined);
  assert.equal(result.messages[1].role, "Perplexity");
  assert.equal(
    result.messages[1].content,
    "Quantum computing is a field of computer science.",
  );
});
