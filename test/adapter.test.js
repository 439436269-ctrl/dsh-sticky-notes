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

test("the tools and the route share one store end to end", async () => {
  const { module, root } = await mountHostEntry();
  try {
    const { ctx, domain, route, tools } = fakeContext();
    module.apply(ctx);
    const byName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));

    const created = await byName.note_create.execute({ body: "买牛奶\n再买鸡蛋" });
    assert.match(created.text, /Created sticky note note-/);

    // The HTTP route the panel uses sees the note the tool created.
    const listed = await route.current.fetch(new Request("http://x" + ROUTE_PATH));
    assert.equal(listed.status, 200);
    const body = await listed.json();
    assert.equal(body.notes.length, 1);
    assert.equal(body.notes[0].title, "买牛奶");
    const id = body.notes[0].id;

    // A panel-style POST updates it, and note_list reads the new value back.
    const updated = await route.current.fetch(
      new Request("http://x" + ROUTE_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update", id, title: "购物清单", body: "牛奶 + 鸡蛋" })
      })
    );
    assert.equal(updated.status, 200);
    assert.equal((await updated.json()).note.title, "购物清单");

    const listText = (await byName.note_list.execute({})).text;
    assert.match(listText, /1 sticky note/);
    assert.match(listText, /购物清单/);

    const filtered = await byName.note_list.execute({ query: "鸡蛋" });
    assert.match(filtered.text, /1 sticky note/);
    const none = await byName.note_list.execute({ query: "面包" });
    assert.match(none.text, /No sticky note matches/);

    const deleted = await byName.note_delete.execute({ id });
    assert.match(deleted.text, /Deleted sticky note/);
    assert.match((await byName.note_list.execute({})).text, /no sticky notes yet/i);
    assert.equal(domain.closed, 0);
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
    await assert.rejects(() => byName.note_update.execute({ id: "x" }), /pass a title, a body, or both/);
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
