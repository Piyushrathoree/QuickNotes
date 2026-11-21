"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { applyTheme } from "@/components/appearance";
import { Icon } from "@/components/Icon";
import { iconButtonClass } from "@/components/styles";
import { usePrefs } from "@/lib/store/prefs";
import { cn } from "@/lib/utils";

let themeTimer: number | undefined;

/**
 * Lets the surfaces fade to the new colours for 200ms. The class is added only on a user change, never on first paint,
 * and it covers colours only (see html.theme-animating in globals.css).
 */
function applyThemeWithFade(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.add("theme-animating");
  window.clearTimeout(themeTimer);
  themeTimer = window.setTimeout(() => root.classList.remove("theme-animating"), 200);
  applyTheme(theme);
}

/** Light ⇄ dark toggle icon button. Used by the mobile drawer header. The icon shows the mode in effect. */
export function ThemeButton() {
  const { prefs, updatePrefs } = usePrefs();
  const isDark = prefs.theme === "dark";
  const next = isDark ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  function toggle() {
    updatePrefs({ theme: next });
    applyThemeWithFade(next);
  }

  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={iconButtonClass}>
      <Icon icon={isDark ? Moon02Icon : Sun03Icon} />
    </button>
  );
}

/**
 * "Theme" row for the account menu: one tap flips between light and dark. The sun | moon pill on the right shows the
 * mode in effect; its thumb slides to the active side. Same prefs and applyTheme as ThemeButton.
 */
export function ThemeRow() {
  const { prefs, updatePrefs } = usePrefs();
  const isDark = prefs.theme === "dark";

  function toggle() {
    const next = isDark ? "light" : "dark";
    updatePrefs({ theme: next });
    applyThemeWithFade(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark theme"
      data-menu-item
      onClick={toggle}
      className="flex h-10 w-full items-center justify-between rounded-[10px] px-2.5 text-left text-sm text-secondary-foreground outline-none transition-colors duration-150 hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11"
    >
      <span className="flex items-center gap-2.5">
        <Icon icon={isDark ? Moon02Icon : Sun03Icon} className="text-muted-foreground" />
        Theme
      </span>
      <span aria-hidden="true" className="relative grid h-7 w-[60px] grid-cols-2 items-center rounded-full border border-border bg-sidebar">
        <span
          className={cn(
            "absolute top-0.5 bottom-0.5 left-0.5 w-[26px] rounded-full bg-pad shadow-xs transition-transform duration-150 ease-out",
            isDark && "translate-x-[28px]",
          )}
        />
        <span className={cn("relative grid place-items-center", isDark ? "text-muted-foreground" : "text-foreground")}>
          <Icon icon={Sun03Icon} className="size-4" />
        </span>
        <span className={cn("relative grid place-items-center", isDark ? "text-foreground" : "text-muted-foreground")}>
          <Icon icon={Moon02Icon} className="size-4" />
        </span>
      </span>
    </button>
  );
}
