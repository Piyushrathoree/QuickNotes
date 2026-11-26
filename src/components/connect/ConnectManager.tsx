"use client";

import { ArrowRight, Check, ChevronDown, KeyRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { ConnectSetup, CopyField } from "./ConnectSetup";

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getMcpUrlSnapshot() {
  return `${window.location.origin}/api/mcp`;
}

interface TokenRecord {
  id: string;
  name: string;
  prefix: string;
  scopes: ("read" | "write")[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

type TokenStatus = "Active" | "Expired" | "Revoked";

const accessOptions = [
  { value: "read", label: "Read only" },
  { value: "read-write", label: "Read & write" },
] as const;

function tokenStatus(token: TokenRecord): TokenStatus {
  if (token.revokedAt) return "Revoked";
  if (token.expiresAt && Date.parse(token.expiresAt) <= Date.now()) return "Expired";
  return "Active";
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function TokenDate({ label, value, empty }: { label: string; value: string | null; empty?: string }) {
  const date = value && new Date(value);
  const fallback = value ? "Unavailable" : empty ?? "Unavailable";
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value && date && Number.isFinite(date.getTime()) ? <time dateTime={value}>{dateFormat.format(date)}</time> : fallback}</dd>
    </div>
  );
}

export function ConnectManager({ serverUrl }: { serverUrl: string }) {
  const mcpUrl = useSyncExternalStore(subscribeToLocation, getMcpUrlSnapshot, () => serverUrl);
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [tokensError, setTokensError] = useState("");
  const [name, setName] = useState("");
  const [access, setAccess] = useState<(typeof accessOptions)[number]["value"]>("read");
  const [expiry, setExpiry] = useState("30");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [revealedToken, setRevealedToken] = useState<{ value: string; record: TokenRecord } | null>(null);
  const [pendingToken, setPendingToken] = useState<TokenRecord | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState("");
  const [tokenStatusMessage, setTokenStatusMessage] = useState("");
  const listRequest = useRef<AbortController | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const revealHeading = useRef<HTMLHeadingElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const cancelRevoke = useRef<HTMLButtonElement>(null);

  const loadTokens = useCallback(() => {
    listRequest.current?.abort();
    const controller = new AbortController();
    listRequest.current = controller;
    return fetch("/api/tokens", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as { tokens?: TokenRecord[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load your tokens.");
        if (controller.signal.aborted) return;
        setTokens(payload.tokens ?? []);
        setTokensError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setTokensError(error instanceof Error ? error.message : "Could not load your tokens.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingTokens(false);
      });
  }, []);

  useEffect(() => {
    void loadTokens();
    return () => listRequest.current?.abort();
  }, [loadTokens]);

  useEffect(() => {
    if (revealedToken) revealHeading.current?.focus();
  }, [revealedToken]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating || revealedToken) return;
    const tokenName = name.trim();
    if (!tokenName) {
      setCreateError("Enter a name for the token.");
      nameInput.current?.focus();
      return;
    }

    setCreating(true);
    setCreateError("");
    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tokenName, access, expiresInDays: expiry === "never" ? null : Number(expiry) }),
      });
      const payload = (await response.json().catch(() => ({}))) as { token?: string; record?: TokenRecord; error?: string };
      if (!response.ok || !payload.token || !payload.record) {
        if (response.status === 409) throw new Error("You have 20 active tokens. Revoke one to create another.");
        throw new Error(payload.error || "Could not create the token. Try again.");
      }
      setRevealedToken({ value: payload.token, record: payload.record });
      setName("");
      await loadTokens();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Could not create the token. Try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (revokingId) return;
    setRevokingId(id);
    setRevokeError("");
    try {
      const response = await fetch(`/api/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Could not revoke the token. Try again.");
      }
      setRevealedToken((current) => current?.record.id === id ? null : current);
      await loadTokens();
      returnFocus.current = null;
      setPendingToken(null);
      setTokenStatusMessage("Token revoked.");
    } catch (error) {
      setRevokeError(error instanceof Error ? error.message : "Could not revoke the token. Try again.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <main className="ca-width ca-page">
      <header className="ca-intro">
        <h1>Connect AI</h1>
        <p>Connect Claude, Cursor, or another MCP client to your saved notes.</p>
      </header>

      <div className="ca-workspace">
        <section className="ca-section" aria-labelledby="create-token-heading">
          <h2 id="create-token-heading">Create a token</h2>

          {revealedToken ? (
            <div className="ca-reveal">
              <div className="ca-reveal-heading">
                <Check size={17} aria-hidden="true" />
                <h3 ref={revealHeading} tabIndex={-1}>Your token is ready</h3>
              </div>
              <p>Copy it now. This is the only time you’ll see the full token.</p>
              <CopyField value={revealedToken.value} label="New personal access token" buttonLabel="Copy token" />
              <div className="ca-reveal-actions">
                <a className="ca-button ca-quiet" href="#client-setup">Continue to setup <ArrowRight size={15} aria-hidden="true" /></a>
                <button className="ca-button ca-quiet" type="button" onClick={() => {
                  setRevealedToken(null);
                  window.requestAnimationFrame(() => nameInput.current?.focus({ preventScroll: true }));
                }}>Hide token</button>
              </div>
            </div>
          ) : (
            <form className="ca-form" onSubmit={handleCreate}>
              <div className="ca-name-field">
                <label className="ca-field-label" htmlFor="token-name">Token name</label>
                <input id="token-name" ref={nameInput} name="name" type="text" required maxLength={60}
                  autoComplete="off" value={name} onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Claude on my laptop" className="ca-input" />
              </div>

              <div>
                <label className="ca-field-label" htmlFor="token-access">Access</label>
                <div className="ca-select">
                  <select id="token-access" className="ca-input" value={access} aria-describedby="token-access-help"
                    onChange={(event) => setAccess(event.target.value === "read-write" ? "read-write" : "read")}>
                    {accessOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" />
                </div>
              </div>

              <div>
                <label className="ca-field-label" htmlFor="token-expiry">Expires</label>
                <div className="ca-select">
                  <select id="token-expiry" className="ca-input" value={expiry} onChange={(event) => setExpiry(event.target.value)}>
                    <option value="30">In 30 days</option>
                    <option value="90">In 90 days</option>
                    <option value="365">In 1 year</option>
                    <option value="never">Never</option>
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </div>
              </div>

              {createError && <p className="ca-error" role="alert">{createError}</p>}
              <div className="ca-form-actions">
                <p id="token-access-help">{access === "read"
                  ? "The client can find and read saved notes."
                  : "The client can read, create, edit, and delete notes."}</p>
                <button type="submit" className="ca-button ca-primary" disabled={creating}>
                  {creating ? "Creating token…" : "Create token"}
                </button>
              </div>
            </form>
          )}
        </section>

        <ConnectSetup url={mcpUrl} token={revealedToken?.value ?? ""} />
      </div>

      <section className="ca-section ca-tokens" aria-labelledby="token-list-heading">
        <h2 ref={listHeading} id="token-list-heading" tabIndex={-1}>Your tokens</h2>
        <p className="sr-only" role="status">{tokenStatusMessage}</p>
        {loadingTokens ? (
          <div className="ca-list-state" role="status">Loading tokens…</div>
        ) : tokensError ? (
          <div className="ca-list-state ca-list-error">
            <p className="ca-error" role="alert">{tokensError}</p>
            <button type="button" className="ca-button" onClick={() => { setLoadingTokens(true); void loadTokens(); }}>Try again</button>
          </div>
        ) : tokens.length === 0 ? (
          <p className="ca-list-state">No tokens yet.</p>
        ) : (
          <ul className="ca-token-list">
            {tokens.map((token) => {
              const status = tokenStatus(token);
              return (
                <li key={token.id} className="ca-token-entry">
                  <div className="ca-token-row">
                    <div className="ca-token-identity">
                      <span className="ca-token-icon"><KeyRound size={16} aria-hidden="true" /></span>
                      <div className="ca-token-info">
                        <div className="ca-token-name">
                          <h3>{token.name}</h3>
                          <span className="ca-token-status" data-status={status}>{status}</span>
                        </div>
                        <p><code>{token.prefix}…</code><span>{token.scopes.includes("write") ? "Read & write" : "Read only"}</span></p>
                      </div>
                    </div>
                    <dl className="ca-token-dates">
                      <TokenDate label="Created" value={token.createdAt} />
                      <TokenDate label="Last used" value={token.lastUsedAt} empty="Never used" />
                      {token.revokedAt
                        ? <TokenDate label="Revoked on" value={token.revokedAt} />
                        : <TokenDate label="Expires" value={token.expiresAt} empty="No expiry" />}
                    </dl>
                    {status !== "Revoked" && (
                      <button type="button" className="ca-button ca-row-revoke" aria-label={`Revoke ${token.name}`}
                        aria-haspopup="dialog" disabled={revokingId !== null}
                        onClick={(event) => {
                          returnFocus.current = event.currentTarget;
                          setRevokeError("");
                          setTokenStatusMessage("");
                          setPendingToken(token);
                        }}>Revoke</button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={pendingToken !== null} onOpenChange={(open) => {
        if (!open && !revokingId) setPendingToken(null);
      }}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%_-_2rem)] max-w-sm grid-cols-1 rounded-2xl bg-pad text-foreground motion-reduce:animate-none sm:max-w-sm"
          aria-busy={revokingId !== null}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRevoke.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (returnFocus.current?.isConnected ? returnFocus.current : listHeading.current)?.focus({ preventScroll: true });
          }}
        >
          <DialogHeader className="text-left">
            <DialogTitle>Revoke this token?</DialogTitle>
            <DialogDescription className="leading-relaxed [overflow-wrap:anywhere]">
              Any client using <strong className="font-semibold text-foreground">“{pendingToken?.name}”</strong> will lose access immediately. You can create a new token to reconnect.
            </DialogDescription>
          </DialogHeader>
          {revokeError && <p className="ca-error" role="alert">{revokeError}</p>}
          <DialogFooter>
            <Button ref={cancelRevoke} type="button" variant="outline" className="h-11 cursor-pointer" disabled={revokingId !== null}
              onClick={() => setPendingToken(null)}>Cancel</Button>
            <Button type="button" variant="destructive" className="h-11 cursor-pointer" disabled={revokingId !== null}
              onClick={() => pendingToken && void handleRevoke(pendingToken.id)}>
              {revokingId ? "Revoking…" : "Revoke token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
