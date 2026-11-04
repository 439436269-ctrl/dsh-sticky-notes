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
import { applyPatch, isArchived, normalizeNote, normalizeStored, sortNotes } from "./notes.js";

/**
 * Validate a stored record. The domain only needs `parse()`; older records
 * (written before colours and the trash existed) are normalized on read, so a
 * single `parse` both checks and upgrades.
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
      return normalizeStored(value);
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
 * @returns the repository: list / create / update / archive / restore / purge / duplicate.
 */
export function createNotesRepository(ctx) {
  const ready = ctx.storageDomain.open(notesDomain);

  /** @returns {Promise<object>} the opened domain. */
  async function domain() {
    return ready;
  }

  /** @returns {Promise<Map>} the table, for one operation. */
  async function table() {
    return (await domain()).table(TABLE_NAME);
  }

  /** @returns {Promise<Array>} every note, pinned first, newest first, trash included. */
  async function list() {
    return sortNotes(Array.from((await table()).entries(), ([, value]) => normalizeStored(value)), "updated");
  }

  /**
   * Read one note.
   * @param id - note id.
   * @returns {Promise<object|undefined>} the note.
   */
  async function get(id) {
    if (typeof id !== "string" || id === "") return undefined;
    const stored = (await table()).get(id);
    return stored === undefined ? undefined : normalizeStored(stored);
  }

  /**
   * Persist one new note.
   * @param input - `title` / `body` / `color` / `pinned`.
   * @returns {Promise<object>} the stored note.
   */
  async function create(input) {
    const note = normalizeNote(input ?? {}, Date.now());
    await (await table()).put(note.id, note);
    return note;
  }

  /**
   * Patch one note. `archivedAt: null` restores it from the trash.
   * @param id - note id.
   * @param patch - any of `title` / `body` / `color` / `pinned` / `archivedAt`.
   * @returns {Promise<object|undefined>} the stored note, or undefined when absent.
   */
  async function update(id, patch) {
    const store = await table();
    const current = typeof id === "string" ? store.get(id) : undefined;
    if (current === undefined) return undefined;
    const note = applyPatch(normalizeStored(current), patch ?? {}, Date.now());
    await store.put(note.id, note);
    return note;
  }

  /**
   * Move a note to the trash (soft delete).
   * @param id - note id.
   * @returns {Promise<object|undefined>} the archived note, or undefined when absent.
   */
  async function archive(id) {
    const note = await get(id);
    if (note === undefined) return undefined;
    if (isArchived(note)) return note;
    return update(id, { archivedAt: Date.now() });
  }

  /**
   * Take a note back out of the trash.
   * @param id - note id.
   * @returns {Promise<object|undefined>} the restored note, or undefined when absent.
   */
  async function restore(id) {
    const note = await get(id);
    if (note === undefined) return undefined;
    if (!isArchived(note)) return note;
    return update(id, { archivedAt: null });
  }

  /**
   * Delete one note for good.
   * @param id - note id.
   * @returns {Promise<boolean>} whether a record existed.
   */
  async function purge(id) {
    if (typeof id !== "string" || id === "") return false;
    return (await table()).delete(id);
  }

  /**
   * Copy a note, keeping its colour and pin state.
   * @param id - note id.
   * @returns {Promise<object|undefined>} the copy, or undefined when the source is absent.
   */
  async function duplicate(id) {
    const source = await get(id);
    if (source === undefined) return undefined;
    return create({
      title: `${source.title} (copy)`,
      body: source.body,
      color: source.color,
      pinned: false
    });
  }

  /**
   * Empty the trash.
   * @returns {Promise<number>} how many notes were removed.
   */
  async function clearTrash() {
    const store = await table();
    const archived = Array.from(store.entries())
      .map(([, value]) => normalizeStored(value))
      .filter((note) => isArchived(note));
    for (const note of archived) await store.delete(note.id);
    return archived.length;
  }

  return { ready, list, get, create, update, archive, restore, purge, duplicate, clearTrash };
}
