import { z } from "zod";

import type { Note, NoteSummary } from "@/lib/types";

export type NotesApiErrorKind =
  | "offline"
  | "unauthorized"
  | "server"
  | "not-found"
  | "validation"
  | "conflict"
  | "refresh-required";

export class NotesApiError extends Error {
  readonly kind: NotesApiErrorKind;
  readonly status: number | undefined;
  readonly code?: string;
  readonly current?: Note | null;

  constructor(kind: NotesApiErrorKind, message: string, status?: number, code?: string, current?: Note | null) {
    super(message);
    this.name = "NotesApiError";
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.current = current;
  }
}

const noteSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  revision: z.number().int().positive(),
});

const noteSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  updatedAt: z.number(),
  revision: z.number().int().positive(),
});

async function fetchResponse(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, { credentials: "same-origin", ...init });
  } catch {
    throw new NotesApiError("offline", "The notes service could not be reached.");
  }

  if (!response.ok) {
    let message = `Notes API request failed (${response.status}).`;
    let body: unknown;
    try {
      body = await response.json();
      if (typeof body === "object" && body !== null && "error" in body && typeof body.error === "string") {
        message = body.error;
      }
      if (typeof body === "object" && body !== null && "code" in body && typeof body.code === "string") {
        const code = body.code;
        const currentResult = "current" in body ? noteSchema.nullable().safeParse(body.current) : null;
        if (response.status === 409 || code === "note_conflict") {
          return Promise.reject(new NotesApiError("conflict", message, response.status, code,
            currentResult?.success ? currentResult.data : undefined));
        }
        if (code === "refresh_required") {
          return Promise.reject(new NotesApiError("refresh-required", message, response.status, code));
        }
      }
    } catch {
      // The HTTP status still carries the useful error classification.
    }

    if (response.status === 401) {
      throw new NotesApiError("unauthorized", message, response.status);
    }
    if (response.status === 404) {
      throw new NotesApiError("not-found", message, response.status);
    }
    if (response.status >= 500) {
      throw new NotesApiError("server", message, response.status);
    }
    throw new NotesApiError("validation", message, response.status);
  }

  return response;
}

async function parseJson<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new NotesApiError("server", "The notes service returned an invalid response.");
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    throw new NotesApiError("server", "The notes service returned an unexpected response.");
  }
  return result.data;
}

export async function fetchNotes(): Promise<NoteSummary[]> {
  const response = await fetchResponse("/api/notes", { cache: "no-store" });
  return parseJson(response, z.array(noteSummarySchema));
}

export async function fetchNote(id: string): Promise<Note> {
  const response = await fetchResponse(`/api/notes/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  return parseJson(response, noteSchema);
}

export async function saveNote(note: Pick<Note, "id" | "content"> & { baseRevision: number | null }): Promise<Note> {
  const response = await fetchResponse(`/api/notes/${encodeURIComponent(note.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: note.content, baseRevision: note.baseRevision }),
  });
  return parseJson(response, noteSchema);
}

export async function deleteNote(id: string, baseRevision: number): Promise<number> {
  const response = await fetchResponse(`/api/notes/${encodeURIComponent(id)}?baseRevision=${baseRevision}`, { method: "DELETE" });
  const result = await parseJson(response, z.object({ revision: z.number().int().positive() }));
  return result.revision;
}

export async function restoreNote(id: string, baseRevision: number, content: string): Promise<Note> {
  const response = await fetchResponse(`/api/notes/${encodeURIComponent(id)}/restore`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ baseRevision, content }),
  });
  return parseJson(response, noteSchema);
}
