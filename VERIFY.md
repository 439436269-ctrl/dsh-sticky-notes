# Verification record — dsh-sticky-notes 0.1.0

DSH Desktop profile `desktop`, Windows 11, Node 24.22.0. Date: 2026-11-03.

## L1 — unit and adapter tests

```
node --test test/*.test.js
# tests 24   pass 24   fail 0
```

| file | what it proves |
|---|---|
| `test/notes.test.js` | title derivation, body/title clamps, patch semantics (omitted field kept, emptied title re-derived), stable newest-first order, input array not mutated |
| `test/route.test.js` | GET list, create/update/delete branches, 400 for unknown action / bad JSON / missing id / missing patch, 404 for a missing note, 413 for an oversized body, 500 with the message kept, route definition shape |
| `test/client.test.js` | bundle id equals the package name, only `react` is required, the route path mirrors the host constant, one `main` registration and one `sidebar.panellist` registration share an id, dictionaries and styles are disposed |
| `test/adapter.test.js` | the real `lib/` mounted against stub `@deepseek-ai/*` packages: `apply()` opens the domain, registers `GET|POST /api/dsh-notes`, registers the four tools, publishes `__DSH_STICKY_NOTES_CONFIG__`, and one end-to-end flow runs tool → route → tool; disposal closes the domain and removes the route |

## L2 — real host mount (isolated profile)

A temporary profile `_notes2e2e` was copied from the desktop profile (`package.json`,
`cordis.patch.yml`, `cordis.yml`, `pnpm-workspace.yaml`) with `node_modules` junctioned to the
desktop profile and `DSH_HOME` pointed at a scratch directory, so the run could not touch the
user's notes:

```
dsh --profile _notes2e2e --dump-config | grep -A1 "sticky-notes"
# == dsh-sticky-notes
# - id: sticky-notes
#   name: dsh-sticky-notes
```

`dsh --profile _notes2e2e --no-open --port 0` booted the web app with no failed fiber.

## L3 — headless browser end to end

`node scripts/e2e-notes.mjs --base http://127.0.0.1:<port> --token <token>` (Playwright, system
Edge, 1440×900). Result (`scripts/shots/result.json`):

```
entry:   {"label":"便签","aria":"便签","box":{"x":14,"y":200,"width":252,"height":36}}
panel:   {"x":280,"y":0,"width":1160,"height":900}   (the whole main column)
save:    state=saved text=已保存
titles:  ["便签端到端 e2e-mw0ukk3m"]
reload:  titles=["便签端到端 e2e-mw0ukk3m"]  body="从面板写入的第一段。\n第二行用来确认换行。"
errors:  []            (no error mentioning this plugin)
ambient: pageerror: cannot get property "remote.session" without inject
```

What that proves, in the layer the user actually sees:

1. the sidebar entry renders as a native row (252×36, order 40, below 上下文洞察) and is
   labelled 便签 from the localized slot label;
2. clicking it opens the panel **in the main column**, not an overlay;
3. typing into the editor reaches *已保存* (debounced POST succeeds);
4. after a **page reload** the title and the body come back — i.e. the note came from the host
   storage domain, not from component state;
5. the surface follows the theme: `--dsw-alias-bg-layer-1` resolved to
   `rgba(248,248,245,.94)` with `rgb(23,24,22)` text in the light run and to
   `rgba(30,27,25,.94)` with `rgb(244,241,232)` text in a dark run.

Screenshots: `scripts/shots/01-home.png` (entry in the rail), `02-panel.png` (fresh panel),
`03-saved.png` (note saved), `04-after-reload.png` (persisted after reload).

The `remote.session` page error is emitted at load by another installed plugin (this profile has
no API-key-free path to a session); it appears before the panel is opened, mentions no part of
this plugin, and did not prevent any of the checks above.

## Real desktop app

- `plugin_manager install_bundle` reported `application: applied` for `dsh-sticky-notes 0.1.0`
  (dependency `link:D:/codes/dsh-sticky-notes`, bundle appended to `dsh.profile.bundles`).
- The four tools became callable in the running session immediately:
  `note_create` → `Created sticky note note-mw0tzz4v-kha50a (欢迎使用便签)`, and `note_list`
  read it back with its title and body.
- Live client slots (`cordis_inspect_query`, platform `client`) list `sticky-notes`
  (order 40, active) among `sidebar.panellist` occupants and `sticky-notes` among `main`
  occupants, i.e. the browser half registered in the real window's plugin graph.

## Not verified here

- What the user sees in **their** window after install: the browser half is served per page load,
  so the existing tab needs a refresh (or the next app start) to pick up this bundle version.
- Publishing (npm / GitHub / market) — the package name `dsh-sticky-notes` is already taken on
  npm by an unrelated plugin (`zmm863-commits/dsh-sticky-notes` 1.0.3), so publishing requires a
  scoped or a different name first.
