"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface GetAppButtonProps {
  /** A signed APK on HTTPS. When set, the button downloads it directly. */
  apkUrl: string | null;
  className?: string;
  children: ReactNode;
}

/**
 * Every "Android app" button on the landing page. With an APK available it is a plain download link. Until then it
 * opens the install options in place: install the web app from the browser, or add it to the home screen.
 */
export function GetAppButton({ apkUrl, className, children }: GetAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (apkUrl) return;
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const done = () => {
      setPrompt(null);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", done);
    };
  }, [apkUrl]);

  if (apkUrl) {
    return (
      <a href={apkUrl} download className={className}>
        {children}
      </a>
    );
  }

  async function install() {
    if (!prompt) return;
    try {
      const choice = await prompt.prompt();
      if (choice.outcome === "accepted") setInstalled(true);
    } catch {
      // An expired prompt leaves the browser menu as the way to install.
    }
    setPrompt(null);
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="lx-get max-w-md gap-5 rounded-2xl border border-border bg-pad p-6 text-foreground shadow-menu">
          <DialogHeader className="gap-1.5 text-left">
            <DialogTitle className="lx-get-title">Get Quick Notes on your phone</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-secondary-foreground">
              Install it like an app. It opens full screen from your home screen, and your notes stay on the device.
            </DialogDescription>
          </DialogHeader>

          {installed ? (
            <p className="lx-get-done" role="status">
              Quick Notes is installed. Open it from your home screen.
            </p>
          ) : prompt ? (
            <button type="button" className="lx-btn lx-btn-solid lx-get-primary" onClick={install}>
              Install the app
            </button>
          ) : (
            <ol className="lx-get-steps">
              <li>
                <b>Android (Chrome):</b> open quicknotes.site, tap the <b>⋮</b> menu, then <b>Install app</b> or{" "}
                <b>Add to Home screen</b>.
              </li>
              <li>
                <b>iPhone (Safari):</b> open quicknotes.site, tap <b>Share</b>, then <b>Add to Home Screen</b>.
              </li>
            </ol>
          )}

          <div className="lx-get-apk">
            <span>
              <b>Android app (APK)</b>
              <small>In testing. The direct download arrives with the signed release.</small>
            </span>
            <span className="lx-get-badge">Soon</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
