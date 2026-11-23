import { fetch } from 'expo/fetch';
import { getPreference, setPreference } from './storage';
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

function readApiOrigin(value: string | undefined): string {
  if (!value) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol === 'https:' && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash) {
      return url.origin;
    }
  } catch {
    // Guest mode remains available when the build has no account service configured.
  }
  return '';
}

export const apiOrigin = readApiOrigin(process.env.EXPO_PUBLIC_API_ORIGIN);
const requestTimeoutMs = 12_000;

async function fetchWithTimeout(input: string | URL | Request, init?: RequestInit) {
  const timeout = new AbortController();
  const callerSignal = init?.signal;
  const abortFromCaller = () => timeout.abort();
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timer = setTimeout(() => timeout.abort(), requestTimeoutMs);
  try {
    return await fetch(input, { ...init, redirect: 'error', signal: timeout.signal }) as unknown as Response;
  } catch (error) {
    if (timeout.signal.aborted && !callerSignal?.aborted) throw new Error('The network request timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
export const authClient = createAuthClient({
  baseURL: `${apiOrigin || 'https://quicknotes-staging.invalid'}/api/auth`,
  fetchOptions: {
    customFetchImpl: (input, init) => {
      if (!apiOrigin) throw new Error('This build has no account service configured.');
      return fetchWithTimeout(input, init);
    },
  },
  plugins: [expoClient({ scheme: 'quicknotes-staging', storagePrefix: 'quicknotes-staging', storage: SecureStore })],
});

const invalidationListeners = new Set<() => void>();
export function onSessionInvalidated(listener: () => void) {
  invalidationListeners.add(listener);
  return () => { invalidationListeners.delete(listener); };
}
let sessionGeneration = 0;

export async function invalidateLocalSession() {
  sessionGeneration += 1;
  for (const listener of invalidationListeners) listener();
  await setPreference('lastVerifiedUserId', '');
}

export async function cachedUserId() {
  const generation = sessionGeneration;
  const id = await getPreference('lastVerifiedUserId');
  return generation === sessionGeneration && id ? id : null;
}

type VerifiedUser = { id: string; email?: string };
let sessionCheck: { generation: number; cookie: string | null; result: Promise<VerifiedUser | null> } | null = null;

export async function verifySession() {
  const generation = sessionGeneration;
  const cookie = (await authClient.getCookie()) || null;
  if (generation !== sessionGeneration) return null;
  if (sessionCheck?.generation === generation && sessionCheck.cookie === cookie) return sessionCheck.result;
  const result = readSession(cookie, generation);
  const check = { generation, cookie, result };
  sessionCheck = check;
  try {
    return await result;
  } finally {
    if (sessionCheck === check) sessionCheck = null;
  }
}

async function readSession(cookie: string | null, generation: number): Promise<VerifiedUser | null> {
  if (!cookie) {
    if (await cachedUserId() && generation === sessionGeneration) await invalidateLocalSession();
    return null;
  }
  const response = await authenticatedFetch('/api/auth/get-session');
  if (response.status === 204) {
    if (generation === sessionGeneration) await invalidateLocalSession();
    return null;
  }
  if (!response.ok) throw new Error(`Account service unavailable (${response.status})`);
  const result = await response.json() as { user?: { id?: string; email?: string } } | null;
  if (generation !== sessionGeneration) return null;
  if (!result?.user?.id) {
    await invalidateLocalSession();
    return null;
  }
  await setPreference('lastVerifiedUserId', result.user.id);
  return generation === sessionGeneration ? { id: result.user.id, email: result.user.email } : null;
}

export async function authenticatedFetch(path: string, init: RequestInit = {}) {
  if (!apiOrigin) throw new Error('This build has no account service configured.');
  const target = new URL(path, `${apiOrigin}/`);
  if (target.origin !== new URL(apiOrigin).origin) throw new Error('Blocked request outside the configured API origin.');
  const generation = sessionGeneration;
  const cookie = await authClient.getCookie();
  if (generation !== sessionGeneration) throw new Error('Account changed. Try again.');
  const headers = new Headers(init.headers);
  if (cookie) headers.set('Cookie', cookie);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetchWithTimeout(target.toString(), { ...init, headers, credentials: 'omit' });
  if (response.status === 401) {
    if (generation === sessionGeneration) await invalidateLocalSession();
    throw Object.assign(new Error('Your session expired. Sign in again to access account notes.'), { status: 401 });
  }
  if (generation !== sessionGeneration) throw new Error('Account changed. Try again.');
  return response;
}

export function userScope(userId: string | null) {
  return userId ? `account:${userId}` : 'guest';
}
