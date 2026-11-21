"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { applyTheme } from "@/components/appearance";
import { Icon } from "@/components/Icon";
import { iconButtonClass } from "@/components/styles";
import { usePrefs } from "@/lib/store/prefs";

/** Light ⇄ dark toggle. The icon shows the mode in effect; the label names the mode a tap switches to. */
export function ThemeButton() {
  const { prefs, updatePrefs } = usePrefs();
  const isDark = prefs.theme === "dark";
  const next = isDark ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  function toggle() {
    updatePrefs({ theme: next });
    applyTheme(next);
  }

  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} className={iconButtonClass}>
      <Icon icon={isDark ? Moon02Icon : Sun03Icon} />
    </button>
  );
}
