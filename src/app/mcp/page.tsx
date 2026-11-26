import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

import { ClientSetupExamples } from "@/components/connect/ConnectSetup";
import { JsonLd } from "@/components/seo/JsonLd";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ReadingRail } from "@/components/ui/reading-rail";
import { mcpFaqs } from "@/lib/faq";
import { absoluteUrl, site } from "@/lib/site";
import { mcpStructuredData } from "@/lib/structuredData";
import "@/components/connect/connect.css";
import "./mcp-guide.css";

const title = "Quick Notes MCP server — Claude, Cursor and AI assistants";
const description =
  "Save, find and manage Quick Notes from Claude, Cursor and other MCP clients using a scoped personal access token.";
const endpoint = absoluteUrl("/api/mcp");

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/mcp" },
  openGraph: { title, description, url: "/mcp", type: "article" },
  twitter: { title, description },
};

const tools: [string, "Read" | "Read & write", string][] = [
  [
    "list_notes",
    "Read",
    "List notes (20 by default, max 100) with title, update time and a roughly 160-character body preview. Supports offset and optionally including deleted notes.",
  ],
  [
    "search_notes",
    "Read",
    "Search note content for a case-insensitive substring (query length 1–200) in active notes, newest first, with a snippet about 80 characters either side of the first match.",
  ],
  [
    "get_note",
    "Read",
    "Read a note by UUID, including its title, body, timestamps and deleted status.",
  ],
  [
    "create_note",
    "Read & write",
    "Create a note. If no title is supplied, use the first 60 characters of the body's first line, or Untitled note when empty.",
  ],
  [
    "update_note",
    "Read & write",
    "Replace the supplied title and/or body while keeping the other part; provide at least one of title or body.",
  ],
  [
    "append_to_note",
    "Read & write",
    "Append text using a newline by default, or choose a blank line or space as the separator.",
  ],
  [
    "delete_note",
    "Read & write",
    "Soft-delete a note so it can be restored later.",
  ],
  [
    "restore_note",
    "Read & write",
    "Restore a soft-deleted note.",
  ],
];

const contents = ([
  ["setup-heading", "Get a token"],
  ["clients-heading", "Client setup"],
  ["mcp-server-url", "Server URL", 1],
  ["tools-heading", "Available tools"],
  ["security-heading", "Access and security"],
  ["prompts-heading", "Example prompts"],
  ["faq-heading", "Questions"],
] as const).map(([id, label, depth]) => ({ id, label, depth, href: `#${id}` }));

const prompts = [
  "Save this as a note titled …",
  "Find my note about …",
  "Append this to my Groceries note.",
  "Read my note titled …",
  "Change the title of my note …",
  "Restore the note I deleted yesterday.",
];

export default function McpPage() {
  return (
    <div className="ca-shell mcp-guide">
      <JsonLd data={mcpStructuredData(mcpFaqs, description)} />
      <SiteHeader />

      <main className="page-wrap mcp-guide-main">
        <nav aria-label="Breadcrumb" className="mcp-breadcrumb">
          <Link href="/">{site.name}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">MCP setup guide</span>
        </nav>

        <header className="mcp-guide-intro">
          <h1>Connect an AI assistant to Quick Notes</h1>
          <p>Use the Quick Notes MCP server to find and manage your saved notes from Claude, Cursor, and other compatible clients.</p>
          <Link href="/connect" className="ca-button ca-primary">Connect AI <ArrowRight size={16} aria-hidden="true" /></Link>
        </header>

        <div className="mcp-guide-layout">
          <ReadingRail items={contents} offset={88} className="mcp-guide-contents" />

          <div className="mcp-guide-body">
            <section className="mcp-guide-section" aria-labelledby="setup-heading">
              <h2 id="setup-heading">Get a token</h2>
              <ol className="mcp-guide-steps">
                <li>Sign in to Quick Notes and <Link href="/connect">create a token</Link> in Connect AI.</li>
                <li>Choose read-only access to find and read notes, or read and write access to let the client make changes.</li>
                <li>Copy the token while it is visible. If you lose it, revoke it and create a new one.</li>
              </ol>
            </section>

            <section className="mcp-guide-section mcp-guide-clients" aria-labelledby="clients-heading">
              <h2 id="clients-heading">Client setup</h2>
              <p>Choose your client below. The examples use Streamable HTTP and an Authorization header.</p>
              <ClientSetupExamples url={endpoint} />
            </section>

            <section className="mcp-guide-section" aria-labelledby="tools-heading">
              <h2 id="tools-heading">Available tools</h2>
              <p>Read and write access includes all eight tools. Read-only access lets a client list, search, and read notes.</p>
              <ul aria-label="MCP tools" className="mcp-guide-tools">
                {tools.map(([name, scope, action]) => (
                  <li key={name}>
                    <div><code>{name}</code><span>{scope}</span></div>
                    <p>{action}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mcp-guide-section" aria-labelledby="security-heading">
              <h2 id="security-heading">Access and security</h2>
              <ul className="mcp-guide-points">
                <li>Each token can reach the cloud notes in the account that created it. Guest notes stay in the browser.</li>
                <li>Quick Notes shows the full token once and stores its SHA-256 hash. You can revoke access in Connect AI.</li>
                <li>Notes can contain up to 1 MiB of UTF-8 text.</li>
                <li>The rate limit is 120 requests per minute per token, tracked in memory on each running instance.</li>
                <li>Clients must support bearer tokens. OAuth sign-in is planned.</li>
              </ul>
            </section>

            <section className="mcp-guide-section" aria-labelledby="prompts-heading">
              <h2 id="prompts-heading">Example prompts</h2>
              <ul className="mcp-guide-prompts">
                {prompts.map((prompt) => <li key={prompt}>“{prompt}”</li>)}
              </ul>
            </section>

            <section className="mcp-guide-section" aria-labelledby="faq-heading">
              <h2 id="faq-heading">Frequently asked questions</h2>
              <div className="mcp-guide-faq">
                {mcpFaqs.map(({ question, answer }) => (
                  <details key={question}>
                    <summary>{question}<ChevronDown size={16} aria-hidden="true" /></summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
