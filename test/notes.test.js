import assert from "node:assert/strict";
import { test } from "node:test";
import { applyPatch, clip, normalizeNote, sortNotes, titleFromBody, UNTITLED } from "../lib/notes.js";
import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH } from "../lib/config.js";

test("clip and titleFromBody trim to the documented budgets", () => {
  assert.equal(clip("abcdef", 3), "abc");
  assert.equal(clip(undefined, 3), "");
  assert.equal(clip("abc", 10), "abc");
  assert.equal(titleFromBody("\n\n  第一行标题  \n第二行"), "第一行标题");
  assert.equal(titleFromBody("   "), UNTITLED);
  assert.equal(titleFromBody("x".repeat(100)).length, 60);
});

test("normalizeNote derives a title and clamps the body", () => {
  const note = normalizeNote({ body: "  买牛奶\n再买鸡蛋 " }, 1000);
  assert.equal(note.title, "买牛奶");
  assert.equal(note.body, "  买牛奶\n再买鸡蛋 ");
  assert.equal(note.createdAt, 1000);
  assert.equal(note.updatedAt, 1000);
  assert.match(note.id, /^note-/);

  const titled = normalizeNote({ title: "  行程  ", body: "x" }, 1);
  assert.equal(titled.title, "行程");

  const long = normalizeNote({ body: "y".repeat(MAX_BODY_LENGTH + 50) }, 2);
  assert.equal(long.body.length, MAX_BODY_LENGTH);
  assert.equal(normalizeNote({ title: "t".repeat(MAX_TITLE_LENGTH + 5), body: "" }, 3).title.length, MAX_TITLE_LENGTH);
  assert.equal(normalizeNote({}, 4).title, UNTITLED, "an empty note still gets a title");
});

test("applyPatch keeps omitted fields and re-derives an emptied title", () => {
  const base = { id: "n1", title: "old", body: "line one\nline two", createdAt: 1, updatedAt: 1 };
  const patched = applyPatch(base, { body: "新正文" }, 5);
  assert.equal(patched.title, "old", "an omitted title is kept");
  assert.equal(patched.body, "新正文");
  assert.equal(patched.updatedAt, 5);

  const cleared = applyPatch(base, { title: "   " }, 6);
  assert.equal(cleared.title, "line one", "an emptied title falls back to the body");
  assert.equal(cleared.createdAt, 1);
  assert.equal(cleared.id, "n1");
});

test("sortNotes puts the newest first and ties break by id", () => {
  const sorted = sortNotes([
    { id: "b", updatedAt: 2 },
    { id: "a", updatedAt: 2 },
    { id: "c", updatedAt: 9 }
  ]);
  assert.deepEqual(sorted.map((note) => note.id), ["c", "a", "b"]);
  const original = [{ id: "b", updatedAt: 1 }, { id: "a", updatedAt: 2 }];
  sortNotes(original);
  assert.deepEqual(original.map((note) => note.id), ["b", "a"], "the input array is not mutated");
});
