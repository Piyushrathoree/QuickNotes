import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "../db";
import { sendResetPasswordEmail } from "./mail";
import { account, session, user, verification } from "../db/schema";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function configuredOrigin(value: string | undefined, name: string): string | undefined {
  const configured = value?.trim();
  if (!configured) return undefined;

  try {
    const url = new URL(configured.includes("://") ? configured : `https://${configured}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.origin;
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL or hostname.`);
  }
}

function createAuthInstance() {
  const secret = requiredEnv("BETTER_AUTH_SECRET");
  if (secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  const configuredUrl = new URL(requiredEnv("BETTER_AUTH_URL"));
  const isLocalhost = configuredUrl.hostname === "localhost" || configuredUrl.hostname === "127.0.0.1";
  if (configuredUrl.protocol !== "https:" && !(isLocalhost && configuredUrl.protocol === "http:")) {
    throw new Error("BETTER_AUTH_URL must use HTTPS, except for local development.");
  }

  const database = getDb();
  if (!database) throw new Error("DATABASE_URL is required to initialize authentication.");

  const baseURL = configuredUrl.origin;
  // The canonical auth URL can differ from the URL users open (for example, a custom
  // production domain or a Vercel preview). Trust only the exact origins configured
  // for this site and deployment; Better Auth rejects other origins with 403.
  const trustedOrigins = new Set([baseURL]);
  for (const [value, name] of [
    [process.env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL"],
    [process.env.VERCEL_PROJECT_PRODUCTION_URL, "VERCEL_PROJECT_PRODUCTION_URL"],
    [process.env.VERCEL_URL, "VERCEL_URL"],
  ] as const) {
    const origin = configuredOrigin(value, name);
    if (origin) trustedOrigins.add(origin);
  }

  return betterAuth({
    appName: "Quick Notes",
    baseURL,
    secret,
    trustedOrigins: [...trustedOrigins],
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    advanced: {
      useSecureCookies: configuredUrl.protocol === "https:" || process.env.NODE_ENV === "production",
    },
    emailAndPassword: {
      enabled: true,
      // No email verification step: accounts work immediately after sign-up.
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail({ to: user.email, url });
      },
    },
    // nextCookies must stay last so cookies set by other plugins are forwarded.
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuthInstance>;

let authInstance: AuthInstance | undefined;

function getAuthInstance(): AuthInstance {
  if (!authInstance) authInstance = createAuthInstance();
  return authInstance;
}

// Keep initialization lazy so importing the app during `next build` does not
// require production secrets or a live database.
export const auth: AuthInstance = new Proxy({} as AuthInstance, {
  get(_target, property) {
    const instance = getAuthInstance();
    const value = Reflect.get(instance, property);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, property) {
    return property in getAuthInstance();
  },
  ownKeys() {
    return Reflect.ownKeys(getAuthInstance());
  },
  getOwnPropertyDescriptor(_target, property) {
    const descriptor = Reflect.getOwnPropertyDescriptor(getAuthInstance(), property);
    return descriptor ? { ...descriptor, configurable: true } : undefined;
  },
});

export default auth;
