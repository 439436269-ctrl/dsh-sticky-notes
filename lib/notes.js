/**
 * Pure note logic: shaping, patching, filtering and ordering. Kept free of
 * runtime imports (besides the palette ids) so it can be unit-tested without
 * the Harness packages.
 *
 * @module dsh-sticky-notes/notes
 */

import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH } from "./config.js";
import { DEFAULT_COLOR, normalizeColor } from "./palette.js";

/** Title used when neither a title nor a first line of body exists. */
export const UNTITLED = "Untitled";

/** Sort keys the panel and the tools accept. */
export const SORT_MODES = Object.freeze(["updated", "created", "title"]);

/** Which notes a view shows: everything, only pinned, or the trash. */
export const VIEWS = Object.freeze(["all", "pinned", "trash"]);

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
 * Whether a note sits in the trash.
 * @param note - the note.
 * @returns true when it was archived.
 */
export function isArchived(note) {
  return typeof note?.archivedAt === "number" && Number.isFinite(note.archivedAt) && note.archivedAt > 0;
}

/**
 * Fill a stored record with the fields an older build may not have written.
 * @param value - the stored note.
 * @param now - epoch ms used as a last-resort timestamp.
 * @returns the normalized note.
 */
export function normalizeStored(value, now = Date.now()) {
  const createdAt = typeof value?.createdAt === "number" ? value.createdAt : now;
  const updatedAt = typeof value?.updatedAt === "number" ? value.updatedAt : createdAt;
  return {
    id: String(value?.id ?? ""),
    title: typeof value?.title === "string" ? value.title : "",
    body: typeof value?.body === "string" ? value.body : "",
    color: normalizeColor(value?.color),
    pinned: value?.pinned === true,
    createdAt,
    updatedAt,
    archivedAt: typeof value?.archivedAt === "number" && value.archivedAt > 0 ? value.archivedAt : null
  };
}

/**
 * Normalize caller input into a new stored note.
 * @param input - `title` / `body` / `color` / `pinned`, all optional.
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
    color: normalizeColor(input?.color ?? DEFAULT_COLOR),
    pinned: input?.pinned === true,
    createdAt: now,
    updatedAt: now,
    archivedAt: null
  };
}

/**
 * Apply a patch to an existing note. Absent fields are kept; an emptied title
 * falls back to the body so the board never shows a blank row.
 * @param current - the stored note.
 * @param patch - any of `title` / `body` / `color` / `pinned` / `archivedAt`.
 * @param now - epoch ms for `updatedAt`.
 * @returns the updated note.
 */
export function applyPatch(current, patch, now) {
  const next = { ...normalizeStored(current, now) };
  if (typeof patch?.title === "string") next.title = clip(patch.title, MAX_TITLE_LENGTH);
  if (typeof patch?.body === "string") next.body = clip(patch.body, MAX_BODY_LENGTH);
  if (typeof patch?.color === "string") next.color = normalizeColor(patch.color);
  if (typeof patch?.pinned === "boolean") next.pinned = patch.pinned;
  if (patch?.archivedAt === null) next.archivedAt = null;
  else if (typeof patch?.archivedAt === "number" && patch.archivedAt > 0) next.archivedAt = patch.archivedAt;
  if (next.title.trim() === "") next.title = titleFromBody(next.body);
  next.updatedAt = now;
  return next;
}

/**
 * Order notes for one view: pinned first, then the chosen key. Trash entries
 * carry no pin weight so the bin reads as a plain history.
 * @param notes - notes to sort.
 * @param mode - `updated` | `created` | `title`.
 * @returns a new, sorted array.
 */
export function sortNotes(notes, mode = "updated") {
  const keyed = notes.map((note) => ({ note, archived: isArchived(note) }));
  keyed.sort((left, right) => {
    const pinLeft = left.archived ? 0 : left.note.pinned ? 1 : 0;
    const pinRight = right.archived ? 0 : right.note.pinned ? 1 : 0;
    if (pinLeft !== pinRight) return pinRight - pinLeft;
    if (mode === "title") {
      const compared = left.note.title.localeCompare(right.note.title, undefined, { sensitivity: "base" });
      if (compared !== 0) return compared;
    } else if (mode === "created") {
      if (left.note.createdAt !== right.note.createdAt) return right.note.createdAt - left.note.createdAt;
    } else {
      if (left.note.updatedAt !== right.note.updatedAt) return right.note.updatedAt - left.note.updatedAt;
    }
    return left.note.id < right.note.id ? -1 : left.note.id > right.note.id ? 1 : 0;
  });
  return keyed.map((entry) => entry.note);
}

/**
 * Whether a note matches a search term.
 * @param note - the note.
 * @param query - raw search input.
 * @returns true when the term appears in the title or the body.
 */
export function matchesQuery(note, query) {
  const term = String(query ?? "").trim().toLowerCase();
  if (term === "") return true;
  return `${note.title}\n${note.body}`.toLowerCase().includes(term);
}

/**
 * Apply the panel's filters.
 * @param notes - every note.
 * @param options - `{ view, color, query }`; unknown values mean "no filter".
 * @returns the matching notes, unsorted.
 */
export function filterNotes(notes, options = {}) {
  const view = VIEWS.includes(options.view) ? options.view : "all";
  const color = typeof options.color === "string" && options.color !== "all" ? options.color : "";
  return notes.filter((note) => {
    const archived = isArchived(note);
    if (view === "trash" ? !archived : archived) return false;
    if (view === "pinned" && !note.pinned) return false;
    if (color !== "" && note.color !== color) return false;
    return matchesQuery(note, options.query);
  });
}

/**
 * How many notes are active, pinned and trashed.
 * @param notes - every note.
 * @returns `{ total, active, pinned, trash }`.
 */
export function countNotes(notes) {
  let active = 0;
  let pinned = 0;
  let trash = 0;
  for (const note of notes) {
    if (isArchived(note)) trash += 1;
    else {
      active += 1;
      if (note.pinned) pinned += 1;
    }
  }
  return { total: notes.length, active, pinned, trash };
}
