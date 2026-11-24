import Link from "next/link";

import { LogoMark } from "@/components/brand/LogoMark";
import "./site.css";

/** The header for content pages (compare, and similar). The landing page and the notepad have their own. */
export function SiteHeader() {
  return (
    <header className="sh">
      <div className="sh-inner">
        <Link href="/" className="sf-logo">
          <LogoMark size={28} tile="var(--logo-tile)" />
          <span>Quick Notes</span>
        </Link>
        <nav aria-label="Main" className="sh-nav">
          <Link href="/compare" className="sh-link sh-tiny">
            Compare
          </Link>
          <Link href="/about" className="sh-link sh-hide">
            How it works
          </Link>
          <Link href="/login" className="sh-link sh-hide">
            Sign in
          </Link>
          <Link href="/write" className="sh-cta">
            Open the notepad
          </Link>
        </nav>
      </div>
    </header>
  );
}
