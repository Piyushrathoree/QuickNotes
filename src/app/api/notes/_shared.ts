import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";

export const MAX_NOTE_CONTENT_BYTES = 1_048_576;
export const noteRevisionSchema = z.number().int().positive().max(2_147_483_647);
const MAX_JSON_BODY_BYTES = MAX_NOTE_CONTENT_BYTES * 6 + 2_048;

const noStoreHeaders = { "Cache-Control": "no-store" };

export function jsonResponse(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: noStoreHeaders });
}

export function apiError(status: number, message: string): Response {
  const code = status === 401 ? "unauthorized"
    : status === 404 ? "note_not_found"
      : status === 413 ? "request_too_large"
        : status === 415 ? "unsupported_media_type"
          : status === 503 ? "service_unavailable" : "invalid_request";
  return jsonResponse({ error: message, code }, status);
}

export function serviceUnavailable(): Response {
  return apiError(503, "The notes service is temporarily unavailable.");
}

export function refreshRequired(): Response {
  return jsonResponse({ error: "Refresh QuickNotes to continue editing.", code: "refresh_required" }, 428);
}

export async function getSessionUserId(): Promise<string | null> {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const userId = session?.user.id ?? null;
  const expectedUserId = requestHeaders.get("x-quicknotes-account");
  return expectedUserId === null || expectedUserId === userId ? userId : null;
}

const notePayloadSchema = z.object({
  content: z.string(),
  baseRevision: noteRevisionSchema.nullable(),
});

export function isNoteContentTooLarge(content: unknown): boolean {
  return typeof content === "string" &&
    new TextEncoder().encode(content).byteLength > MAX_NOTE_CONTENT_BYTES;
}

export type NotePayload = z.infer<typeof notePayloadSchema>;

export type NotePayloadResult =
  | { ok: true; payload: NotePayload }
  | { ok: false; response: Response };

type NotesJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; response: Response };

export async function readNotesJson(request: Request): Promise<NotesJsonResult> {
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, response: apiError(415, "Content-Type must be application/json.") };
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
      return { ok: false, response: apiError(400, "Invalid Content-Length header.") };
    }
    if (declaredLength > MAX_JSON_BODY_BYTES) {
      return { ok: false, response: apiError(413, "Request body is too large.") };
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { ok: false, response: apiError(400, "A JSON request body is required.") };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_JSON_BODY_BYTES) {
      void reader.cancel();
      return { ok: false, response: apiError(413, "Request body is too large.") };
    }
    chunks.push(value);
  }

  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bodyBytes)) };
  } catch {
    return { ok: false, response: apiError(400, "Request body must contain valid JSON.") };
  }
}

export async function readNotePayload(request: Request): Promise<NotePayloadResult> {
  const body = await readNotesJson(request);
  if (!body.ok) return body;

  const { value } = body;
  if (
    value && typeof value === "object" && "content" in value &&
    isNoteContentTooLarge(value.content)
  ) {
    return { ok: false, response: apiError(413, "Note content must be at most 1 MiB.") };
  }

  const validation = notePayloadSchema.safeParse(value);
  if (value && typeof value === "object" && "content" in value && !("baseRevision" in value)) {
    return { ok: false, response: refreshRequired() };
  }
  if (!validation.success) {
    return { ok: false, response: jsonResponse({ error: "Invalid note payload.", code: "invalid_payload" }, 400) };
  }

  return { ok: true, payload: validation.data };
}
