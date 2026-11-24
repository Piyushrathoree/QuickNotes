import Link from "next/link";

import { LogoMark } from "@/components/brand/LogoMark";
import { footerComparisons } from "@/lib/compare";
import { site } from "@/lib/site";
import "./site.css";

/**
 * The footer for every public page. It carries the comparison links, so each page links to every "vs" page.
 * Server-safe: no hooks and no current date (the year comes from the site's own last-updated date).
 */
export function SiteFooter() {
  const year = site.updated.slice(0, 4);
  return (
    <footer className="sf">
      <div className="sf-inner">
        <div className="sf-top">
          <div className="sf-brand">
            <Link href="/" className="sf-logo">
              <LogoMark size={30} tile="var(--logo-tile)" />
              <span>Quick Notes</span>
            </Link>
            <p>A free notepad that opens to a blank page. Markdown formats as you type, and there’s nothing to sign up for.</p>
            <Link href="/write" className="sf-cta">
              Open the notepad
            </Link>
          </div>

          <nav aria-label="Footer" className="sf-cols">
            <section>
              <h2>Product</h2>
              <ul>
                <li>
                  <Link href="/write">Notepad</Link>
                </li>
                <li>
                  <Link href="/#android">Android app</Link>
                </li>
                <li>
                  <Link href="/mcp">Connect AI</Link>
                </li>
                <li>
                  <Link href="/login">Sign in</Link>
                </li>
              </ul>
            </section>

            <section>
              <h2>Compare</h2>
              <ul>
                {footerComparisons.map((comparison) => (
                  <li key={comparison.slug}>
                    <Link href={`/compare/${comparison.slug}`}>vs {comparison.name}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/compare" className="sf-all">
                    All comparisons
                  </Link>
                </li>
              </ul>
            </section>

            <section>
              <h2>Learn</h2>
              <ul>
                <li>
                  <Link href="/about">How it works</Link>
                </li>
                <li>
                  <Link href="/about#shortcuts">Keyboard shortcuts</Link>
                </li>
                <li>
                  <Link href="/mcp">AI access guide</Link>
                </li>
              </ul>
            </section>

            <section>
              <h2>Open source</h2>
              <ul>
                <li>
                  <a href={site.repo} rel="noopener">
                    Source code
                  </a>
                </li>
                <li>
                  <a href={`${site.repo}/issues`} rel="noopener">
                    Report an issue
                  </a>
                </li>
                <li>
                  <a href={site.license} rel="noopener">
                    MIT license
                  </a>
                </li>
              </ul>
            </section>
          </nav>
        </div>

        <div className="sf-bottom">
          <p>© {year} Quick Notes. Free and open source.</p>
          <p>
            Made by{" "}
            <a href={site.author.url} rel="noopener">
              {site.author.name}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
