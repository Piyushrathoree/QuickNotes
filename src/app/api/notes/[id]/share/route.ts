import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { notes } from "@/db/schema";
import { createShareWithStatus, getActiveShare, revokeShare } from "@/lib/shares";
import { absoluteUrl } from "@/lib/site";

import { apiError, getSessionUserId, jsonResponse, serviceUnavailable } from "../../_shared";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const noteIdSchema = z.string().uuid();

function expectedOrigin(request: Request): string {
  const hasConfiguredOrigin = Boolean(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim(),
  );

  if (process.env.NODE_ENV === "development" && !hasConfiguredOrigin) {
    return new URL(request.url).origin;
  }

  return new URL(absoluteUrl("/")).origin;
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === expectedOrigin(request);
  } catch {
    return false;
  }
}

function shareUrl(request: Request, slug: string): string {
  return `${expectedOrigin(request)}/s/${slug}`;
}

function parseNoteId(id: string): string | null {
  return noteIdSchema.safeParse(id).success ? id : null;
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return apiError(401, "Authentication is required.");

    const id = parseNoteId((await context.params).id);
    if (!id) return apiError(404, "Note not found.");

    const database = getDb();
    if (!database) return serviceUnavailable();

    const [note] = await database
      .select({ id: notes.id })
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId), isNull(notes.deletedAt)))
      .limit(1);

    if (!note) return apiError(404, "Note not found.");

    const share = await getActiveShare(userId, id);
    if (!share) return jsonResponse({ shared: false });

    return jsonResponse({
      shared: true,
      slug: share.slug,
      url: shareUrl(request, share.slug),
      createdAt: share.createdAt.toISOString(),
    });
  } catch {
    return serviceUnavailable();
  }
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return apiError(401, "Authentication is required.");
    if (!isSameOrigin(request)) return apiError(403, "Cross-origin requests are not allowed.");

    const id = parseNoteId((await context.params).id);
    if (!id) return apiError(404, "Note not found.");

    const result = await createShareWithStatus(userId, id);
    if (!result.ok) {
      return result.reason === "not_found"
        ? apiError(404, "Note not found.")
        : serviceUnavailable();
    }

    return jsonResponse(
      {
        shared: true,
        slug: result.share.slug,
        url: shareUrl(request, result.share.slug),
        createdAt: result.share.createdAt.toISOString(),
      },
      result.created ? 201 : 200,
    );
  } catch {
    return serviceUnavailable();
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return apiError(401, "Authentication is required.");
    if (!isSameOrigin(request)) return apiError(403, "Cross-origin requests are not allowed.");

    const id = parseNoteId((await context.params).id);
    if (!id) return apiError(404, "Note not found.");

    const result = await revokeShare(userId, id);
    if (result === "not_found") return apiError(404, "Note not found.");
    return jsonResponse({ shared: false });
  } catch {
    return serviceUnavailable();
  }
}
