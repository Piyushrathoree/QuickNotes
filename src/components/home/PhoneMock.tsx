import { LogoMark } from "@/components/brand/LogoMark";

const groceries = ["oat milk", "eggs", "basil", "lemons", "something sweet"];
const libraryNotes = ["Groceries", "Weekend in Lisbon", "Ideas from the call", "Books to read", "Guitar riffs", "Gift ideas", "Trip plan"];

/**
 * An Android phone running Quick Notes: punch-hole camera, side buttons, status bar, app bar, a ruled checklist,
 * the formatting toolbar and the gesture bar. Landing.tsx ticks the items (.lx-mtask.is-done) as the page scrolls.
 */
export function PhoneMock({ variant = "editor", className = "" }: { variant?: "editor" | "library"; className?: string }) {
  return (
    <div className={`lx-device ${className}`.trim()} aria-hidden="true">
      <span className="lx-device-key lx-device-power" />
      <span className="lx-device-key lx-device-volume" />
      <div className="lx-device-screen">
        <div className="lx-status">
          <span>9:41</span>
          <span className="lx-camera" />
          <span className="lx-status-icons">
            <svg viewBox="0 0 16 12" width="15" height="11" fill="currentColor">
              <path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V3.5H9zM13 11h2V1h-2z" />
            </svg>
            <svg viewBox="0 0 16 12" width="15" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M1.5 4.5a9.5 9.5 0 0 1 13 0M4 7a6 6 0 0 1 8 0M6.4 9.4a2.6 2.6 0 0 1 3.2 0" />
            </svg>
            <svg viewBox="0 0 24 12" width="22" height="11" fill="none">
              <rect x="0.75" y="0.75" width="19.5" height="10.5" rx="2.5" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
              <rect x="2.5" y="2.5" width="14" height="7" rx="1.3" fill="currentColor" />
              <rect x="21.4" y="4" width="1.8" height="4" rx="0.9" fill="currentColor" opacity="0.5" />
            </svg>
          </span>
        </div>

        <div className="lx-appbar">
          <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
          </svg>
          <span className="lx-appbar-brand">
            <LogoMark size={20} tile="var(--logo-tile)" />
            Quick Notes
          </span>
          <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15.5 12.3A6.2 6.2 0 0 1 7.7 4.5a6.2 6.2 0 1 0 7.8 7.8z" strokeLinejoin="round" />
          </svg>
        </div>

        {variant === "library" ? (
          <div className="lx-lib">
            <p className="lx-lib-new">
              <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M11.5 4.5l4 4M4 16l.8-3.6L13 4.2a1.6 1.6 0 0 1 2.3 0l.5.5a1.6 1.6 0 0 1 0 2.3L7.6 15.2 4 16z" strokeLinejoin="round" />
              </svg>
              New note
            </p>
            <p className="lx-lib-label">Recents</p>
            {libraryNotes.map((title, index) => (
              <p key={title} className={`lx-lib-row${index === 0 ? " is-active" : ""}`}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9m-6-6 6 6h-6V3M8 13h8m-8 4h6" />
                </svg>
                {title}
              </p>
            ))}
            <p className="lx-lib-user">
              <span className="lx-lib-avatar">P</span>
              <span>Priya<small>All notes saved</small></span>
            </p>
          </div>
        ) : (
        <div className="lx-mnote">
          <p className="lx-mnote-meta">Saved · Today, 9:38</p>
          <p className="lx-mnote-title">Groceries</p>
          {groceries.map((item) => (
            <p key={item} className="lx-mtask">
              <i className="lx-mbox" />
              <span>{item}</span>
            </p>
          ))}
          <p className="lx-mnote-line">
            for Sunday: <b>lasagne</b>
          </p>
        </div>
        )}

        {variant === "editor" && (
        <div className="lx-toolbar">
          <b>B</b>
          <i>I</i>
          <span className="lx-tool-h">H</span>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3.5" y="3.5" width="13" height="13" rx="3" />
            <path d="M7 10.2l2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 5.5h9M8 10h9M8 14.5h9" />
            <circle cx="4" cy="5.5" r="0.9" fill="currentColor" />
            <circle cx="4" cy="10" r="0.9" fill="currentColor" />
            <circle cx="4" cy="14.5" r="0.9" fill="currentColor" />
          </svg>
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 6.5L4 10l3.5 3.5M12.5 6.5L16 10l-3.5 3.5" />
          </svg>
        </div>
        )}
        <span className="lx-gesture" />
      </div>
    </div>
  );
}
