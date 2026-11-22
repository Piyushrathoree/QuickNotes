"use client";

import { useId, useState, type CSSProperties } from "react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { applyFont, applySize } from "@/components/appearance";
import { Icon } from "@/components/Icon";
import type { SegmentOption } from "@/components/SegmentedControl";
import { usePrefs } from "@/lib/store/prefs";
import type { UiPrefs } from "@/lib/types";
import { cn } from "@/lib/utils";

type Font = UiPrefs["font"];
type Size = UiPrefs["size"];

export const fontOptions: SegmentOption<Font>[] = [
  { value: "hand", label: "Hand", fontFamily: "var(--font-patrick-hand)" },
  { value: "sans", label: "Sans", fontFamily: "var(--font-plex-sans)" },
  { value: "serif", label: "Serif", fontFamily: "var(--font-plex-serif)" },
  { value: "mono", label: "Mono", fontFamily: "var(--font-plex-mono)" },
];

export const sizeOptions: SegmentOption<Size>[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "Extra large" },
];

const rowClass =
  "flex h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm text-secondary-foreground outline-none transition-colors duration-150 hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11";

interface ChoiceRowProps<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A menu row that shows the current choice. Clicking it expands an inline radio list. Choosing an option applies it
 * at once and the menu stays open. Each option is set in its own face when it has one (fonts).
 */
function ChoiceRow<T extends string>({ label, options, value, onChange }: ChoiceRowProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];

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
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span
          className="truncate text-sm text-muted-foreground"
          style={current.fontFamily ? ({ fontFamily: current.fontFamily } as CSSProperties) : undefined}
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
          <div role="radiogroup" aria-label={label} className="flex flex-col gap-0.5 pt-0.5 pb-1">
            {options.map((option) => {
              const checked = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={checked ? 0 : -1}
                  data-menu-item
                  onClick={() => onChange(option.value)}
                  style={option.fontFamily ? ({ fontFamily: option.fontFamily } as CSSProperties) : undefined}
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

/** "Writing font" row for the account menu. Same prefs and applyFont as before. */
export function WritingFontRow() {
  const { prefs, updatePrefs } = usePrefs();

  function changeFont(font: Font) {
    updatePrefs({ font });
    applyFont(font);
  }

  return <ChoiceRow label="Writing font" options={fontOptions} value={prefs.font} onChange={changeFont} />;
}

/** "Text size" row for the account menu. It scales the note text; the ruled grid stays as it is. */
export function WritingSizeRow() {
  const { prefs, updatePrefs } = usePrefs();

  function changeSize(size: Size) {
    updatePrefs({ size });
    applySize(size);
  }

  return <ChoiceRow label="Text size" options={sizeOptions} value={prefs.size} onChange={changeSize} />;
}
