"use client";

import { Login03Icon, TextFontIcon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { FontPopover, fontOptions, footerRowClass } from "@/components/FontPopover";
import { Icon } from "@/components/Icon";
import { iconButtonClass } from "@/components/styles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsFor } from "@/components/userDisplay";
import { useSession } from "@/lib/auth-client";
import { usePrefs } from "@/lib/store/prefs";
import { cn } from "@/lib/utils";

interface AccountAreaProps {
  variant?: "full" | "rail";
}

/** Bottom of the sidebar: sign-in card for guests, account row for signed-in users. Renders nothing while the session loads. */
export function AccountArea({ variant = "full" }: AccountAreaProps) {
  const { data: session, isPending } = useSession();
  const { prefs } = usePrefs();
  if (isPending) return null;
  const currentFont = fontOptions.find((option) => option.value === prefs.font) ?? fontOptions[0];

  const user = session?.user ?? null;

  if (variant === "rail") {
    // Icon rail, bottom of the sidebar: account (or sign-in) first, then Font.
    return (
      <div className="flex flex-col items-center gap-1">
        {user ? (
          <FontPopover user={user} side="right" align="end">
            <button type="button" aria-label="Account" title="Account" className={cn(iconButtonClass, "p-1")}>
              <Avatar className="size-7">
                {user.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback className="bg-selected text-xs font-medium text-secondary-foreground">
                  {initialsFor(user)}
                </AvatarFallback>
              </Avatar>
            </button>
          </FontPopover>
        ) : (
          <Link href="/login" aria-label="Sign in" title="Sign in" className={iconButtonClass}>
            <Icon icon={Login03Icon} />
          </Link>
        )}
        <FontPopover user={user} side="right" align="end">
          <button type="button" aria-label="Font" title="Font" className={iconButtonClass}>
            <Icon icon={TextFontIcon} />
          </button>
        </FontPopover>
      </div>
    );
  }

  if (user) {
    return (
      <FontPopover user={user} side="top" align="start">
        <button type="button" className={cn(footerRowClass, "px-1.5")}>
          <Avatar className="size-8">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback className="bg-selected text-xs font-medium text-secondary-foreground">
              {initialsFor(user)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{user.name || "Signed in"}</span>
            {user.email && <span className="block truncate text-xs text-muted-foreground">{user.email}</span>}
          </span>
        </button>
      </FontPopover>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-2.5 rounded-[12px] border border-border bg-pad p-3">
        <p className="text-[13px] leading-5 text-secondary-foreground">Sign in to sync across devices</p>
        <Button
          asChild
          variant="outline"
          className="h-9 w-full justify-center border-foreground/25 bg-pad px-3 text-foreground shadow-xs hover:bg-hover"
        >
          <Link href="/login">
            <Icon icon={Login03Icon} />
            Sign in
          </Link>
        </Button>
      </div>
      <FontPopover user={null} side="top" align="start">
        <button type="button" className={cn(footerRowClass, "px-3")}>
          <Icon icon={TextFontIcon} className="text-muted-foreground" />
          <span className="sb-fade min-w-0 flex-1 truncate font-medium">Writing font</span>
          <span
            className="sb-fade shrink-0 truncate text-muted-foreground"
            style={{ fontFamily: currentFont.fontFamily }}
          >
            {currentFont.label}
          </span>
          <Icon icon={UnfoldMoreIcon} className="sb-fade text-muted-foreground" />
        </button>
      </FontPopover>
    </div>
  );
}
