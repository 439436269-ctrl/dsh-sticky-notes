import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { ROUTE_PATH } from "../lib/config.js";

/**
 * Load the browser bundle the way the web shell does: register a factory, then
 * materialize it with a module-table `require`.
 * @returns the bundle exports.
 */
async function loadBundle() {
  const source = await readFile(new URL("../lib/client.js", import.meta.url), "utf8");
  const registrations = [];
  globalThis.window = {
    __ModuleLoader__: {
      load: (registration) => registrations.push(registration)
    }
  };
  // The bundle is a classic script, not an ES module; evaluate it directly so
  // the registration facade it targets is the one installed above.
  new Function(source)();
  assert.equal(registrations.length, 1);
  const registration = registrations[0];
  assert.equal(registration.id, "@vfvrpq/dsh-sticky-notes");
  const exports = registration.factory((specifier) => {
    if (specifier === "react") {
      return {
        createElement: () => null,
        useState: () => [undefined, () => {}],
        useEffect: () => {},
        useRef: () => ({ current: null }),
        useCallback: (fn) => fn
      };
    }
    throw new Error(`unexpected module request ${specifier}`);
  });
  return exports;
}

/** A client context that records slot registrations and dictionaries. */
function fakeClientContext() {
  const slots = [];
  const dictionaries = [];
  const effects = [];
  const ctx = {
    effect: (factory, label) => {
      const cleanup = factory();
      effects.push({ label, cleanup: typeof cleanup === "function" ? cleanup : undefined });
    },
    locale: {
      bind: () => (key) => key,
      register: (namespace, value) => {
        dictionaries.push({ namespace, value });
        return () => {};
      }
    },
    slots: {
      inject: (name, factory) => {
        assert.equal(typeof factory, "function");
        const cleanup = factory();
        return typeof cleanup === "function" ? cleanup : () => {};
      },
      register: (definition, component) => {
        slots.push({ ...definition, component });
        return () => {};
      }
    }
  };
  return { ctx, slots, dictionaries, effects };
}

test("the bundle registers itself under the package name and requires only react", async () => {
  const exports = await loadBundle();
  assert.equal(typeof exports.apply, "function");
  assert.deepEqual(exports.inject, ["slots", "locale"]);
  assert.equal(exports.DEFAULT_ROUTE_PATH, ROUTE_PATH, "the bundle mirrors the host route path");
});

test("the route path comes from the injected boot config with a shipped default", async () => {
  const exports = await loadBundle();
  delete globalThis.__DSH_STICKY_NOTES_CONFIG__;
  assert.equal(exports.configuredRoutePath(), ROUTE_PATH);
  globalThis.__DSH_STICKY_NOTES_CONFIG__ = { routePath: "/api/custom-notes" };
  assert.equal(exports.configuredRoutePath(), "/api/custom-notes");
  globalThis.__DSH_STICKY_NOTES_CONFIG__ = { routePath: 42 };
  assert.equal(exports.configuredRoutePath(), ROUTE_PATH);
  delete globalThis.__DSH_STICKY_NOTES_CONFIG__;
});

test("previewOf collapses whitespace and shortens long bodies", async () => {
  const exports = await loadBundle();
  assert.equal(exports.previewOf("  a\n\n b  "), "a b");
  const long = "x".repeat(200);
  assert.equal(exports.previewOf(long).length, 97, "96 characters plus the ellipsis");
  assert.ok(exports.previewOf(long).endsWith("…"));
});

test("matchesNote searches title and body case-insensitively", async () => {
  const exports = await loadBundle();
  const note = { title: "Shopping", body: "milk and eggs" };
  assert.equal(exports.matchesNote(note, ""), true);
  assert.equal(exports.matchesNote(note, "  "), true);
  assert.equal(exports.matchesNote(note, "MILK"), true);
  assert.equal(exports.matchesNote(note, "shop"), true);
  assert.equal(exports.matchesNote(note, "bread"), false);
});

test("formatRelative labels recent and older timestamps", async () => {
  const exports = await loadBundle();
  const t = (key) => key;
  assert.equal(exports.formatRelative(Date.now(), t), "justNow");
  assert.equal(exports.formatRelative(Date.now() - 5 * 60000, t), "minutesAgo");
  assert.equal(exports.formatRelative(Date.now() - 3 * 3600000, t), "hoursAgo");
  assert.equal(exports.formatRelative(Date.now() - 2 * 86400000, t), "daysAgo");
  assert.equal(exports.formatRelative(0, t), "", "a missing timestamp renders nothing");
  assert.equal(exports.formatRelative(undefined, t), "");
});

test("apply registers the main panel and the sidebar entry under one id", async () => {
  const exports = await loadBundle();
  globalThis.__DSH_STICKY_NOTES_CONFIG__ = { routePath: "/api/custom-notes" };
  const { ctx, slots, dictionaries, effects } = fakeClientContext();
  exports.apply(ctx);
  delete globalThis.__DSH_STICKY_NOTES_CONFIG__;

  assert.equal(dictionaries.length, 1);
  assert.equal(dictionaries[0].namespace, "stickyNotes");
  assert.equal(typeof dictionaries[0].value.zh.panelTitle, "string");
  assert.equal(typeof dictionaries[0].value.en.panelTitle, "string");
  assert.notEqual(dictionaries[0].value.zh.panelTitle, dictionaries[0].value.en.panelTitle);

  assert.equal(slots.length, 2);
  const main = slots.find((slot) => slot.name === "main");
  const entry = slots.find((slot) => slot.name === "sidebar.panellist");
  assert.ok(main !== undefined, "the main panel is registered");
  assert.ok(entry !== undefined, "the sidebar entry is registered");
  assert.equal(main.key, entry.id, "the sidebar id addresses exactly this panel");
  assert.equal(entry.id, exports.PANEL_ID);
  assert.equal(main.locale, "stickyNotes");
  assert.equal(entry.locale, "stickyNotes");
  assert.equal(typeof entry.order, "number");
  assert.equal(entry.label(), "panelTitle", "the label is a thunk the shell re-reads");
  assert.equal(typeof main.component, "function");
  assert.equal(typeof entry.component, "function");
  // The icon is drawn from the owner's size, so it stays square at any rail width.
  assert.equal(entry.component({ size: 18, active: true }), null);
  assert.ok(effects.length >= 2, "styles and dictionaries are disposed with the plugin");
  for (const effect of effects) assert.equal(typeof effect.cleanup, "function");
});
