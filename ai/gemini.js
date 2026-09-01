import { ChatParser } from "./base.js";
import { convertToMarkdown } from "../utils/html-to-markdown.js";

const GEMINI_RPC_ID = "hNvQHb";
const DEFAULT_BARD_PATH = "/_/BardChatUi";

function isValidMessageText(str, convoId = '') {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  if (/^(?:c_|rc_|r_)[a-zA-Z0-9_-]+$/.test(trimmed)) return false;
  if (convoId && (trimmed === convoId || trimmed === `c_${convoId}`)) return false;
  return true;
}

export class GeminiParser extends ChatParser {
  name = "Gemini";

  isAvailable(url) {
    return (
      typeof url === "string" &&
      (url.includes("gemini.google.com") || url.includes("bard.google.com"))
    );
  }

  getPlatformName() {
    return "Gemini";
  }

  getConversationId(url) {
    try {
      const targetUrl =
        url ||
        (typeof window !== "undefined" && window.location
          ? window.location.href
          : "");
      if (!targetUrl) return null;
      const parsed = new URL(
        targetUrl,
        typeof location !== "undefined"
          ? location.origin
          : "https://gemini.google.com",
      );
      const match = parsed.pathname.match(/\/(?:app|share)\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  getGlobalData() {
    try {
      // 1. Try direct window access if present
      if (
        typeof window !== "undefined" &&
        window.WIZ_global_data &&
        typeof window.WIZ_global_data === "object"
      ) {
        return window.WIZ_global_data;
      }

      // 2. Try parsing inline script tags for WIZ_global_data
      if (typeof document !== "undefined" && document.querySelectorAll) {
        const scripts = document.querySelectorAll("script");
        for (let i = 0; i < scripts.length; i++) {
          const content = scripts[i].textContent || "";
          if (content.includes("WIZ_global_data")) {
            const match = content.match(
              /window\.WIZ_global_data\s*=\s*(\{[\s\S]*?\});/,
            );
            if (match && match[1]) {
              try {
                return JSON.parse(match[1]);
              } catch {
                // Continue to next script
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[Gemini Parser] Error reading global data:", e);
    }
    return null;
  }

  async parse(options = {}) {
    console.log("[Gemini Parser] ========== STARTING PARSE() ==========");
    const currentUrl =
      typeof window !== "undefined" && window.location
        ? window.location.href || ""
        : "";

    const mode = options.parserMode || "auto";

    // 1. Prefer DOM extraction first when on a live page with conversation containers
    if (typeof document !== "undefined" && document.querySelector) {
      const hasDomMessages = document.querySelector(
        ".conversation-container, user-query, model-response, deep-research-immersive-panel",
      );
      if (hasDomMessages && mode !== "api") {
        const domResult = this.parseFromDom(currentUrl, options);
        if (domResult && domResult.messages && domResult.messages.length > 0) {
          console.log(
            `[Gemini Parser] Successfully parsed ${domResult.messages.length} messages from DOM`,
          );
          return domResult;
        }
      }
    }

    // 2. Attempt API / RPC extraction if DOM parsing didn't find messages or mode is API
    if (mode !== "dom" && typeof fetch === "function") {
      try {
        const convoId = this.getConversationId(currentUrl);
        const globalData = this.getGlobalData();

        if (convoId && globalData && globalData.SNlM0e && globalData.FdrFJe) {
          console.log(
            "[Gemini Parser] Attempting API extraction for convo:",
            convoId,
          );
          const apiResult = await this.fetchFromApi(
            convoId,
            globalData,
            currentUrl,
            options,
          );
          if (
            apiResult &&
            apiResult.messages &&
            apiResult.messages.length > 0 &&
            apiResult.messages.some((m) => isValidMessageText(m.content, convoId))
          ) {
            console.log(
              `[Gemini Parser] Successfully parsed ${apiResult.messages.length} messages via API`,
            );
            return apiResult;
          }
        }
      } catch (err) {
        console.warn(
          "[Gemini Parser] API extraction failed, falling back to DOM:",
          err,
        );
      }
    }

    // Fall back to robust DOM parsing
    return this.parseFromDom(currentUrl, options);
  }

  async fetchFromApi(convoId, globalData, currentUrl, options = {}) {
    const fSid = globalData.FdrFJe || "";
    const bl = globalData.cfb2h || "";
    const prefix = globalData.Im6cmf || DEFAULT_BARD_PATH;
    const atToken = globalData.SNlM0e || "";

    const reqId = String(Math.floor(9e6 * Math.random()) + 1e6);
    const sourcePath =
      typeof window !== "undefined" && window.location
        ? window.location.pathname
        : `/app/${convoId}`;

    const endpoint =
      `https://gemini.google.com${prefix}/data/batchexecute` +
      `?rpcids=${encodeURIComponent(GEMINI_RPC_ID)}` +
      `&source-path=${encodeURIComponent(sourcePath)}` +
      `&bl=${encodeURIComponent(bl)}` +
      `&f.sid=${encodeURIComponent(fSid)}` +
      `&hl=en` +
      `&_reqid=${encodeURIComponent(reqId)}` +
      `&rt=c`;

    const allItems = [];
    let cursor = null;
    let pageCount = 0;

    while (pageCount < 50) {
      pageCount++;
      const payloadArg = JSON.stringify([
        `c_${convoId}`,
        100,
        cursor,
        1,
        [0],
        [4],
        null,
        1,
      ]);

      const formParams = new URLSearchParams();
      formParams.append(
        "f.req",
        JSON.stringify([[[GEMINI_RPC_ID, payloadArg, null, "generic"]]]),
      );
      formParams.append("at", atToken);

      const resp = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: formParams.toString(),
      });

      if (!resp.ok) {
        throw new Error(
          `Gemini RPC request failed: ${resp.status} ${resp.statusText}`,
        );
      }

      const rawText = await resp.text();
      const parsedBatch = this.parseBatchExecuteLines(rawText);
      const rpcEntry = this.findRpcEntry(parsedBatch.arrays, GEMINI_RPC_ID);

      if (!rpcEntry || !rpcEntry[2]) {
        break;
      }

      const payload = JSON.parse(rpcEntry[2]);
      const items = Array.isArray(payload[0]) ? payload[0] : [];
      const continueCursor = payload[1] || null;

      if (items.length > 0) {
        // Items are in reverse chronological order from API
        allItems.unshift(...items.slice().reverse());
      }

      if (!continueCursor || items.length < 100) {
        break;
      }
      cursor = continueCursor;
    }

    if (allItems.length === 0) {
      return null;
    }

    const messages = this.convertApiItemsToMessages(allItems, options);
    let title = this.extractTitleFromPage();
    if (!title || title === "Gemini Conversation") {
      const firstUserMsg = messages.find((m) => m.role === "User");
      if (firstUserMsg && firstUserMsg.content) {
        title = firstUserMsg.content.slice(0, 50).split("\n")[0].trim();
      }
    }

    return {
      title: title || "Gemini Conversation",
      messages,
      url: currentUrl,
      metadata: {
        Source: "Gemini",
        Date: new Date().toLocaleString(),
        Link: currentUrl,
        Method: "API",
      },
    };
  }

  parseBatchExecuteLines(raw) {
    const cleaned = String(raw || "").replace(/^\)\]\}'\s*\n/, "");
    const lines = cleaned
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const arrays = [];
    for (const line of lines) {
      if (!/^\d+$/.test(line) && line.startsWith("[") && line.endsWith("]")) {
        try {
          arrays.push(JSON.parse(line));
        } catch {
          // Ignore non-JSON lines
        }
      }
    }
    return { arrays, rawData: cleaned };
  }

  findRpcEntry(arrays, rpcId, envelope = "wrb.fr") {
    if (!Array.isArray(arrays)) return null;
    if (arrays[0] === envelope && arrays[1] === rpcId && arrays[2]) {
      return arrays;
    }
    for (const item of arrays) {
      if (Array.isArray(item)) {
        const found = this.findRpcEntry(item, rpcId, envelope);
        if (found) return found;
      }
    }
    return null;
  }

  convertApiItemsToMessages(items, options = {}) {
    const messages = [];

    for (const item of items) {
      if (!Array.isArray(item)) continue;

      const userText = this.findUserTextInApiItem(item);
      if (userText) {
        messages.push({
          role: "User",
          content: userText.trim(),
        });
      }

      const modelText = this.findModelTextInApiItem(item, options);
      if (modelText) {
        messages.push({
          role: "Model",
          content: modelText.trim(),
        });
      }
    }

    return messages;
  }

  findUserTextInApiItem(item) {
    try {
      if (typeof item[2]?.[0] === "string") return item[2][0];
      if (typeof item[1]?.[0] === "string" && !Array.isArray(item[1][0]))
        return item[1][0];
      if (typeof item[0]?.[0] === "string") return item[0][0];
    } catch {
      // Fall through
    }
    return "";
  }

  findModelTextInApiItem(item) {
    try {
      if (Array.isArray(item[1])) {
        const candidate = item[1][0];
        if (typeof candidate === "string") return candidate;
        if (Array.isArray(candidate)) {
          if (typeof candidate[1]?.[0] === "string") return candidate[1][0];
          if (typeof candidate[0] === "string") return candidate[0];
        }
      }
    } catch {
      // Fall through
    }
    return "";
  }

  extractTitleFromPage() {
    if (typeof document !== "undefined" && document.title) {
      const cleanedDocTitle = document.title
        .replace(/Google/g, "")
        .replace(/Gemini/g, "")
        .replace(/Advanced/g, "")
        .replace(/- /g, "")
        .replace(/—/g, "")
        .trim();

      const isGeneric =
        !cleanedDocTitle ||
        cleanedDocTitle.toLowerCase() === "new chat" ||
        cleanedDocTitle.toLowerCase() === "help" ||
        cleanedDocTitle.toLowerCase() === "settings";

      if (cleanedDocTitle && !isGeneric && cleanedDocTitle.length > 2) {
        return cleanedDocTitle;
      }
    }

    if (typeof document !== "undefined" && document.querySelector) {
      const activeNav = document.querySelector(
        'a[aria-current="page"], .selected',
      );
      if (activeNav) {
        const navText = (activeNav.textContent || activeNav.innerText || "")
          .replace(/more_vert/g, "")
          .replace(/\n/g, " ")
          .trim();
        if (
          navText &&
          navText.length > 2 &&
          !navText.toLowerCase().includes("new chat")
        ) {
          return navText;
        }
      }

      const deepResearchTitle = document.querySelector(
        'h1, .title, .conversation-title, [data-testid="title"]',
      );
      if (deepResearchTitle && !this.isInsideMessage(deepResearchTitle)) {
        const text = (
          deepResearchTitle.textContent ||
          deepResearchTitle.innerText ||
          ""
        ).trim();
        if (
          text.length > 5 &&
          !text.includes("Gemini") &&
          !text.includes("Help") &&
          !text.includes("Settings")
        ) {
          return text;
        }
      }
    }

    return "Gemini Conversation";
  }

  isInsideMessage(el) {
    return !!el.closest?.(
      "user-query, model-response, .conversation-container, message-content, .query-text, .markdown",
    );
  }

  parseFromDom(currentUrl) {
    console.log("[Gemini Parser] Running DOM content extraction...");
    const title = this.extractTitleFromPage();
    const messages = [];
    const seenTexts = new Set();

    if (typeof document === "undefined" || !document.querySelectorAll) {
      return {
        title,
        messages: [],
        url: currentUrl,
        metadata: {
          Source: "Gemini",
          Date: new Date().toLocaleString(),
          Link: currentUrl,
          Method: "DOM",
        },
      };
    }

    // Strategy 1: Conversation containers or individual query/response tags
    const conversationContainers = document.querySelectorAll(
      ".conversation-container, user-query, model-response",
    );

    if (conversationContainers.length > 0) {
      const parentContainers = document.querySelectorAll(
        ".conversation-container",
      );
      const targetContainers =
        parentContainers.length > 0 ? parentContainers : [document.body];

      targetContainers.forEach((container) => {
        // 1. Extract User Queries
        const userQueries =
          container.tagName === "USER-QUERY"
            ? [container]
            : container.querySelectorAll("user-query, .user-query-container");

        userQueries.forEach((userQuery) => {
          const queryTextEl =
            userQuery.querySelector(".query-text") ||
            userQuery.querySelector("user-query-content") ||
            userQuery;

          if (queryTextEl) {
            const clone = queryTextEl.cloneNode(true);
            clone
              .querySelectorAll(
                '.cdk-visually-hidden, [class*="screen-reader"], h5.cdk-visually-hidden, user-query-file-carousel',
              )
              .forEach((el) => el.remove());

            // Extract file attachments if any
            const attachments = [];
            userQuery
              .querySelectorAll("user-query-file-preview")
              .forEach((fp) => {
                const fileName = fp.textContent?.trim();
                if (fileName) attachments.push(fileName);
              });

            // Use innerText if available, with textContent fallback so detached nodes are never blank
            let userText = (
              clone.innerText !== undefined && clone.innerText !== ""
                ? clone.innerText
                : clone.textContent || ""
            ).trim();
            // Clean out leading "You said" if still present
            userText = userText.replace(/^You said\s*/i, "").trim();

            if (attachments.length > 0) {
              userText +=
                `\n\n**Attachments:**\n` +
                attachments.map((a) => `- ${a}`).join("\n");
            }

            if (userText && !seenTexts.has(userText)) {
              seenTexts.add(userText);
              messages.push({
                role: "User",
                content: userText,
              });
            }
          }
        });

        // 2. Extract Model Responses
        const modelResponses =
          container.tagName === "MODEL-RESPONSE"
            ? [container]
            : container.querySelectorAll("model-response");

        modelResponses.forEach((modelResponse) => {
          const messageContent =
            modelResponse.querySelector("message-content") || modelResponse;
          const markdownDiv =
            messageContent.querySelector(
              ".markdown.markdown-main-panel, .markdown",
            ) || messageContent;

          if (markdownDiv) {
            const clone = markdownDiv.cloneNode(true);

            // Remove UI buttons, thought overlays, and interactive toolbars
            clone
              .querySelectorAll(
                "button, .thoughts-container, .thoughts-wrapper, model-thoughts, .table-footer, .hide-from-message-actions, message-actions, election-info-disclaimer, finance-info-disclaimer, .sources-list",
              )
              .forEach((el) => el.remove());

            // Unwrap response-element wrappers
            clone.querySelectorAll("response-element").forEach((el) => {
              while (el.firstChild) {
                el.parentNode.insertBefore(el.firstChild, el);
              }
              el.remove();
            });

            const text = convertToMarkdown(clone);
            const trimmed = text.trim();
            if (trimmed && !seenTexts.has(trimmed)) {
              seenTexts.add(trimmed);
              messages.push({
                role: "Model",
                content: trimmed,
              });
            }
          }
        });
      });
    }

    // Strategy 2: Deep Research immersive panel structure fallback
    if (messages.length === 0) {
      const deepResearchPanel = document.querySelector(
        "deep-research-immersive-panel",
      );
      if (deepResearchPanel) {
        const panelContent =
          this.extractDeepResearchPanelContent(deepResearchPanel);
        panelContent.forEach((section) => {
          if (section.content && !seenTexts.has(section.content)) {
            seenTexts.add(section.content);
            messages.push({
              role: section.role,
              content: section.content,
            });
          }
        });
      }
    }

    // Strategy 3: General content container fallback
    if (messages.length === 0) {
      const contentSelectors = [
        "main",
        "article",
        ".content",
        ".main-content",
        '[role="main"]',
        ".chat-window-content",
      ];

      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = (el.textContent || "").trim();
          if (text.length > 100) {
            const sections = this.extractDeepResearchSections(el);
            if (sections.length > 0) {
              sections.forEach((s) => {
                if (s.content && !seenTexts.has(s.content)) {
                  seenTexts.add(s.content);
                  messages.push(s);
                }
              });
              break;
            }
          }
        }
      }
    }

    console.log(
      `[Gemini Parser] Total DOM messages extracted: ${messages.length}`,
    );
    return {
      title,
      messages,
      url: currentUrl,
      metadata: {
        Source: "Gemini",
        Date: new Date().toLocaleString(),
        Link: currentUrl,
        Method: "DOM",
      },
    };
  }

  extractDeepResearchSections(contentElement) {
    const sections = [];
    const text = contentElement.innerText || contentElement.textContent || "";

    const patterns = [
      {
        promptRegex:
          /(?:Prompt|You said)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Response|I've completed|Generating|Start research)|$)/i,
        responseRegex:
          /(?:Response|I've completed|Generating|Start research)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Prompt|You said)|$)/i,
      },
      {
        promptRegex:
          /(?:Question|Q)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Answer|A|Response)|$)/i,
        responseRegex:
          /(?:Answer|A|Response)[:\s]*\n*([\s\S]*?)(?=\n\s*(?:Question|Q)|$)/i,
      },
    ];

    for (const pattern of patterns) {
      const promptMatches = text.match(pattern.promptRegex);
      const responseMatches = text.match(pattern.responseRegex);

      if (promptMatches && promptMatches[1]) {
        const promptContent = promptMatches[1].trim();
        if (promptContent.length > 20) {
          sections.push({
            role: "User",
            content: promptContent,
          });
        }
      }

      if (responseMatches && responseMatches[1]) {
        const responseContent = responseMatches[1].trim();
        if (responseContent.length > 50) {
          sections.push({
            role: "Model",
            content: responseContent,
          });
        }
      }

      if (sections.length > 0) return sections;
    }

    return sections;
  }

  extractDeepResearchPanelContent(panelElement) {
    const sections = [];
    try {
      const contentElements = panelElement.querySelectorAll(
        ".markdown, .content, .research-content, .panel-content",
      );
      contentElements.forEach((element) => {
        const text = (element.innerText || element.textContent || "").trim();
        if (text.length > 100) {
          sections.push({
            role: "Model",
            content: text,
          });
        }
      });

      if (sections.length === 0) {
        const panelText = (
          panelElement.innerText ||
          panelElement.textContent ||
          ""
        ).trim();
        if (panelText.length > 200) {
          sections.push({
            role: "Model",
            content: panelText,
          });
        }
      }
    } catch (error) {
      console.error("[Gemini Parser] Error extracting panel content:", error);
    }
    return sections;
  }
}
