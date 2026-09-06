import assert from "node:assert/strict";
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

test("Gemini data-math block preserves LaTeX macros, brackets, and single backslashes without Turndown escaping", () => {
  const el = document.createElement("div");
  el.innerHTML = `
    <div class="math-block" data-math="\\text{ATE} = \\mathbb{E}[Y \\vert \\text{do}(X=1)] - \\mathbb{E}[Y \\vert \\text{do}(X=0)]">
      <span class="katex-display"><span class="katex"><span class="katex-html">rendered html</span></span></span>
    </div>
  `;

  const md = convertToMarkdown(el);
  assert.equal(
    md,
    "$$\\text{ATE} = \\mathbb{E}[Y \\vert \\text{do}(X=1)] - \\mathbb{E}[Y \\vert \\text{do}(X=0)]$$",
  );
});

test("Inline data-math preserves Greek letters and subscripts in tables without escaping", () => {
  const el = document.createElement("div");
  el.innerHTML = `
    <table>
      <thead>
        <tr><th>Metric</th><th>Formula</th></tr>
      </thead>
      <tbody>
        <tr><td>Beta</td><td><span data-math="\\beta = \\rho \\cdot \\frac{\\sigma_a}{\\sigma_m}">formula</span></td></tr>
      </tbody>
    </table>
  `;

  const md = convertToMarkdown(el);
  assert.ok(
    md.includes("$\\beta = \\rho \\cdot \\frac{\\sigma_a}{\\sigma_m}$"),
  );
  assert.ok(!md.includes("\\\\beta"));
  assert.ok(!md.includes("\\sigma\\_a"));
});

test("KaTeX with annotation correctly extracts LaTeX as math blocks", () => {
  const el = document.createElement("div");
  el.innerHTML = `
    <span class="katex-display">
      <span class="katex">
        <annotation encoding="application/x-tex">\\int_0^1 x^2 dx = \\frac{1}{3}</annotation>
      </span>
    </span>
  `;

  const md = convertToMarkdown(el);
  assert.equal(md, "$$\\int_0^1 x^2 dx = \\frac{1}{3}$$");
});
