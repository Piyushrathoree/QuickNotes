"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { Logout01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons";
import { applyFont } from "@/components/appearance";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { Icon } from "@/components/Icon";
import { SegmentedControl, type SegmentOption } from "@/components/SegmentedControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { initialsFor, type UserDisplay } from "@/components/userDisplay";
import { signOut } from "@/lib/auth-client";
import { usePrefs } from "@/lib/store/prefs";
import type { UiPrefs } from "@/lib/types";

type Font = UiPrefs["font"];

/** Row used by the sidebar Font trigger, the signed-in account row and the popover's menu items: 40px, 10px radius. */
export const footerRowClass =
  "group flex h-10 w-full min-w-0 items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm text-secondary-foreground outline-none transition-colors duration-150 hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-selected data-[state=open]:text-foreground";

export const fontOptions: SegmentOption<Font>[] = [
  { value: "draw", label: "Draw", fontFamily: "var(--font-shantell)" },
  { value: "sans", label: "Sans", fontFamily: "var(--font-plex-sans)" },
  { value: "serif", label: "Serif", fontFamily: "var(--font-plex-serif)" },
];

interface FontPopoverProps {
  children: ReactElement;
  user: UserDisplay | null;
  side: "top" | "right";
  align: "start" | "end";
}

/** The writing font. Signed-in users also get their account card and sign out here. Theme lives in ThemeButton. */
export function FontPopover({ children, user, side, align }: FontPopoverProps) {
  const { prefs, updatePrefs } = usePrefs();
  const router = useRouter();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    // The store re-reads the guest notes on sign-out; leave /dashboard, which is for signed-in users only.
    router.replace("/");
    router.refresh();
  }

  function changeFont(font: Font) {
    updatePrefs({ font });
    applyFont(font);
  }

  return (
    <>
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(calc(17rem_-_1.25rem),20rem)] rounded-[12px] border border-border bg-pad p-3 text-foreground shadow-menu"
      >
        {user && (
          <>
            <div className="flex items-center gap-2.5 px-1 pb-3">
              <Avatar className="size-9">
                {user.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback className="bg-selected text-xs font-medium text-secondary-foreground">
                  {initialsFor(user)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{user.name || "Signed in"}</p>
                {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
              </div>
            </div>
            <Separator className="mb-2.5" />
          </>
        )}

        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Writing font</p>
        <SegmentedControl label="Writing font" options={fontOptions} value={prefs.font} onChange={changeFont} />

        {user && (
          <>
            <Separator className="my-2.5" />
            <button
              type="button"
              onClick={() => {
                setPopoverOpen(false);
                setPasswordOpen(true);
              }}
              className={footerRowClass}
            >
              <Icon icon={SquareLock02Icon} />
              Change password
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={footerRowClass}
            >
              <Icon icon={Logout01Icon} />
              Sign out
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
    {user?.email && <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} email={user.email} />}
    </>
  );
}
