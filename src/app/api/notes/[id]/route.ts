import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { notes } from "@/db/schema";
import { apiError, getSessionUserId, jsonResponse, noteRevisionSchema, readNotePayload, refreshRequired, serviceUnavailable } from "../_shared";

interface RouteContext { params: Promise<{ id: string }> }
const noteIdSchema = z.string().uuid();
type NoteSnapshot = { id: string; content: string; createdAt: number; updatedAt: number; revision: number };
type NoteRow = typeof notes.$inferSelect;

function toApiNote(row: NoteRow): NoteSnapshot {
  return { id: row.id, content: row.content, createdAt: row.createdAt.getTime(), updatedAt: row.updatedAt.getTime(), revision: row.revision };
}

function conflict(current: NoteSnapshot | null): Response {
  return jsonResponse({ error: "The note changed elsewhere. Refresh before saving.", code: "note_conflict", current }, 409);
}

async function currentOwned(userId: string, id: string): Promise<NoteRow | undefined> {
  const db = getDb();
  if (!db) throw new Error("Notes database is unavailable");
  const [row] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).limit(1);
  return row;
}

async function validatedRequest(context: RouteContext): Promise<{ userId: string; id: string } | Response> {
  const userId = await getSessionUserId();
  if (!userId) return apiError(401, "Authentication is required.");
  const { id } = await context.params;
  if (!noteIdSchema.safeParse(id).success) return apiError(400, "Invalid note id.");
  return { userId, id };
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const validated = await validatedRequest(context);
    if (validated instanceof Response) return validated;
    const db = getDb();
    if (!db) return serviceUnavailable();
    const [note] = await db.select().from(notes).where(and(eq(notes.id, validated.id), eq(notes.userId, validated.userId), isNull(notes.deletedAt))).limit(1);
    return note ? jsonResponse(toApiNote(note)) : apiError(404, "Note not found.");
  } catch { return serviceUnavailable(); }
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  try {
    const validated = await validatedRequest(context);
    if (validated instanceof Response) return validated;
    const parsed = await readNotePayload(request);
    if (!parsed.ok) return parsed.response;
    const { userId, id } = validated;
    const db = getDb();
    if (!db) return serviceUnavailable();
    const { content, baseRevision } = parsed.payload;

    if (baseRevision === null) {
      const [created] = await db.insert(notes).values({ id, userId, content, revision: 1 }).onConflictDoNothing({ target: notes.id }).returning();
      if (created) return jsonResponse(toApiNote(created), 201);
      const row = await currentOwned(userId, id);
      if (!row) return apiError(404, "Note not found.");
      if (!row.deletedAt && row.content === content) return jsonResponse(toApiNote(row));
      return conflict(row.deletedAt ? null : toApiNote(row));
    }

    const [updated] = await db.update(notes).set({
      content,
      updatedAt: sql<Date>`now()`,
      revision: sql<number>`${notes.revision} + 1`,
    }).where(and(eq(notes.id, id), eq(notes.userId, userId), eq(notes.revision, baseRevision), isNull(notes.deletedAt))).returning();
    if (updated) return jsonResponse(toApiNote(updated));
    const row = await currentOwned(userId, id);
    if (!row) return apiError(404, "Note not found.");
    return conflict(row.deletedAt ? null : toApiNote(row));
  } catch { return serviceUnavailable(); }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  try {
    const validated = await validatedRequest(context);
    if (validated instanceof Response) return validated;
    const rawRevision = new URL(request.url).searchParams.get("baseRevision");
    if (rawRevision === null) return refreshRequired();
    const revision = noteRevisionSchema.safeParse(Number(rawRevision));
    if (!/^[1-9]\d*$/.test(rawRevision) || !revision.success) {
      return jsonResponse({ error: "A positive baseRevision query parameter is required.", code: "invalid_revision" }, 400);
    }
    const db = getDb();
    if (!db) return serviceUnavailable();
    const baseRevision = revision.data;
    const [deleted] = await db.update(notes).set({
      deletedAt: sql<Date>`now()`,
      updatedAt: sql<Date>`now()`,
      revision: sql<number>`${notes.revision} + 1`,
    }).where(and(eq(notes.id, validated.id), eq(notes.userId, validated.userId), eq(notes.revision, baseRevision), isNull(notes.deletedAt))).returning({ revision: notes.revision });
    if (deleted) return jsonResponse({ revision: deleted.revision });
    const row = await currentOwned(validated.userId, validated.id);
    if (!row) return apiError(404, "Note not found.");
    return conflict(row.deletedAt ? null : toApiNote(row));
  } catch { return serviceUnavailable(); }
}
