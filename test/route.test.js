import assert from "node:assert/strict";
import { test } from "node:test";
import { createNotesRoute, handleRequest } from "../lib/route.js";
import { ROUTE_PATH } from "../lib/config.js";

/** An in-memory stand-in for the repository. */
function fakeNotes(initial = []) {
  let rows = [...initial];
  let counter = 0;
  return {
    get rows() {
      return rows;
    },
    async list() {
      return rows;
    },
    async create(input) {
      counter += 1;
      const note = {
        id: `note-${counter}`,
        title: String(input.title ?? input.body ?? "").slice(0, 20),
        body: String(input.body ?? ""),
        createdAt: counter,
        updatedAt: counter
      };
      rows = [note, ...rows];
      return note;
    },
    async update(id, patch) {
      const index = rows.findIndex((note) => note.id === id);
      if (index === -1) return undefined;
      // Mirror the real repository: only string fields patch, absent ones keep.
      const next = { ...rows[index] };
      if (typeof patch.title === "string") next.title = patch.title;
      if (typeof patch.body === "string") next.body = patch.body;
      next.updatedAt = counter + 100;
      rows = rows.map((note, at) => (at === index ? next : note));
      return next;
    },
    async remove(id) {
      const before = rows.length;
      rows = rows.filter((note) => note.id !== id);
      return rows.length !== before;
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

test("GET answers the whole list, newest first as the repository returns it", async () => {
  const notes = fakeNotes([{ id: "a", title: "A", body: "", createdAt: 1, updatedAt: 1 }]);
  const response = await handleRequest(new Request("http://x" + ROUTE_PATH), notes);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.notes.map((note) => note.id), ["a"]);
});

test("create echoes the new note and the refreshed list", async () => {
  const notes = fakeNotes();
  const response = await handleRequest(post({ action: "create", title: "购物", body: "milk" }), notes);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.note.title, "购物");
  assert.equal(body.notes.length, 1);
  assert.equal(notes.rows.length, 1);
});

test("update patches one note and reports a missing id", async () => {
  const notes = fakeNotes([{ id: "n1", title: "old", body: "b", createdAt: 1, updatedAt: 1 }]);
  const ok = await handleRequest(post({ action: "update", id: "n1", title: "new" }), notes);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.note.title, "new");
  assert.equal(body.note.body, "b", "an omitted body is kept");

  const missing = await handleRequest(post({ action: "update", id: "nope", title: "x" }), notes);
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, "note not found");

  const noId = await handleRequest(post({ action: "update", title: "x" }), notes);
  assert.equal(noId.status, 400);

  const noPatch = await handleRequest(post({ action: "update", id: "n1" }), notes);
  assert.equal(noPatch.status, 400);
});

test("delete removes one note and reports a missing id", async () => {
  const notes = fakeNotes([{ id: "n1", title: "t", body: "", createdAt: 1, updatedAt: 1 }]);
  const ok = await handleRequest(post({ action: "delete", id: "n1" }), notes);
  assert.equal(ok.status, 200);
  assert.equal(notes.rows.length, 0);

  const again = await handleRequest(post({ action: "delete", id: "n1" }), notes);
  assert.equal(again.status, 404);

  const noId = await handleRequest(post({ action: "delete" }), notes);
  assert.equal(noId.status, 400);
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
