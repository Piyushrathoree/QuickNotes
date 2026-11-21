"use client";

import { useId, useState, type CSSProperties } from "react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { applyFont } from "@/components/appearance";
import { Icon } from "@/components/Icon";
import type { SegmentOption } from "@/components/SegmentedControl";
import { usePrefs } from "@/lib/store/prefs";
import type { UiPrefs } from "@/lib/types";
import { cn } from "@/lib/utils";

type Font = UiPrefs["font"];

export const fontOptions: SegmentOption<Font>[] = [
  { value: "hand", label: "Hand", fontFamily: "var(--font-patrick-hand)" },
  { value: "sans", label: "Sans", fontFamily: "var(--font-plex-sans)" },
  { value: "serif", label: "Serif", fontFamily: "var(--font-plex-serif)" },
  { value: "mono", label: "Mono", fontFamily: "var(--font-plex-mono)" },
];

const rowClass =
  "flex h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm text-secondary-foreground outline-none transition-colors duration-150 hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11";

/**
 * "Writing font" row for the account menu. The row shows the current font in its own face. Clicking it expands an
 * inline list (one radio row per option in fontOptions, each set in its own face). Choosing one applies it at once
 * and the menu stays open. Same prefs and applyFont as before.
 */
export function WritingFontRow() {
  const { prefs, updatePrefs } = usePrefs();
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const current = fontOptions.find((option) => option.value === prefs.font) ?? fontOptions[0];

  function changeFont(font: Font) {
    updatePrefs({ font });
    applyFont(font);
  }

  return (
    <div>
      <button
        type="button"
        data-menu-item
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={() => setExpanded((open) => !open)}
        className={rowClass}
      >
        <span className="min-w-0 flex-1 truncate">Writing font</span>
        <span
          className="truncate text-sm text-muted-foreground"
          style={{ fontFamily: current.fontFamily } as CSSProperties}
        >
          {current.label}
        </span>
        <Icon
          icon={ArrowDown01Icon}
          className={cn("text-muted-foreground transition-transform duration-160 ease-out", expanded && "rotate-180")}
        />
      </button>

      {/* Animated height: the grid row goes from 0fr to 1fr. Collapsed rows are inert, so keys and focus skip them. */}
      <div
        id={listId}
        inert={!expanded}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-160 ease-out",
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div role="radiogroup" aria-label="Writing font" className="flex flex-col gap-0.5 pt-0.5 pb-1">
            {fontOptions.map((option) => {
              const checked = option.value === prefs.font;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  data-menu-item
                  onClick={() => changeFont(option.value)}
                  style={{ fontFamily: option.fontFamily } as CSSProperties}
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 rounded-[10px] pr-2.5 pl-6 text-left text-[15px] outline-none transition-colors duration-150 hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11",
                    checked ? "text-foreground" : "text-secondary-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {checked && <Icon icon={Tick02Icon} className="text-brand" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
