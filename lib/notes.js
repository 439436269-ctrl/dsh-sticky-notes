/**
 * Pure note logic: shaping, patching and ordering. Kept free of runtime imports
 * so it can be unit-tested without the Harness packages.
 *
 * @module dsh-sticky-notes/notes
 */

import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH } from "./config.js";

/** Title used when neither a title nor a first line of body exists. */
export const UNTITLED = "Untitled";

/**
 * Cut a string to a character budget.
 * @param value - the raw text.
 * @param limit - maximum number of code units.
 * @returns the clipped string.
 */
export function clip(value, limit) {
  const text = typeof value === "string" ? value : "";
  return text.length > limit ? text.slice(0, limit) : text;
}

/**
 * Fold the first meaningful line of a body into a title.
 * @param body - the note body.
 * @returns a title no longer than 60 code units.
 */
export function titleFromBody(body) {
  const first = String(body ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== "");
  if (first === undefined) return UNTITLED;
  return clip(first, 60);
}

/**
 * Newest first; ties broken by id so the order is stable across reloads.
 * @param notes - notes to sort.
 * @returns a new, sorted array.
 */
export function sortNotes(notes) {
  return [...notes].sort((left, right) => {
    if (right.updatedAt !== left.updatedAt) return right.updatedAt - left.updatedAt;
    return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  });
}

/**
 * Normalize caller input into a stored note.
 * @param input - `title` / `body`, either possibly absent.
 * @param now - epoch ms for both timestamps.
 * @returns the note to persist.
 */
export function normalizeNote(input, now) {
  const rawBody = typeof input?.body === "string" ? input.body : "";
  const body = clip(rawBody, MAX_BODY_LENGTH);
  const rawTitle = typeof input?.title === "string" ? input.title.trim() : "";
  const title = rawTitle === "" ? titleFromBody(body) : clip(rawTitle, MAX_TITLE_LENGTH);
  return {
    id: `note-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    body,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Apply a patch to an existing note.
 * @param current - the stored note.
 * @param patch - `title` and/or `body`; absent fields are kept.
 * @param now - epoch ms for `updatedAt`.
 * @returns the updated note.
 */
export function applyPatch(current, patch, now) {
  const next = {
    ...current,
    title: Object.prototype.hasOwnProperty.call(patch, "title") && typeof patch.title === "string"
      ? clip(patch.title, MAX_TITLE_LENGTH)
      : current.title,
    body: Object.prototype.hasOwnProperty.call(patch, "body") && typeof patch.body === "string"
      ? clip(patch.body, MAX_BODY_LENGTH)
      : current.body,
    updatedAt: now
  };
  // An emptied title follows the body again, so the list never shows a blank row.
  if (next.title.trim() === "") next.title = titleFromBody(next.body);
  return next;
}
