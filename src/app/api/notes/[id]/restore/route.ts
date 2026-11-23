import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { notes } from "@/db/schema";
import { apiError, getSessionUserId, isNoteContentTooLarge, jsonResponse, noteRevisionSchema, readNotesJson, serviceUnavailable } from "../../_shared";

interface RouteContext { params: Promise<{ id: string }> }
const idSchema = z.string().uuid();
const bodySchema = z.object({
  baseRevision: noteRevisionSchema,
  content: z.string().optional(),
});

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const userId = await getSessionUserId();
    if (!userId) return apiError(401, "Authentication is required.");
    const { id } = await context.params;
    if (!idSchema.safeParse(id).success) return apiError(400, "Invalid note id.");
    const body = await readNotesJson(request);
    if (!body.ok) return body.response;
    const parsed = bodySchema.safeParse(body.value);
    if (!parsed.success) return jsonResponse({ error: "Invalid restore payload.", code: "invalid_payload" }, 400);
    if (isNoteContentTooLarge(parsed.data.content)) {
      return jsonResponse({ error: "Note content must be at most 1 MiB.", code: "note_too_large" }, 413);
    }
    const db = getDb();
    if (!db) return serviceUnavailable();
    const setValues = {
      deletedAt: null,
      updatedAt: sql<Date>`now()`,
      revision: sql<number>`${notes.revision} + 1`,
      ...(parsed.data.content === undefined ? {} : { content: parsed.data.content }),
    };
    const [restored] = await db.update(notes).set(setValues)
      .where(and(eq(notes.id, id), eq(notes.userId, userId), eq(notes.revision, parsed.data.baseRevision), isNotNull(notes.deletedAt)))
      .returning();
    if (restored) return jsonResponse({ id: restored.id, content: restored.content, createdAt: restored.createdAt.getTime(), updatedAt: restored.updatedAt.getTime(), revision: restored.revision });

    const [current] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).limit(1);
    if (!current) return apiError(404, "Note not found.");
    const snapshot = current.deletedAt ? null : { id: current.id, content: current.content, createdAt: current.createdAt.getTime(), updatedAt: current.updatedAt.getTime(), revision: current.revision };
    return jsonResponse({ error: "The note changed elsewhere. Refresh before restoring.", code: "note_conflict", current: snapshot }, 409);
  } catch { return serviceUnavailable(); }
}
