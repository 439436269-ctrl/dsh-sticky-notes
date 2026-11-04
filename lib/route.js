/**
 * The authenticated notes route: `GET` returns the list, `POST` mutates one
 * note. It lives under `/api`, so the connection service has already applied
 * its Host/Origin fence and browser-session check before the handler runs.
 *
 * @module dsh-sticky-notes/route
 */

import { MAX_REQUEST_BYTES, ROUTE_PATH } from "./config.js";

/** Headers shared by every answer; notes are user data, never cached. */
const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff"
};

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
      const note = await notes.create({ title: payload.title, body: payload.body });
      return json(200, { ok: true, note, notes: await notes.list() });
    }
    if (action === "update") {
      if (typeof payload.id !== "string" || payload.id === "") {
        return json(400, { ok: false, error: "update needs a note id" });
      }
      if (!hasPatch(payload)) return json(400, { ok: false, error: "update needs a title or a body" });
      const note = await notes.update(payload.id, { title: payload.title, body: payload.body });
      if (note === undefined) return json(404, { ok: false, error: "note not found" });
      return json(200, { ok: true, note, notes: await notes.list() });
    }
    if (action === "delete") {
      if (typeof payload.id !== "string" || payload.id === "") {
        return json(400, { ok: false, error: "delete needs a note id" });
      }
      const removed = await notes.remove(payload.id);
      if (!removed) return json(404, { ok: false, error: "note not found" });
      return json(200, { ok: true, notes: await notes.list() });
    }
    return json(400, { ok: false, error: "unknown action" });
  } catch (error) {
    return json(statusOf(error), { ok: false, error: messageOf(error) });
  }
}

/**
 * Whether the payload carries a patch field at all.
 * @param payload - parsed request body.
 * @returns true when `title` or `body` is a string.
 */
function hasPatch(payload) {
  return typeof payload.title === "string" || typeof payload.body === "string";
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
