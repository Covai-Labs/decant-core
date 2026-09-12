import { ChatParser } from "./base.js";
import { convertToMarkdown } from "../utils/html-to-markdown.js";

export class PerplexityParser extends ChatParser {
  name = "Perplexity";
  isAvailable(url) {
    return url.includes("perplexity.ai");
  }

  async parse() {
    const rawTitle =
      document.querySelector(".share-title-section h1")?.textContent ||
      document.querySelector("h1")?.textContent ||
      document.title ||
      "Perplexity Search";
    const title = rawTitle.trim().replace(/\s+/g, " ");

    const messages = [];

    // Perplexity Container
    const threadContainer =
      document.querySelector(".max-w-threadContentWidth") || document.body;

    // Candidates for User Messages
    const userSelectors = [
      ".group\\/user-bubble",
      "h1.group\\/query",
      ".group\\/query",
      ".whitespace-pre-line.text-pretty",
      '[data-testid="search-bar-input"]', // fallback for input? typically input is not the message display
    ];

    // Candidates for Assistant Messages
    const assistantSelectors = ['div[id^="markdown-content-"]', ".prose"];

    // Strategy: Iterate children of thread container or find all matches in document
    // Thread container is better to preserve order

    // Let's select all potential message blocks within the thread container
    const selectorString = [...userSelectors, ...assistantSelectors].join(", ");
    const elements = threadContainer.querySelectorAll(selectorString);

    // Helper to determine role
    const isUser = (el) => {
      for (const s of userSelectors) {
        if (el.matches(s)) return true;
      }
      return false;
    };

    const isAssistant = (el) => {
      for (const s of assistantSelectors) {
        if (el.matches(s)) return true;
      }
      return false;
    };

    elements.forEach((el) => {
      // Check if inside "related" or "sources"
      if (el.closest('[class*="related"], [class*="sources"]')) return;

      if (isUser(el)) {
        // Extract timestamp if present in bubble
        const timeEl = el.querySelector(
          ".text-tertiary, [class*='text-tertiary']",
        );
        const timestamp = timeEl ? timeEl.textContent.trim() : undefined;

        // Clean user text container
        const textEl = el.querySelector(".whitespace-pre-line") || el;
        const text = convertToMarkdown(textEl).trim();
        if (!text) return;

        const msgObj = { role: "User", content: text };
        if (timestamp) {
          msgObj.timestamp = timestamp;
        }
        messages.push(msgObj);
      } else if (isAssistant(el)) {
        // Avoid duplicate nested assistant containers (e.g. .prose inside div[id^="markdown-content-"])
        if (el.parentElement?.closest('div[id^="markdown-content-"], .prose')) {
          return;
        }

        const text = convertToMarkdown(el).trim();
        if (!text) return;

        messages.push({ role: "Perplexity", content: text });
      }
    });

    const currentUrl =
      typeof window !== "undefined" && window.location
        ? window.location.href || ""
        : "";
    const metadata = {
      Source: "Perplexity",
      Date: new Date().toLocaleString(),
      Link: currentUrl,
      Method: "DOM",
    };

    return { title, messages, url: currentUrl, metadata };
  }
}
