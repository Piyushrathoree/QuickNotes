import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Online notepad",
  alternates: { canonical: "/write" },
  openGraph: { url: "/write" },
};

export default function WritePage() {
  return (
    <>
      {/* The page is the notepad itself; this heading names it for search engines and screen readers. */}
      <h1 className="sr-only">{site.title}</h1>
      <noscript>
        <div style={{ padding: "24px", fontFamily: "system-ui, sans-serif", maxWidth: 640 }}>
          <p>
            <strong>{site.name}</strong> — {site.summary}
          </p>
          <p>
            Quick Notes needs JavaScript to run the editor. <a href="/about">Read about Quick Notes and its features</a>.
          </p>
        </div>
      </noscript>
      <AppShell />
    </>
  );
}
