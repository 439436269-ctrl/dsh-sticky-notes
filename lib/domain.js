/**
 * The notes storage domain and the repository that reads and writes it.
 *
 * One record per note in the `notes` table, keyed by the note id; whole-record
 * writes keep the persistence model as simple as the UI (last write wins per
 * note, and every client refresh sees the same list).
 *
 * @module dsh-sticky-notes/domain
 */

import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";
import { DOMAIN_NAME, TABLE_NAME } from "./config.js";
import { applyPatch, normalizeNote, sortNotes } from "./notes.js";

/**
 * A permissive but strict-enough record schema: the domain only needs
 * `parse()`, and a stored record that does not match is reported instead of
 * quietly reaching the UI.
 * @returns the schema handed to `domainTable`.
 */
function noteSchema() {
  return {
    parse(value) {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error("a sticky note must be an object");
      }
      if (typeof value.id !== "string" || value.id === "") {
        throw new Error("a sticky note needs a non-empty string id");
      }
      if (typeof value.title !== "string") throw new Error("a sticky note title must be a string");
      if (typeof value.body !== "string") throw new Error("a sticky note body must be a string");
      if (typeof value.createdAt !== "number") throw new Error("a sticky note needs a numeric createdAt");
      if (typeof value.updatedAt !== "number") throw new Error("a sticky note needs a numeric updatedAt");
      return value;
    }
  };
}

/** The plugin's single storage domain. */
export const notesDomain = defineDomain({
  name: DOMAIN_NAME,
  version: 1,
  tables: {
    [TABLE_NAME]: domainTable(noteSchema())
  }
});

/**
 * Open the domain and expose note operations.
 * @param ctx - host plugin context carrying `storageDomain`.
 * @returns `{ ready, list, create, update, remove }`.
 */
export function createNotesRepository(ctx) {
  const ready = ctx.storageDomain.open(notesDomain);

  /** @returns {Promise<object>} the opened domain. */
  async function domain() {
    return ready;
  }

  /** @returns {Promise<Array>} every note, newest first. */
  async function list() {
    const table = (await domain()).table(TABLE_NAME);
    return sortNotes(Array.from(table.entries(), ([, value]) => value));
  }

  /**
   * Persist one new note.
   * @param input - `title` / `body`.
   * @returns {Promise<object>} the stored note.
   */
  async function create(input) {
    const note = normalizeNote(input ?? {}, Date.now());
    await (await domain()).table(TABLE_NAME).put(note.id, note);
    return note;
  }

  /**
   * Patch one note.
   * @param id - note id.
   * @param patch - `title` and/or `body`.
   * @returns {Promise<object|undefined>} the stored note, or undefined when absent.
   */
  async function update(id, patch) {
    const table = (await domain()).table(TABLE_NAME);
    const current = typeof id === "string" ? table.get(id) : undefined;
    if (current === undefined) return undefined;
    const note = applyPatch(current, patch ?? {}, Date.now());
    await table.put(note.id, note);
    return note;
  }

  /**
   * Delete one note.
   * @param id - note id.
   * @returns {Promise<boolean>} whether a record existed.
   */
  async function remove(id) {
    if (typeof id !== "string" || id === "") return false;
    return (await domain()).table(TABLE_NAME).delete(id);
  }

  return { ready, list, create, update, remove };
}
