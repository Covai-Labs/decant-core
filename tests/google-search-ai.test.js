import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import {
  GoogleSearchAIParser,
  sanitizeResponseContainer,
  cleanMarkdownSpacing,
} from "../ai/google_search_ai.js";

test("GoogleSearchAIParser isAvailable matches google search URLs", () => {
  const parser = new GoogleSearchAIParser();
  assert.equal(
    parser.isAvailable("https://www.google.com/search?q=test"),
    true,
  );
  assert.equal(
    parser.isAvailable("https://www.google.co.uk/search?udm=50&q=ai"),
    true,
  );
  assert.equal(parser.isAvailable("https://chatgpt.com/"), false);
});

test("sanitizeResponseContainer strips script, style, and noscript elements", () => {
  const { document } = parseHTML(
    "<div><p>Real text content</p><script>sn._setImageSrc('img1', 'data:...');</script><style>.hidden{display:none;}</style><noscript>Enable JS</noscript></div>",
  );
  const container = document.querySelector("div");
  const clean = sanitizeResponseContainer(container);

  assert.equal(clean.querySelector("script"), null);
  assert.equal(clean.querySelector("style"), null);
  assert.equal(clean.querySelector("noscript"), null);
  assert.match(clean.textContent, /Real text content/);
  assert.doesNotMatch(clean.textContent, /sn\._setImageSrc/);
});

test("sanitizeResponseContainer removes data:image base64 images while preserving normal images", () => {
  const { document } = parseHTML(
    '<div><p>Images</p><img src="data:image/jpeg;base64,ABCDEF123456" alt="Preview"><img src="https://example.com/valid-image.png" alt="Valid Web Image"></div>',
  );
  const container = document.querySelector("div");
  const clean = sanitizeResponseContainer(container);

  const images = clean.querySelectorAll("img");
  assert.equal(images.length, 1);
  assert.equal(
    images[0].getAttribute("src"),
    "https://example.com/valid-image.png",
  );
  assert.equal(images[0].getAttribute("alt"), "Valid Web Image");
});

test("sanitizeResponseContainer preserves math LaTeX images marked with data-xpm-latex", () => {
  const { document } = parseHTML(
    '<div><img src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" data-xpm-latex="e^{i\\pi}+1=0"><img src="data:image/png;base64,ABCDEF" alt="Normal base64"></div>',
  );
  const container = document.querySelector("div");
  const clean = sanitizeResponseContainer(container);

  const images = clean.querySelectorAll("img");
  assert.equal(images.length, 1);
  assert.equal(images[0].getAttribute("data-xpm-latex"), "e^{i\\pi}+1=0");
});

test("sanitizeResponseContainer unwraps /goto and /url tracking redirects to direct target URLs", () => {
  const { document } = parseHTML(
    '<div><a href="/goto?url=https%3A%2F%2Fexample.com%2Fdocs%2Farticle">Doc Article</a><a href="/url?q=https%3A%2F%2Fwikipedia.org%2Fwiki%2FTest">Wiki Source</a><a href="https://direct.com/page">Direct Link</a></div>',
  );
  const container = document.querySelector("div");
  const clean = sanitizeResponseContainer(container);

  const links = clean.querySelectorAll("a");
  assert.equal(
    links[0].getAttribute("href"),
    "https://example.com/docs/article",
  );
  assert.equal(
    links[1].getAttribute("href"),
    "https://wikipedia.org/wiki/Test",
  );
  assert.equal(links[2].getAttribute("href"), "https://direct.com/page");
});

test("cleanMarkdownSpacing normalizes trailing spaces and collapses multi-line gaps", () => {
  const raw = "Line 1   \n\n\n\nLine 2  \n\n\nLine 3";
  const cleaned = cleanMarkdownSpacing(raw);
  assert.equal(cleaned, "Line 1\n\nLine 2\n\nLine 3");
});

test("cleanMarkdownSpacing purges leaked sn._setImageSrc and base64 image data", () => {
  const raw =
    "Some text before [](https://example.com)sn.\\_setImageSrc('img-123','data:image\\/png;base64,iVBORw0KGgoAAAANSUhEUgAA=='); some text after";
  const cleaned = cleanMarkdownSpacing(raw);
  assert.equal(
    cleaned,
    "Some text before [](https://example.com) some text after",
  );
  assert.doesNotMatch(cleaned, /_setImageSrc/);
  assert.doesNotMatch(cleaned, /data:image/);
});

test("sanitizeResponseContainer purges empty <a> tags left behind by stripped base64 images", () => {
  const { document } = parseHTML(
    '<div><a href="/goto?url=https%3A%2F%2Fexample.com"><img src="data:image/png;base64,ABCDEF"></a><a href="https://example.com/keep"><img src="https://example.com/pic.png">Valid</a></div>',
  );
  const container = document.querySelector("div");
  const clean = sanitizeResponseContainer(container);

  const links = clean.querySelectorAll("a");
  assert.equal(links.length, 1);
  assert.equal(links[0].getAttribute("href"), "https://example.com/keep");
  assert.match(links[0].textContent, /Valid/);
});

test("GoogleSearchAIParser parse() extracts and cleans AI Overview queries and responses", async () => {
  const html = [
    "<html><head><title>Quantum Computing - Google Search</title></head><body>",
    '<div class="sUKAcb"><div class="iMqumd">You said:</div>Explain quantum superposition</div>',
    '<div data-scope-id="turn">',
    '  <div data-container-id="main-col">',
    "    <p>Quantum superposition is a fundamental principle.</p>",
    "    <script>sn._setImageSrc('thumb', 'data:...');</script>",
    '    <img src="data:image/png;base64,ABCDEF123456" alt="Icon">',
    '    <p>Read more at <a href="/goto?url=https%3A%2F%2Fquantum.gov%2Foverview">Quantum.gov</a>.</p>',
    "  </div>",
    "</div>",
    "</body></html>",
  ].join("");
  const { document, window } = parseHTML(html);
  globalThis.document = document;
  globalThis.window = window;

  const parser = new GoogleSearchAIParser();
  const result = await parser.parse();

  assert.equal(result.title, "Quantum Computing - Google Search");
  assert.equal(result.messages.length, 2);
  assert.equal(result.messages[0].role, "User");
  assert.equal(result.messages[0].content, "Explain quantum superposition");
  assert.equal(result.messages[1].role, "Model");
  assert.match(
    result.messages[1].content,
    /Quantum superposition is a fundamental principle/,
  );
  assert.match(
    result.messages[1].content,
    /\[Quantum\.gov\]\(https:\/\/quantum\.gov\/overview\)/,
  );
  assert.doesNotMatch(result.messages[1].content, /sn\._setImageSrc/);
  assert.doesNotMatch(result.messages[1].content, /data:image/);
  assert.equal(result.metadata.Source, "Google Search AI");
  assert.equal(result.metadata.Method, "DOM");
});
