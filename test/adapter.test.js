import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { ROUTE_PATH } from "../lib/config.js";

const PACKAGE_ROOT = new URL("..", import.meta.url);

/**
 * Copy the real `lib/` into a temporary tree with stub Harness packages, so the
 * host entry imports without the DSH runtime. This is the adapter layer: it
 * proves `apply()` wires the domain, the route, the tools and the page
 * injection, which pure unit tests cannot.
 * @returns the module namespace and the temp root.
 */
async function mountHostEntry() {
  const root = await mkdtemp(join(tmpdir(), "sticky-notes-adapter-"));
  await cp(new URL("lib", PACKAGE_ROOT), join(root, "lib"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ name: "@vfvrpq/dsh-sticky-notes", type: "module" }));

  const storageDir = join(root, "node_modules", "@deepseek-ai", "dsh-storage-domain");
  await mkdir(storageDir, { recursive: true });
  await writeFile(
    join(storageDir, "package.json"),
    JSON.stringify({ name: "@deepseek-ai/dsh-storage-domain", version: "0.0.0", type: "module", main: "index.js" })
  );
  await writeFile(
    join(storageDir, "index.js"),
    [
      "export function defineDomain(spec) { return spec; }",
      "export function domainTable(schema) { return { valueSchema: schema }; }",
      ""
    ].join("\n")
  );

  const toolsDir = join(root, "node_modules", "@deepseek-ai", "dsh-tools");
  await mkdir(toolsDir, { recursive: true });
  await writeFile(
    join(toolsDir, "package.json"),
    JSON.stringify({ name: "@deepseek-ai/dsh-tools", version: "0.0.0", type: "module", main: "index.js" })
  );
  await writeFile(join(toolsDir, "index.js"), ['export function defineTool(spec) { return spec; }', ""].join("\n"));

  const module = await import(pathToFileURL(join(root, "lib", "index.js")).href);
  return { module, root };
}

/** An in-memory KvTable matching the storage-domain contract. */
function fakeDomain() {
  const rows = new Map();
  return {
    closed: 0,
    table() {
      return {
        get: (key) => rows.get(key),
        entries: () => rows.entries(),
        keys: () => rows.keys(),
        get size() {
          return rows.size;
        },
        put: async (key, value) => {
          rows.set(key, value);
        },
        delete: async (key) => rows.delete(key),
        update: async (key, fn) => {
          const next = fn(rows.get(key));
          rows.set(key, next);
          return next;
        }
      };
    },
    close: async function close() {
      this.closed += 1;
    }
  };
}

/** A host context that records what `apply()` mounted. */
function fakeContext() {
  const domain = fakeDomain();
  const route = { current: undefined };
  const tools = [];
  const effects = [];
  const handlers = [];
  const ctx = {
    domain,
    storageDomain: {
      open: async () => domain
    },
    connection: {
      fetch: {
        register: (definition) => {
          route.current = definition;
          return async () => {
            route.current = undefined;
          };
        }
      }
    },
    tools: {
      register: (definition) => {
        tools.push(definition);
        return () => {};
      }
    },
    effect: (factory, label) => {
      const cleanup = factory();
      effects.push({ label, cleanup: typeof cleanup === "function" ? cleanup : undefined });
    },
    on: (event, listener) => {
      assert.equal(event, "webserver/index-inject");
      handlers.push(listener);
    }
  };
  return { ctx, domain, route, tools, effects, handlers };
}

/** Run one action over the mounted route and return the parsed body. */
async function call(route, payload) {
  const init =
    payload === null
      ? undefined
      : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) };
  const response = await route.current.fetch(new Request("http://x" + ROUTE_PATH, init));
  return { status: response.status, body: await response.json() };
}

