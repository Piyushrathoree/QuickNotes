"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";

const clients = [
  {
    id: "claudeCode", label: "Claude Code", filename: "Terminal",
    instructions: "Run this in your project folder. Open Claude Code there and type /mcp to check the connection.",
    action: "Copy command",
  },
  {
    id: "claudeDesktop", label: "Claude Desktop", filename: "claude_desktop_config.json",
    instructions: "Add the quick-notes entry to mcpServers in your Claude Desktop configuration. It uses the mcp-remote bridge. Restart the app to connect.",
    action: "Copy config",
  },
  {
    id: "cursor", label: "Cursor", filename: "mcp.json",
    instructions: "Add the quick-notes entry to mcpServers in your Cursor MCP settings.",
    action: "Copy config",
  },
  {
    id: "curl", label: "curl", filename: "Terminal",
    instructions: "Run the command to check the connection. A successful response includes Quick Notes in serverInfo.",
    action: "Copy command",
  },
] as const;

type ClientId = (typeof clients)[number]["id"];

function setupSnippet(client: ClientId, url: string, token: string): string {
  const header = `Authorization: Bearer ${token}`;

  if (client === "claudeCode") {
    return [
      "claude mcp add --transport http quick-notes",
      `  ${url}`,
      `  --header "${header}"`,
    ].join(" \\\n");
  }
  if (client === "curl") {
    const request = JSON.stringify({
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "curl", version: "1.0" } },
    });
    return [
      `curl '${url}'`,
      `  -H '${header}'`,
      "  -H 'Content-Type: application/json'",
      "  -H 'Accept: application/json, text/event-stream'",
      `  --data '${request}'`,
    ].join(" \\\n");
  }

  const config = client === "cursor"
    ? { url, headers: { Authorization: `Bearer ${token}` } }
    : {
        command: "npx",
        args: ["-y", "mcp-remote", url, "--header", "Authorization: Bearer ${QN_TOKEN}"],
        env: { QN_TOKEN: token },
      };
  return JSON.stringify({ mcpServers: { "quick-notes": config } }, null, 2);
}

function selectValue(target: HTMLElement | null): boolean {
  if (!target) return false;
  target.focus({ preventScroll: true });
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(target);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

function CopyButton({ value, label, targetRef }: {
  value: string;
  label: string;
  targetRef: RefObject<HTMLElement | null>;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "selected" | "unavailable">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  async function copy() {
    clearTimeout(resetTimer.current);
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
      resetTimer.current = setTimeout(() => setStatus("idle"), 2400);
    } catch {
      setStatus(selectValue(targetRef.current) ? "selected" : "unavailable");
    }
  }

  const message = status === "selected"
    ? "Text selected. Use your device’s copy command."
    : status === "unavailable"
      ? "Clipboard unavailable. Select and copy the text manually."
      : "";

  return (
    <div className="ca-copy-action">
      <button type="button" className="ca-button ca-quiet ca-copy-button" data-copied={status === "copied"} onClick={copy}>
        {status === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        <span className="ca-copy-label">
          <span>{label}</span>
          {status === "copied" && <span>Copied</span>}
        </span>
      </button>
      <span className="sr-only" role="status">{status === "copied" ? "Copied to clipboard." : ""}</span>
      {message && <p className="ca-copy-help" role="status">{message}</p>}
    </div>
  );
}

export function CopyField({ value, label, buttonLabel }: { value: string; label: string; buttonLabel: string }) {
  const field = useRef<HTMLDivElement>(null);
  return (
    <div className="ca-copy-field">
      <div ref={field} className="ca-copy-value" tabIndex={0} role="group" aria-label={label}>
        <code>{value}</code>
      </div>
      <CopyButton value={value} label={buttonLabel} targetRef={field} />
    </div>
  );
}

export function ConnectSetup({ url, token }: { url: string; token: string }) {
  return (
    <section id="client-setup" className="ca-section" tabIndex={-1} aria-labelledby="setup-heading">
      <div className="ca-heading-line">
        <h2 id="setup-heading">Client setup</h2>
        <Link href="/mcp" className="ca-button ca-quiet">MCP setup guide <ArrowUpRight size={14} aria-hidden="true" /></Link>
      </div>
      <ClientSetupExamples url={url} token={token} />
    </section>
  );
}

export function ClientSetupExamples({ url, token = "" }: { url: string; token?: string }) {
  const [active, setActive] = useState<ClientId>("claudeCode");
  const client = clients.find((candidate) => candidate.id === active) ?? clients[0];
  const snippet = setupSnippet(active, url, token || "YOUR_TOKEN");
  const code = useRef<HTMLPreElement>(null);

  return (
    <>
      <div className="ca-client-switch" role="group" aria-label="MCP clients">
        {clients.map(({ id, label }) => <button key={id} type="button" aria-pressed={active === id} onClick={() => setActive(id)}>{label}</button>)}
      </div>
      <div className="ca-client-instructions" aria-live="polite">
        <p>{client.instructions}</p>
        <p className="ca-credential-hint">{token
          ? <>Your new token is included.</>
          : <>Replace <code>YOUR_TOKEN</code> with a token you saved.</>}</p>
      </div>

      <div className="ca-code">
        <div className="ca-code-bar">
          <span>{client.filename}</span>
          <CopyButton key={`${active}-${token ? "ready" : "template"}`} value={snippet} label={client.action} targetRef={code} />
        </div>
        <pre ref={code} tabIndex={0} aria-label={`${client.label} setup snippet`}><code>{snippet}</code></pre>
      </div>

      <div className="ca-server">
        <h3 id="mcp-server-url" className="ca-field-label">MCP server URL</h3>
        <CopyField value={url} label="MCP server URL" buttonLabel="Copy URL" />
      </div>
    </>
  );
}
