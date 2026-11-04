import assert from "node:assert/strict";
import { test } from "node:test";
import { createNotesRoute, handleRequest } from "../lib/route.js";
import { ROUTE_PATH } from "../lib/config.js";

/**A note fixture. */
function note(overrides = {}) {
  return {
    id: "n1",
    title: "t",
    body: "",
    color: "plain",
    pinned: false,
    createdAt: 1,
    updatedAt: 1,
    archivedAt: null,
    ...overrides
  };
}

/** An in-memory stand-in for the repository. */
function fakeNotes(initial = []) {
  let rows = initial.map((entry) => ({ ...entry }));
  let counter = initial.length;
  const find = (id) => rows.find((entry) => entry.id === id);
  const update = (id, patch) => {
    const current = find(id);
    if (current === undefined) return undefined;
    if (typeof patch.title === "string") current.title = patch.title;
    if (typeof patch.body === "string") current.body = patch.body;
    if (typeof patch.color === "string") current.color = patch.color;
    if (typeof patch.pinned === "boolean") current.pinned = patch.pinned;
    if (patch.archivedAt === null) current.archivedAt = null;
    else if (typeof patch.archivedAt === "number") current.archivedAt = patch.archivedAt;
    current.updatedAt = counter + 100;
    return current;
  };
  return {
    get rows() {
      return rows;
    },
    async list() {
      return rows;
    },
    async create(input) {
      counter += 1;
      const created = note({
        id: `note-${counter}`,
        title: String(input.title ?? input.body ?? "").slice(0, 20),
        body: String(input.body ?? ""),
        color: input.color ?? "plain",
        pinned: input.pinned === true,
        createdAt: counter,
        updatedAt: counter
      });
      rows = [created, ...rows];
      return created;
    },
    async update(id, patch) {
      return update(id, patch ?? {});
    },
    async archive(id) {
      const current = find(id);
      if (current === undefined) return undefined;
      current.archivedAt = 77;
      return current;
    },
    async restore(id) {
      const current = find(id);
      if (current === undefined) return undefined;
      current.archivedAt = null;
      return current;
    },
    async purge(id) {
      const before = rows.length;
      rows = rows.filter((entry) => entry.id !== id);
      return rows.length !== before;
    },
    async duplicate(id) {
      const source = find(id);
      if (source === undefined) return undefined;
      return this.create({ title: `${source.title} (copy)`, body: source.body, color: source.color });
    },
    async clearTrash() {
      const before = rows.length;
      rows = rows.filter((entry) => entry.archivedAt === null);
      return before - rows.length;
    }
  };
}

/** Build a POST request with a JSON body. */
function post(body) {
  return new Request("http://127.0.0.1:1" + ROUTE_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

test("GET answers every note so the board can render its trash view", async () => {
  const notes = fakeNotes([note({ id: "a" }), note({ id: "b", archivedAt: 4 })]);
  const response = await handleRequest(new Request("http://x" + ROUTE_PATH), notes);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.notes.map((entry) => entry.id), ["a", "b"]);
});

test("create echoes the note with its colour and pin", async () => {
  const notes = fakeNotes();
  const response = await handleRequest(post({ action: "create", title: "购物", body: "milk", color: "mint", pinned: true }), notes);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.note.color, "mint");
  assert.equal(body.note.pinned, true);
  assert.equal(body.notes.length, 1);
});

test("update patches one note and reports a missing id", async () => {
  const notes = fakeNotes([note({ id: "n1", title: "old" })]);
  const ok = await handleRequest(post({ action: "update", id: "n1", title: "new", color: "rose" }), notes);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.note.title, "new");
  assert.equal(body.note.color, "rose");

  const missing = await handleRequest(post({ action: "update", id: "nope", title: "x" }), notes);
  assert.equal(missing.status, 404);

  const noId = await handleRequest(post({ action: "update", title: "x" }), notes);
  assert.equal(noId.status, 400);

  const noPatch = await handleRequest(post({ action: "update", id: "n1" }), notes);
  assert.equal(noPatch.status, 400);
  assert.match((await noPatch.json()).error, /title, body, colour, pin or archive/);
});

test("archive, restore and purge walk one note through the trash", async () => {
  const notes = fakeNotes([note({ id: "n1" })]);
  const archived = await handleRequest(post({ action: "archive", id: "n1" }), notes);
  assert.equal(archived.status, 200);
  assert.equal((await archived.json()).note.archivedAt, 77);

  const restored = await handleRequest(post({ action: "restore", id: "n1" }), notes);
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).note.archivedAt, null);

  const purged = await handleRequest(post({ action: "purge", id: "n1" }), notes);
  assert.equal(purged.status, 200);
  assert.equal(notes.rows.length, 0);

  assert.equal((await handleRequest(post({ action: "purge", id: "n1" }), notes)).status, 404);
  assert.equal((await handleRequest(post({ action: "archive" }), notes)).status, 400);
  assert.equal((await handleRequest(post({ action: "restore" }), notes)).status, 400);
});

test("delete is an alias for archive", async () => {
  const notes = fakeNotes([note({ id: "n1" })]);
  const response = await handleRequest(post({ action: "delete", id: "n1" }), notes);
  assert.equal(response.status, 200);
  assert.equal(notes.rows[0].archivedAt, 77);
});

test("duplicate copies the note and clear-trash empties the bin", async () => {
  const notes = fakeNotes([note({ id: "n1", title: "原文", color: "sky" }), note({ id: "n2", archivedAt: 3 })]);
  const copied = await handleRequest(post({ action: "duplicate", id: "n1" }), notes);
  assert.equal(copied.status, 200);
  const body = await copied.json();
  assert.equal(body.note.title, "原文 (copy)");
  assert.equal(body.note.color, "sky");

  const cleared = await handleRequest(post({ action: "clear-trash" }), notes);
  assert.equal(cleared.status, 200);
  const clearedBody = await cleared.json();
  assert.equal(clearedBody.removed, 1);
  assert.equal(notes.rows.some((entry) => entry.archivedAt !== null), false);
});

test("malformed input is refused with a usable message", async () => {
  const notes = fakeNotes();
  const unknown = await handleRequest(post({ action: "explode" }), notes);
  assert.equal(unknown.status, 400);
  assert.equal((await unknown.json()).error, "unknown action");

  const invalid = await handleRequest(post("{not json"), notes);
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /not valid JSON/);

  const array = await handleRequest(post("[1,2,3]"), notes);
  assert.equal(array.status, 400);

  const empty = await handleRequest(post(""), notes);
  assert.equal(empty.status, 400, "an empty body has no action");
});

test("an oversized body is refused before parsing", async () => {
  const notes = fakeNotes();
  const huge = JSON.stringify({ action: "create", body: "x".repeat(1024 * 1024 + 10) });
  const response = await handleRequest(post(huge), notes);
  assert.equal(response.status, 413);
  assert.match((await response.json()).error, /too large/);
});

test("the route definition matches the shipped contract", () => {
  const route = createNotesRoute(fakeNotes());
  assert.equal(route.path, ROUTE_PATH);
  assert.deepEqual(route.methods, ["GET", "POST"]);
  assert.equal(route.requestBody, "buffered");
  assert.equal(typeof route.fetch, "function");
});

test("a repository failure becomes a 500 with the message kept", async () => {
  const notes = {
    async list() {
      throw new Error("storage is closed");
    }
  };
  const response = await handleRequest(new Request("http://x" + ROUTE_PATH), notes);
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, "storage is closed");
});
