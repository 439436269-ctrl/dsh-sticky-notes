/**
 * The authenticated notes route: `GET` returns every note (trash included, so
 * the panel can render its trash view without a second endpoint), `POST`
 * performs one named action.
 *
 * It lives under `/api`, so the connection service has already applied its
 * Host/Origin fence and browser-session check before the handler runs.
 *
 * @module dsh-sticky-notes/route
 */

import { MAX_REQUEST_BYTES, ROUTE_PATH } from "./config.js";

/** Headers shared by every answer; notes are user data, never cached. */
const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff"
};

/** Patch keys `update` accepts. */
const PATCH_KEYS = ["title", "body", "color", "pinned", "archivedAt"];

/**
 * Describe the route for `ctx.connection.fetch.register`.
 * @param notes - the notes repository.
 * @param routePath - mount path, defaulting to the shipped one.
 * @returns the route definition.
 */
export function createNotesRoute(notes, routePath = ROUTE_PATH) {
  return {
    path: routePath,
    methods: ["GET", "POST"],
    requestBody: "buffered",
    fetch: (request) => handleRequest(request, notes)
  };
}

/**
 * Answer one request.
 * @param request - the fetch request built by the bridge.
 * @param notes - the notes repository.
 * @returns the JSON response.
 */
export async function handleRequest(request, notes) {
  try {
    if (request.method === "GET" || request.method === "HEAD") {
      return json(200, { ok: true, notes: await notes.list() });
    }
    if (request.method !== "POST") return json(405, { ok: false, error: "method not allowed" });

    const payload = await readJson(request);
    const action = typeof payload.action === "string" ? payload.action : "";

    if (action === "create") {
      const note = await notes.create({ title: payload.title, body: payload.body, color: payload.color, pinned: payload.pinned });
      return json(200, { ok: true, note, notes: await notes.list() });
    }

    if (action === "update") {
      if (!isId(payload.id)) return json(400, { ok: false, error: "update needs a note id" });
      if (!hasPatch(payload)) return json(400, { ok: false, error: "update needs a title, body, colour, pin or archive field" });
      const note = await notes.update(payload.id, pick(payload, PATCH_KEYS));
      if (note === undefined) return json(404, { ok: false, error: "note not found" });
      return json(200, { ok: true, note, notes: await notes.list() });
    }

    if (action === "archive" || action === "delete") {
      if (!isId(payload.id)) return json(400, { ok: false, error: "archive needs a note id" });
      const note = await notes.archive(payload.id);
      if (note === undefined) return json(404, { ok: false, error: "note not found" });
      return json(200, { ok: true, note, notes: await notes.list() });
    }

    if (action === "restore") {
      if (!isId(payload.id)) return json(400, { ok: false, error: "restore needs a note id" });
      const note = await notes.restore(payload.id);
      if (note === undefined) return json(404, { ok: false, error: "note not found" });
      return json(200, { ok: true, note, notes: await notes.list() });
    }

    if (action === "purge") {
      if (!isId(payload.id)) return json(400, { ok: false, error: "purge needs a note id" });
      const removed = await notes.purge(payload.id);
      if (!removed) return json(404, { ok: false, error: "note not found" });
      return json(200, { ok: true, notes: await notes.list() });
    }

    if (action === "duplicate") {
      if (!isId(payload.id)) return json(400, { ok: false, error: "duplicate needs a note id" });
      const note = await notes.duplicate(payload.id);
      if (note === undefined) return json(404, { ok: false, error: "note not found" });
      return json(200, { ok: true, note, notes: await notes.list() });
    }

    if (action === "clear-trash") {
      const removed = await notes.clearTrash();
      return json(200, { ok: true, removed, notes: await notes.list() });
    }

    return json(400, { ok: false, error: "unknown action" });
  } catch (error) {
    return json(statusOf(error), { ok: false, error: messageOf(error) });
  }
}

/** Whether the payload carries a note id. */
function isId(value) {
  return typeof value === "string" && value !== "";
}

/** Whether any patch field is present at all. */
function hasPatch(payload) {
  return PATCH_KEYS.some((key) => Object.prototype.hasOwnProperty.call(payload, key));
}

/** Copy only the recognized patch fields. */
function pick(payload, keys) {
  const patch = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) patch[key] = payload[key];
  }
  return patch;
}

/**
 * Parse the request body, refusing oversized payloads before parsing.
 * @param request - the incoming request.
 * @returns the parsed JSON object.
 */
async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_REQUEST_BYTES) {
    const error = new Error("request body is too large");
    error.status = 413;
    throw error;
  }
  try {
    const parsed = JSON.parse(text === "" ? "{}" : text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      const error = new Error("request body must be a JSON object");
      error.status = 400;
      throw error;
    }
    return parsed;
  } catch (error) {
    if (typeof error.status === "number") throw error;
    const failure = new Error("request body is not valid JSON");
    failure.status = 400;
    throw failure;
  }
}

/**
 * Build one JSON answer.
 * @param status - HTTP status.
 * @param body - JSON-serializable body.
 * @returns the response.
 */
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, "Content-Type": "application/json; charset=utf-8" }
  });
}

/** Map a thrown error onto a status code. */
function statusOf(error) {
  return typeof error?.status === "number" ? error.status : 500;
}

/** A message a client can show without leaking internals. */
function messageOf(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
