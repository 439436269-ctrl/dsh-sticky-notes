import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyPatch,
  clip,
  countNotes,
  filterNotes,
  isArchived,
  matchesQuery,
  normalizeNote,
  normalizeStored,
  sortNotes,
  titleFromBody,
  UNTITLED
} from "../lib/notes.js";
import { MAX_BODY_LENGTH, MAX_TITLE_LENGTH } from "../lib/config.js";
import { COLOR_IDS, DEFAULT_COLOR, normalizeColor } from "../lib/palette.js";

/** A note fixture with sensible defaults. */
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

test("clip and titleFromBody trim to the documented budgets", () => {
  assert.equal(clip("abcdef", 3), "abc");
  assert.equal(clip(undefined, 3), "");
  assert.equal(titleFromBody("\n\n  第一行标题  \n第二行"), "第一行标题");
  assert.equal(titleFromBody("   "), UNTITLED);
  assert.equal(titleFromBody("x".repeat(100)).length, 60);
});

test("the palette falls back to plain for unknown colours", () => {
  assert.equal(normalizeColor("amber"), "amber");
  assert.equal(normalizeColor("chartreuse"), DEFAULT_COLOR);
  assert.equal(normalizeColor(undefined), DEFAULT_COLOR);
  assert.ok(COLOR_IDS.includes(DEFAULT_COLOR));
});

test("normalizeNote derives a title, keeps colour and pin", () => {
  const created = normalizeNote({ body: "  买牛奶\n再买鸡蛋 ", color: "mint", pinned: true }, 1000);
  assert.equal(created.title, "买牛奶");
  assert.equal(created.body, "  买牛奶\n再买鸡蛋 ");
  assert.equal(created.color, "mint");
  assert.equal(created.pinned, true);
  assert.equal(created.archivedAt, null);
  assert.equal(created.createdAt, 1000);
  assert.equal(created.id.startsWith("note-"), true);

  const plain = normalizeNote({ body: "x" }, 2);
  assert.equal(plain.color, DEFAULT_COLOR);
  assert.equal(plain.pinned, false);

  const long = normalizeNote({ body: "y".repeat(MAX_BODY_LENGTH + 50) }, 3);
  assert.equal(long.body.length, MAX_BODY_LENGTH);
  assert.equal(normalizeNote({ title: "t".repeat(MAX_TITLE_LENGTH + 5), body: "" }, 4).title.length, MAX_TITLE_LENGTH);
  assert.equal(normalizeNote({}, 5).title, UNTITLED);
});

test("normalizeStored fills fields an older build never wrote", () => {
  const stored = normalizeStored({ id: "a", title: "old", body: "b", createdAt: 7, updatedAt: 9 }, 100);
  assert.equal(stored.color, DEFAULT_COLOR);
  assert.equal(stored.pinned, false);
  assert.equal(stored.archivedAt, null);
  assert.equal(stored.createdAt, 7);

  const legacy = normalizeStored({ id: "b", title: "x", body: "", createdAt: 3 }, 50);
  assert.equal(legacy.updatedAt, 3, "updatedAt falls back to createdAt");
  assert.equal(isArchived(legacy), false);
});

test("applyPatch keeps omitted fields, handles colour, pin and the trash", () => {
  const base = note({ title: "old", body: "line one\nline two" });
  const patched = applyPatch(base, { body: "新正文" }, 5);
  assert.equal(patched.title, "old");
  assert.equal(patched.body, "新正文");
  assert.equal(patched.updatedAt, 5);

  assert.equal(applyPatch(base, { color: "sky" }, 6).color, "sky");
  assert.equal(applyPatch(base, { color: "nope" }, 6).color, DEFAULT_COLOR);
  assert.equal(applyPatch(base, { pinned: true }, 6).pinned, true);
  assert.equal(isArchived(applyPatch(base, { archivedAt: 42 }, 6)), true);
  assert.equal(isArchived(applyPatch(base, { archivedAt: null }, 6)), false);

  assert.equal(applyPatch(base, { title: "   " }, 7).title, "line one");
  assert.equal(applyPatch(base, {}, 8).createdAt, 1);
});

test("sortNotes puts pinned notes first, then the chosen key", () => {
  const notes = [
    note({ id: "a", title: "b", updatedAt: 3, createdAt: 1 }),
    note({ id: "b", title: "a", updatedAt: 1, createdAt: 3 }),
    note({ id: "c", title: "c", updatedAt: 2, createdAt: 2, pinned: true })
  ];
  assert.deepEqual(sortNotes(notes, "updated").map((entry) => entry.id), ["c", "a", "b"]);
  assert.deepEqual(sortNotes(notes, "created").map((entry) => entry.id), ["c", "b", "a"]);
  assert.deepEqual(sortNotes(notes, "title").map((entry) => entry.id), ["c", "b", "a"]);

  const archived = note({ id: "z", updatedAt: 99, pinned: true, archivedAt: 5 });
  assert.deepEqual(
    sortNotes([...notes, archived], "updated").map((entry) => entry.id),
    ["c", "z", "a", "b"],
    "a trashed note loses its pin weight but keeps its update order"
  );
  assert.deepEqual(notes.map((entry) => entry.id), ["a", "b", "c"], "the input array is not mutated");
});

test("matchesQuery searches title and body case-insensitively", () => {
  const target = note({ title: "Shopping", body: "milk and eggs" });
  assert.equal(matchesQuery(target, ""), true);
  assert.equal(matchesQuery(target, "  "), true);
  assert.equal(matchesQuery(target, "MILK"), true);
  assert.equal(matchesQuery(target, "shop"), true);
  assert.equal(matchesQuery(target, "bread"), false);
});

test("filterNotes applies view, colour and text together", () => {
  const notes = [
    note({ id: "a", title: "milk", color: "mint" }),
    note({ id: "b", title: "eggs", color: "rose", pinned: true }),
    note({ id: "c", title: "trash", color: "mint", archivedAt: 9 }),
    note({ id: "d", title: "milk note", color: "rose" })
  ];
  assert.deepEqual(filterNotes(notes).map((entry) => entry.id), ["a", "b", "d"]);
  assert.deepEqual(filterNotes(notes, { view: "trash" }).map((entry) => entry.id), ["c"]);
  assert.deepEqual(filterNotes(notes, { view: "pinned" }).map((entry) => entry.id), ["b"]);
  assert.deepEqual(filterNotes(notes, { color: "mint" }).map((entry) => entry.id), ["a"]);
  assert.deepEqual(filterNotes(notes, { query: "milk" }).map((entry) => entry.id), ["a", "d"]);
  assert.deepEqual(filterNotes(notes, { view: "trash", color: "rose" }), []);
});

test("countNotes separates active, pinned and trash", () => {
  const counts = countNotes([
    note({ id: "a" }),
    note({ id: "b", pinned: true }),
    note({ id: "c", archivedAt: 3, pinned: true })
  ]);
  assert.deepEqual(counts, { total: 3, active: 2, pinned: 1, trash: 1 });
});
