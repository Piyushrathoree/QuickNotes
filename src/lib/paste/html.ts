import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import type { HtmlParser } from "./types";

export interface HtmlConversion {
  markdown: string;
  hasText: boolean;
}

const DROP_TAGS = new Set([
  "script", "style", "meta", "link", "iframe", "object", "form", "select", "textarea",
  "button", "option", "optgroup", "fieldset", "legend", "input", "noscript",
]);

export function parseHtmlInBrowser(html: string): Document {
  if (typeof DOMParser === "undefined") throw new Error("DOMParser is unavailable");
  return new DOMParser().parseFromString(html, "text/html");
}

export function convertHtml(html: string, plainText: string, parseHtml: HtmlParser): HtmlConversion | null {
  if (!html.trim()) return null;

  const document = parseHtml(html);
  const body = document.body;
  const isMonospaceEditor = hasMonospaceEditorWrapper(body);
  sanitizeChildren(body, document);
  makeFirstTableRowsHeaders(body, document);

  const hasText = hasUsableText(body);
  if (isMonospaceEditor && plainText.includes("\n")) {
    const code = plainText.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
    return { markdown: `\`\`\`\n${code}\n\`\`\``, hasText };
  }

  const service = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });
  service.use(gfm);
  const originalEscape = service.escape.bind(service);
  service.escape = (value: string) => originalEscape(value).replace(/\\_/g, "_");
  service.addRule("doubleStrikethrough", {
    filter: (node) => ["DEL", "S", "STRIKE"].includes(node.nodeName),
    replacement: (content) => `~~${content}~~`,
  });
  service.addRule("escapeTablePipes", {
    filter: ["th", "td"],
    replacement: (content, node) => {
      const index = Array.prototype.indexOf.call(node.parentNode?.childNodes ?? [], node);
      const prefix = index === 0 ? "| " : " ";
      const escaped = content.replace(/(?<!\\)\|/g, "\\|");
      return `${prefix}${escaped} |`;
    },
  });
  service.addRule("compactListItem", {
    filter: "li",
    replacement: (content, node, options) => {
      const parent = node.parentNode as HTMLElement | null;
      let prefix = `${options.bulletListMarker} `;
      if (parent?.nodeName === "OL") {
        const start = parent.getAttribute("start");
        const index = Array.prototype.indexOf.call(parent.children, node);
        prefix = `${start ? Number(start) + index : index + 1}. `;
      }
      const hasTrailingNewline = /\n$/.test(content);
      const trimmedContent = content.replace(/^\n+|\n+$/g, "") + (hasTrailingNewline ? "\n" : "");
      const indentedContent = trimmedContent.replace(/\n/g, `\n${" ".repeat(prefix.length)}`);
      return prefix + indentedContent + (node.nextSibling ? "\n" : "");
    },
  });
  service.addRule("pasteTaskMarker", {
    filter: (node) => node.nodeName === "SPAN" && node.hasAttribute("data-paste-task"),
    replacement: (_content, node) => `[${node.getAttribute("data-paste-task")}] `,
  });
  service.addRule("styledSpan", {
    filter: (node) => node.nodeName === "SPAN" && spanMarkdownMarkers(node).prefix.length > 0,
    replacement: (content, node) => {
      const markers = spanMarkdownMarkers(node);
      return `${markers.prefix}${content}${markers.suffix}`;
    },
  });

  const markdown = normalizeMarkdown(service.turndown(body));
  if (!markdown) return null;

  if (plainText.trim() && comparableText(markdown) === comparableText(plainText)) return null;
  return { markdown, hasText };
}

function sanitizeChildren(parent: Node, document: Document): void {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === 8) {
      parent.removeChild(child);
      continue;
    }
    if (child.nodeType === 3) {
      child.nodeValue = (child.nodeValue ?? "").replace(/\u00a0/g, " ");
      continue;
    }
    if (child.nodeType !== 1) continue;

    const element = child as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "input" && element.getAttribute("type")?.toLowerCase() === "checkbox" && element.parentElement?.tagName.toLowerCase() === "li") {
      const checked = element.hasAttribute("checked") || (element as HTMLInputElement).checked;
      const marker = document.createElement("span");
      marker.setAttribute("data-paste-task", checked ? "x" : " ");
      marker.textContent = checked ? "[x]" : "[ ]";
      element.parentNode?.insertBefore(marker, element);
      element.parentNode?.removeChild(element);
      continue;
    }
    if (DROP_TAGS.has(tag)) {
      parent.removeChild(child);
      continue;
    }
    if (tag === "o:p" || (tag === "b" && (element.getAttribute("id") ?? "").startsWith("docs-internal-guid-"))) {
      sanitizeChildren(element, document);
      unwrap(element);
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) element.removeAttribute(attribute.name);
    }
    sanitizeStyle(element);

    if (tag === "a") {
      const href = element.getAttribute("href") ?? "";
      if (isUnsafeUrl(href)) element.removeAttribute("href");
    } else if (tag === "img") {
      const src = element.getAttribute("src") ?? "";
      if (!/^https:\/\//i.test(src.trim())) {
        parent.removeChild(child);
        continue;
      }
    }

    sanitizeChildren(element, document);
  }
}

