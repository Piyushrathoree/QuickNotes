"use client";

import { useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Login03Icon, Logout01Icon, SquareLock02Icon, TextFontIcon, UnfoldMoreIcon } from "@hugeicons/core-free-icons";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { FontPopover, fontOptions, footerRowClass } from "@/components/FontPopover";
import { Icon } from "@/components/Icon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { initialsFor, type UserDisplay } from "@/components/userDisplay";
import { signOut, useSession } from "@/lib/auth-client";
import { clearCurrentUserCloudCache, countUnsavedCloudNotes } from "@/lib/store/cloudCache";
import { usePrefs } from "@/lib/store/prefs";
import { cn } from "@/lib/utils";

/** Icon-only rail button: 44px hit area, same radius and states as the sidebar's icon buttons. */
const railButtonClass =
  "grid size-11 shrink-0 place-items-center rounded-lg text-secondary-foreground outline-none transition-colors duration-150 hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-selected data-[state=open]:text-foreground";

/** The Font row. Same look for guests and signed-in users: icon, label, current font in its own face, chevron. */
function WritingFontRow() {
  const { prefs } = usePrefs();
  const currentFont = fontOptions.find((option) => option.value === prefs.font) ?? fontOptions[0];
  return (
    <FontPopover side="top" align="start">
      <button type="button" className={cn(footerRowClass, "px-3")}>
        <Icon icon={TextFontIcon} className="text-muted-foreground" />
        <span className="sb-fade min-w-0 flex-1 truncate font-medium">Writing font</span>
        <span className="sb-fade shrink-0 truncate text-muted-foreground" style={{ fontFamily: currentFont.fontFamily }}>
          {currentFont.label}
        </span>
        <Icon icon={UnfoldMoreIcon} className="sb-fade text-muted-foreground" />
      </button>
    </FontPopover>
  );
}

function pluralNotes(count: number): string {
  return count === 1 ? "1 note only exists" : `${count} notes only exist`;
}

interface AccountMenuProps {
  user: UserDisplay;
  side: "top" | "right";
  align: "start" | "end";
  children: ReactElement;
}

/** Account popover: user header, Change password and Sign out. Dialogs sit outside the popover so they outlive it. */
function AccountMenu({ user, side, align, children }: AccountMenuProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unsavedCount, setUnsavedCount] = useState(0);
  const cancelRef = useRef<HTMLButtonElement>(null);

  async function performSignOut() {
    await signOut();
    clearCurrentUserCloudCache();
    // The store re-reads the guest notes on sign-out; leave /dashboard, which is for signed-in users only.
    router.replace("/");
    router.refresh();
  }

  function requestSignOut() {
    setMenuOpen(false);
    const count = countUnsavedCloudNotes();
    if (count > 0) {
      setUnsavedCount(count);
      setConfirmOpen(true);
      return;
    }
    void performSignOut();
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={12}
          className="w-[min(calc(17rem_-_1.25rem),20rem)] rounded-[12px] border border-border bg-pad p-3 text-foreground shadow-menu"
        >
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
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setPasswordOpen(true);
            }}
            className={footerRowClass}
          >
            <Icon icon={SquareLock02Icon} />
            Change password
          </button>
          <button type="button" onClick={requestSignOut} className={footerRowClass}>
            <Icon icon={Logout01Icon} />
            Sign out
          </button>
        </PopoverContent>
      </Popover>

      {user.email && <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} email={user.email} />}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            // Cancel is the safe choice, so it takes focus.
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Sign out with unsaved notes?</DialogTitle>
            <DialogDescription>
              {`${pluralNotes(unsavedCount)} on this device and will be lost if you sign out. Save them first, or sign out anyway.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button ref={cancelRef} variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                void performSignOut();
              }}
              className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
            >
              Sign out anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AccountAreaProps {
  variant?: "full" | "rail";
}

/**
 * Bottom of the sidebar. Guests: sign-in card above the Font row. Signed in: Font row, hairline, account row.
 * Collapsed rail: Font icon above the account (or sign-in) icon. Renders nothing while the session loads.
 */
export function AccountArea({ variant = "full" }: AccountAreaProps) {
  const { data: session, isPending } = useSession();
  if (isPending) return null;

  const user = session?.user ?? null;

  if (variant === "rail") {
    return (
      <div className="-mx-1 flex flex-col items-center gap-1">
        <FontPopover side="right" align="end">
          <button type="button" aria-label="Writing font" title="Writing font" className={railButtonClass}>
            <Icon icon={TextFontIcon} />
          </button>
        </FontPopover>
        {user ? (
          <AccountMenu user={user} side="right" align="end">
            <button type="button" aria-label="Account" title="Account" className={railButtonClass}>
              <Avatar className="size-8">
                {user.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback className="bg-selected text-xs font-medium text-secondary-foreground">
                  {initialsFor(user)}
                </AvatarFallback>
              </Avatar>
            </button>
          </AccountMenu>
        ) : (
          <Link href="/login" aria-label="Sign in" title="Sign in" className={railButtonClass}>
            <Icon icon={Login03Icon} />
          </Link>
        )}
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex flex-col gap-1">
        <WritingFontRow />
        <div role="separator" className="mx-1 my-1.5 h-px bg-border" />
        <AccountMenu user={user} side="top" align="start">
          <button type="button" className={cn(footerRowClass, "h-12 px-1.5")}>
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
        </AccountMenu>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 px-1">
        <p className="text-[13px] leading-5 text-secondary-foreground">
          Sign in to save your notes to the cloud and open them on any device
        </p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 w-full justify-center border-foreground/25 bg-pad px-3 text-foreground shadow-xs hover:bg-hover"
        >
          <Link href="/login">
            <Icon icon={Login03Icon} />
            Sign in
          </Link>
        </Button>
      </div>
      <WritingFontRow />
    </div>
  );
}
