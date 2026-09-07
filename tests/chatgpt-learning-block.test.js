import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseHTML } from "linkedom";

// Setup global DOM for linkedom environment
const { window, document, HTMLElement, Node, DOMParser } =
  parseHTML("<div></div>");
global.window = window;
global.document = document;
global.HTMLElement = HTMLElement;
global.Node = Node;
global.DOMParser = DOMParser;

const { convertToMarkdown } = await import("../utils/html-to-markdown.js");
const { ChatGPTParser } = await import("../ai/chatgpt.js");

test("ChatGPT data-math-source extracts block display math without backslash loss", () => {
  const el = document.createElement("div");
  el.innerHTML = `
    <span role="math" aria-label="\\boxed{\\operatorname{ATE} = \\mathbb{E}[Y(1)]-\\mathbb{E}[Y(0)]}" data-math-source="\\boxed{\\operatorname{ATE} = \\mathbb{E}[Y(1)]-\\mathbb{E}[Y(0)]}" style="display: block;">
      <span class="katex-display"><span class="katex"><span class="katex-html">ATE rendered</span></span></span>
    </span>
  `;

  const md = convertToMarkdown(el);
  assert.equal(
    md,
    "$$\\boxed{\\operatorname{ATE} = \\mathbb{E}[Y(1)]-\\mathbb{E}[Y(0)]}$$",
  );
});

test("ChatGPT data-math-source extracts inline math with single dollar signs", () => {
  const el = document.createElement("div");
  el.innerHTML = `
    <p>Outcome is <span role="math" aria-label="Y(1)" data-math-source="Y(1)"><span class="katex">Y(1)</span></span> for treated.</p>
  `;

  const md = convertToMarkdown(el);
  assert.equal(md, "Outcome is $Y(1)$ for treated.");
});

test("ChatGPT interactive learning block converts cleanly without slider or control clutter", () => {
  const elementHtmlPath = path.resolve(
    "/home/anu/Workspace/Public/Add-ons/ai-chat-exporter/Scratch/chatgpt-interactive/element.html",
  );
  if (!fs.existsSync(elementHtmlPath)) {
    return;
  }

  const rawHtml = fs.readFileSync(elementHtmlPath, "utf-8");
  const { document: doc } = parseHTML(
    `<body><div class="test-container">${rawHtml}</div></body>`,
  );
  const container = doc.querySelector(".test-container");

  const parser = new ChatGPTParser();
  // Simulate message container with assistant role
  const msgContainer = doc.createElement("div");
  msgContainer.setAttribute("data-message-author-role", "assistant");
  const markdownDiv = doc.createElement("div");
  markdownDiv.className = "markdown";
  markdownDiv.appendChild(container);
  msgContainer.appendChild(markdownDiv);

  const extracted = parser.extractMessage(msgContainer);
  assert.ok(extracted, "Should extract assistant message");
  assert.equal(extracted.role, "ChatGPT");

  // Primary formula should be preserved as LaTeX block
  assert.ok(
    extracted.content.includes("$$e^{i\\pi}+1=0$$"),
    "Must preserve primary math block",
  );

  // Caption lines should be preserved
  assert.ok(
    extracted.content.includes("e^{i\\text{115}^\\circ}"),
    "Must preserve dynamic formula caption",
  );
  assert.ok(
    extracted.content.includes("\\theta=\\text{115}^\\circ"),
    "Must preserve angle caption",
  );
  assert.ok(
    extracted.content.includes(
      "The point is (cos θ, sin θ) = (-0.42, 0.91) on the unit circle.",
    ),
    "Must preserve textual explanation",
  );

  // Stray control artifacts must be stripped
  assert.ok(
    !extracted.content.includes("115.0°"),
    "Should strip slider text input",
  );
  assert.ok(
    !extracted.content.includes("Give feedback"),
    "Should strip feedback button",
  );
});
