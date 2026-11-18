/** The app mark from src/app/icon.svg: a rounded ink square with three ruled lines. Colours come from tokens, so it works in both themes. */
export function AppMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="2" y="2" width="28" height="28" rx="7" style={{ fill: "var(--text-secondary)" }} />
      <g style={{ stroke: "var(--pad)" }} strokeWidth="2" strokeLinecap="round">
        <line x1="9" y1="11" x2="23" y2="11" />
        <line x1="9" y1="16" x2="23" y2="16" />
        <line x1="9" y1="21" x2="19" y2="21" />
      </g>
    </svg>
  );
}
