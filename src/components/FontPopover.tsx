"use client";

import { type ReactElement, useState } from "react";
import { applyFont } from "@/components/appearance";
import { SegmentedControl, type SegmentOption } from "@/components/SegmentedControl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePrefs } from "@/lib/store/prefs";
import type { UiPrefs } from "@/lib/types";

type Font = UiPrefs["font"];

/** Row used by the sidebar footer: the Font row and the account row, and the account menu items: 40px, 10px radius. */
export const footerRowClass =
  "group flex h-10 w-full min-w-0 items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm text-secondary-foreground outline-none transition-colors duration-150 hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-selected data-[state=open]:text-foreground";

export const fontOptions: SegmentOption<Font>[] = [
  { value: "draw", label: "Draw", fontFamily: "var(--font-shantell)" },
  { value: "sans", label: "Sans", fontFamily: "var(--font-plex-sans)" },
  { value: "serif", label: "Serif", fontFamily: "var(--font-plex-serif)" },
];

interface FontPopoverProps {
  children: ReactElement;
  side: "top" | "right";
  align: "start" | "end";
}

/** The writing font picker. Opened from the sidebar's Font row (or its rail icon). Theme lives in ThemeButton. */
export function FontPopover({ children, side, align }: FontPopoverProps) {
  const { prefs, updatePrefs } = usePrefs();
  const [open, setOpen] = useState(false);

  function changeFont(font: Font) {
    updatePrefs({ font });
    applyFont(font);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(calc(17rem_-_1.25rem),20rem)] rounded-[12px] border border-border bg-pad p-3 text-foreground shadow-menu"
      >
        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Writing font</p>
        <SegmentedControl label="Writing font" options={fontOptions} value={prefs.font} onChange={changeFont} />
      </PopoverContent>
    </Popover>
  );
}