test("the host entry exposes name, inject and apply", async () => {
  const { module, root } = await mountHostEntry();
  try {
    assert.equal(module.name, "sticky-notes");
    assert.deepEqual(module.inject, ["tools", "connection", "storageDomain"]);
    assert.equal(typeof module.apply, "function");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply registers the route, four tools, and publishes the path to the page", async () => {
  const { module, root } = await mountHostEntry();
  try {
    const { ctx, route, tools, effects, handlers } = fakeContext();
    module.apply(ctx);

    assert.equal(route.current.path, ROUTE_PATH);
    assert.deepEqual(route.current.methods, ["GET", "POST"]);
    assert.equal(route.current.requestBody, "buffered");

    assert.deepEqual(
      tools.map((tool) => tool.name),
      ["note_create", "note_list", "note_update", "note_delete"]
    );
    for (const tool of tools) {
      assert.equal(typeof tool.execute, "function");
      assert.equal(typeof tool.description, "string");
      assert.equal(tool.output.schema.properties.text.type, "string");
    }
    const createParams = tools[0].parameters;
    assert.ok(Array.isArray(createParams.color.enum) && createParams.color.enum.includes("amber"));
    assert.equal(createParams.pinned.type, "boolean");
    const listParams = tools[1].parameters;
    assert.equal(listParams.includeArchived.type, "boolean");
    assert.equal(tools[3].parameters.permanent.type, "boolean");

    assert.ok(effects.some((entry) => entry.label === "sticky-notes: notes route"));
    assert.ok(effects.some((entry) => entry.label === "sticky-notes: storage domain"));

    const injected = [];
    for (const handler of handlers) handler(injected);
    assert.equal(injected.length, 1);
    assert.equal(injected[0].kind, "global");
    assert.equal(injected[0].name, "__DSH_STICKY_NOTES_CONFIG__");
    assert.deepEqual(injected[0].value, { routePath: ROUTE_PATH });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("colours, pins, the trash and the tools agree end to end", async () => {
  const { module, root } = await mountHostEntry();
  try {
    const { ctx, domain, route, tools } = fakeContext();
    module.apply(ctx);
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    const created = await byName.note_create.execute({ body: "买牛奶\n再买鸡蛋", color: "mint", pinned: true });
    assert.match(created.text, /Created sticky note note-/);
    assert.match(created.text, /colour=mint pinned=true/);

    // The HTTP route the board uses sees colour and pin.
    const listed = await call(route, null);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.notes.length, 1);
    assert.equal(listed.body.notes[0].title, "买牛奶");
    assert.equal(listed.body.notes[0].color, "mint");
    assert.equal(listed.body.notes[0].pinned, true);
    const id = listed.body.notes[0].id;

    // Board-style patch: rename and recolour.
    const updated = await call(route, { action: "update", id, title: "购物清单", body: "牛奶 + 鸡蛋", color: "rose" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.note.title, "购物清单");
    assert.equal(updated.body.note.color, "rose");

    // Tools filter like the board.
    assert.match((await byName.note_list.execute({ query: "鸡蛋" })).text, /1 sticky note/);
    assert.match((await byName.note_list.execute({ query: "面包" })).text, /no matching/);
    assert.match((await byName.note_list.execute({ color: "rose" })).text, /1 sticky note/);
    assert.match((await byName.note_list.execute({ color: "sky" })).text, /no matching/);
    assert.match((await byName.note_list.execute({ pinned: true })).text, /1 sticky note/);

    // Delete is a soft delete; the board still receives the trashed row.
    const deleted = await byName.note_delete.execute({ id });
    assert.match(deleted.text, /moved sticky note .* to the trash/i);
    assert.match((await byName.note_list.execute({})).text, /no matching active sticky notes/);
    assert.match((await byName.note_list.execute({ includeArchived: true })).text, /trash/);
    const trashed = await call(route, null);
    assert.equal(trashed.body.notes[0].archivedAt > 0, true);

    // Restore through the tool, then purge for good.
    const restored = await byName.note_update.execute({ id, archived: false, pinned: false });
    assert.match(restored.text, /archived=false/);
    assert.match((await byName.note_list.execute({})).text, /1 sticky note/);

    const purged = await byName.note_delete.execute({ id, permanent: true });
    assert.match(purged.text, /Permanently deleted/);
    assert.match((await byName.note_list.execute({})).text, /no matching active sticky notes/);
    assert.equal(domain.closed, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the board can duplicate a note and empty the trash", async () => {
  const { module, root } = await mountHostEntry();
  try {
    const { ctx, route } = fakeContext();
    module.apply(ctx);

    const first = await call(route, { action: "create", title: "原文", body: "内容", color: "sky" });
    const id = first.body.note.id;
    const copy = await call(route, { action: "duplicate", id });
    assert.equal(copy.status, 200);
    assert.equal(copy.body.note.title, "原文 (copy)");
    assert.equal(copy.body.note.color, "sky");

    await call(route, { action: "archive", id });
    assert.equal((await call(route, null)).body.notes.filter((entry) => entry.archivedAt !== null).length, 1);
    const cleared = await call(route, { action: "clear-trash" });
    assert.equal(cleared.body.removed, 1);
    assert.equal((await call(route, null)).body.notes.length, 1, "only the copy survives");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("tool argument mistakes fail with an actionable message", async () => {
  const { module, root } = await mountHostEntry();
  try {
    const { ctx, tools } = fakeContext();
    module.apply(ctx);
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    await assert.rejects(() => byName.note_create.execute({ body: "   " }), /body must not be empty/);
    await assert.rejects(() => byName.note_update.execute({ id: "nope", title: "x" }), /no sticky note with id nope/);
    await assert.rejects(() => byName.note_update.execute({ id: "x" }), /pass a title, body, colour/);
    await assert.rejects(() => byName.note_delete.execute({}), /id is required/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("disposing the plugin closes the domain and removes the route", async () => {
  const { module, root } = await mountHostEntry();
  try {
    const { ctx, domain, route, effects } = fakeContext();
    module.apply(ctx);
    for (const entry of effects) await entry.cleanup?.();
    assert.equal(domain.closed, 1);
    assert.equal(route.current, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the manifest ships the client half and the display resources", async () => {
  const manifest = JSON.parse(await readFile(new URL("package.json", PACKAGE_ROOT), "utf8"));
  assert.equal(manifest.name, "@vfvrpq/dsh-sticky-notes");
  assert.equal(manifest.dsh.bundle.patch, "./cordis.patch.yml");
  assert.equal(manifest.dsh.client.platform, "web");
  assert.equal(manifest.exports["./client"], "./lib/client.js");
  assert.equal(manifest.exports["./icon"], "./icon.svg");
  assert.equal(manifest.icon === undefined, true, "the icon is exported, not a top-level path");
  assert.ok(manifest.files.includes("lib/**/*.js"));
  assert.ok(manifest.files.includes("locale/*.json"));
  assert.ok(manifest.files.includes("icon.svg"));
  assert.ok(existsSync(new URL("cordis.patch.yml", PACKAGE_ROOT)));
  assert.ok(existsSync(new URL("icon.svg", PACKAGE_ROOT)));
  for (const locale of ["en", "zh"]) {
    const dict = JSON.parse(await readFile(new URL(`locale/${locale}.json`, PACKAGE_ROOT), "utf8"));
    assert.equal(typeof dict.meta.title, "string");
    assert.equal(typeof dict.meta.description, "string");
  }
});