function unwrap(element: Element): void {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
}

function sanitizeStyle(element: HTMLElement): void {
  const style = element.getAttribute("style");
  if (!style) return;
  const allowed = new Map<string, string>();
  for (const declaration of style.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    const lowerValue = value.toLowerCase();
    if (property === "font-weight" && /^(?:bold|bolder|[6-9]00)$/.test(lowerValue)) {
      allowed.set(property, lowerValue);
    } else if (property === "font-style" && /^(?:italic|oblique)$/.test(lowerValue)) {
      allowed.set(property, lowerValue);
    } else if (property === "text-decoration" && /\b(?:line-through|underline)\b/.test(lowerValue)) {
      allowed.set(property, lowerValue);
    } else if (property === "font-family" && value.length <= 160 && !/[<>;]/.test(value)) {
      allowed.set(property, value);
    }
  }
  if (allowed.size) {
    element.setAttribute("style", Array.from(allowed, ([property, value]) => `${property}: ${value}`).join("; "));
  } else {
    element.removeAttribute("style");
  }
}

function hasUsableText(body: HTMLElement): boolean {
  const copy = body.cloneNode(true) as HTMLElement;
  for (const marker of Array.from(copy.querySelectorAll("[data-paste-task]"))) {
    marker.parentNode?.removeChild(marker);
  }
  return Boolean(copy.textContent?.replace(/\u00a0/g, " ").trim());
}

function isUnsafeUrl(value: string): boolean {
  const normalized = value.trim().replace(/[\u0000-\u0020]+/g, "").toLowerCase();
  return /^(?:javascript|vbscript|data):/.test(normalized);
}

function hasMonospaceEditorWrapper(body: HTMLElement): boolean {
  if (body.querySelector(".vscode-editor-data")) return true;
  if (hasMonospaceFont(body.getAttribute("style") ?? "")) return true;
  return Array.from(body.children).some((child) => hasMonospaceFont(child.getAttribute("style") ?? ""));
}

function hasMonospaceFont(style: string): boolean {
  const family = /(?:^|;)\s*font-family\s*:\s*([^;]+)/i.exec(style)?.[1] ?? "";
  return /(?:^|[\s,'"])(?:monospace|consolas|menlo|droid sans mono|courier(?: new)?)(?:$|[\s,'"])/i.test(family);
}

function spanMarkdownMarkers(node: HTMLElement): { prefix: string; suffix: string } {
  const style = node.getAttribute("style") ?? "";
  const bold = /(?:^|;)\s*font-weight\s*:\s*(?:bold|bolder|[6-9]00)(?:\s*!important)?\s*(?:;|$)/i.test(style);
  const italic = /(?:^|;)\s*font-style\s*:\s*(?:italic|oblique)(?:\s*!important)?\s*(?:;|$)/i.test(style);
  const strike = /(?:^|;)\s*text-decoration\s*:[^;]*\bline-through\b/i.test(style);
  const marks = `${strike ? "~~" : ""}${bold ? "**" : ""}${italic ? "*" : ""}`;
  return { prefix: marks, suffix: [...marks.matchAll(/~~|\*\*|\*/g)].map((match) => match[0]).reverse().join("") };
}

function makeFirstTableRowsHeaders(body: HTMLElement, document: Document): void {
  for (const table of Array.from(body.querySelectorAll("table"))) {
    const firstRow = Array.from(table.querySelectorAll("tr")).find((row) => row.closest("table") === table);
    if (!firstRow) continue;
    for (const cell of Array.from(firstRow.children)) {
      if (cell.tagName.toLowerCase() !== "td") continue;
      const header = document.createElement("th");
      for (const attribute of Array.from(cell.attributes)) header.setAttribute(attribute.name, attribute.value);
      while (cell.firstChild) header.appendChild(cell.firstChild);
      cell.parentNode?.replaceChild(header, cell);
    }
  }
}

function normalizeMarkdown(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function comparableText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
