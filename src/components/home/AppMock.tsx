import { LogoMark } from "@/components/brand/LogoMark";

/**
 * A faithful, static picture of the notepad: sidebar, ruled pad, title row and save state. It uses the app's own
 * tokens and fonts, so it follows the theme. Landing.tsx ticks one box (.am-tick) and types the last line.
 */
export function AppMock() {
  return (
    <div className="am" aria-hidden="true">
      <aside className="am-side">
        <div className="am-brand">
          <LogoMark size={22} tile="var(--logo-tile)" />
          <span>Quick Notes</span>
        </div>
        <div className="am-new">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M11.5 4.5l4 4M4 16l.8-3.6L13 4.2a1.6 1.6 0 0 1 2.3 0l.5.5a1.6 1.6 0 0 1 0 2.3L7.6 15.2 4 16z" strokeLinejoin="round" />
          </svg>
          New note
        </div>
        <p className="am-label">Recents</p>
        <ul className="am-list">
          <li className="is-active">Saturday</li>
          <li>Weekend in Lisbon</li>
          <li>Ideas from the call</li>
          <li>Books to read</li>
          <li>Guitar riffs</li>
          <li>Gift ideas</li>
        </ul>
        <div className="am-user">
          <span className="am-avatar">P</span>
          <span>
            Priya
            <small>All notes saved</small>
          </span>
        </div>
      </aside>

      <div className="am-main">
        <div className="am-pad">
          <div className="am-titlebar">
            <span className="am-title">Saturday</span>
            <span className="am-save">
              <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="10" cy="10" r="7" />
                <path d="M7 10.2l2 2 4-4.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
          </div>
          <div className="am-body">
            <p className="am-h">Errands</p>
            <p>
              <i className="am-box is-on" /> <s>pick up the dry cleaning</s>
            </p>
            <p className="am-tick">
              <i className="am-box" /> <span>tulips for mum</span>
            </p>
            <p>
              <i className="am-box" /> return the library books
            </p>
            <p className="am-h">Ideas</p>
            <p>• a podcast about old maps</p>
            <p>
              • learn the riff from <b>Slow Dancing</b>
            </p>
            <p className="am-typing">
              <span className="am-type-text">• call grandma on Sunday</span>
              <span className="am-caret" />
            </p>
          </div>
          <div className="am-foot">
            <span>0.3 KB</span>
            <span className="am-dot" />
            <span>All changes saved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
