# Verification record — @vfvrpq/dsh-sticky-notes

## 0.2.0 — tiled colour board (2026-11-04)

Published coordinates:

- npm `@vfvrpq/dsh-sticky-notes@0.2.0` — `dist-tags.latest = 0.2.0`, tarball sha1
  `fb6ce7b69d553bab15b3506fbf32d0063a944b0a` (identical to the local `npm pack`, 17 files).
- repository `github.com/439436269-ctrl/dsh-sticky-notes`, `main` `ee262f9`, tag `v0.2.0`,
  CI `ci` success.
- the published tarball installed into a clean profile (`dsh plugin --profile rescue add
  @vfvrpq/dsh-sticky-notes@0.2.0`) mounts the row, and `scripts/smoke-installed.mjs` against a
  host booted from it reports
  `{"entries":1,"panelCount":1,"density":1,"swatches":7,"api":{"status":200,"ok":true},"errors":[]}`
  — one sidebar entry, the board mounted, the density control present, all seven swatches.

### L1 — 33 tests

```
node --test test/*.test.js
# tests 33   pass 33   fail 0
```

| file | what it proves |
|---|---|
| `test/notes.test.js` | colour normalization, title derivation, clamps, patch semantics (omitted field kept, emptied title re-derived, `archivedAt: null` restores), legacy records normalized on read, pinned-first ordering for all three sort keys, view/colour/text filters, active/pinned/trash counts |
| `test/route.test.js` | GET returns the trash too; create carries colour and pin; update rejects a missing id, a missing patch and an unknown note; archive / restore / purge walk the trash; `delete` aliases archive; duplicate copies colour; clear-trash reports how many went; 400/404/413/500 branches |
| `test/client.test.js` | bundle id equals the package name, only `react` is required, the bundle palette equals the host's `COLOR_IDS`, every colour has an accent, densities and sort keys are the documented ones, board and sidebar entry share one id, dictionary/style disposal |
| `test/adapter.test.js` | the real `lib/` mounted against stub `@deepseek-ai/*` packages: route, four tools with their new parameters, `__DSH_STICKY_NOTES_CONFIG__`, colour/pin/trash through tool → route → tool, duplicate and clear-trash, disposal |

### L3 — board end to end

Isolated profile (`$TEMP/dsh-sticky-e2e`, `node_modules` junctioned to the desktop profile, its
own `DSH_HOME`, empty notes store) booted with `dsh --profile _notes2e2e --no-open --port 0`,
then `node scripts/e2e-notes.mjs --base … --token …` (Playwright, system Edge, 1440×900):

```json
{"saveState":"saved","saveText":"已保存","cardColor":"mint","cardPinned":"true",
 "cardTitle":"项目周报","cardCount":4,"density":"3","columns":3,
 "searchTitles":["项目周报"],"emptyText":"没有符合条件的便签。",
 "toast":"已移到回收站\n撤销","afterArchive":3,"trashCards":1,"trashAfterRestore":0,
 "allAfterRestore":4,
 "afterReloadTitles":["项目周报","买点东西","待办","灵感"],"afterReloadPinned":"true"}
```

Through the UI only: the editor saves a note's colour and pin (state `saved`), the board shows
four cards, the density control produces exactly three computed grid tracks, search narrows to
one card and a miss shows the empty state, archiving drops the board to three cards with one in
the trash, restoring brings it back to four, and after a page reload every title plus the pin
come back from the host store. The plugin produced no console errors; the only ambient page
error is another plugin's `cannot get property "remote.session" without inject`, emitted at load
before the board opens.

Screenshots: `scripts/shots/10-board-empty.png`, `11-board.png` (four colours),
`12-grid-3.png` (three per row, pin mark), `13-trash.png` (trash + toast), `14-after-reload.png`.

### Live host contract

`cordis_inspect_query` (host, provider `Tool`) after the reload lists `note_create` with
`color` (enum of the seven ids) and `pinned`, `note_list` with `includeArchived` and `sort`,
`note_update` with `archived`, and `note_delete` with `permanent` — the running Host serves the
0.2.0 tool surface, not the previous build.

## 0.1.0 — the first release (2026-11-03)

DSH Desktop profile `desktop`, Windows 11, Node 24.22.0.

Published coordinates: npm `@vfvrpq/dsh-sticky-notes@0.1.0` — `dist-tags.latest = 0.1.0`,
tarball sha1 `ce980c977aac1041189b0941003d5294c8568b64` (16 files); repository
`github.com/439436269-ctrl/dsh-sticky-notes` pushed through the Git Data API while
`github.com:443` was unreachable (tree `3237cf7`, commit `4525adb`), CI success.

## L1 — unit and adapter tests

```
node --test test/*.test.js
# tests 24   pass 24   fail 0
```

The 0.1.0 suite covered the pure shaping rules, every HTTP branch, the bundle's registrations,
and the adapter layer that mounts the real `lib/` against stub Harness packages.

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

## L3 — headless browser end to end (0.1.0 panel)

`node scripts/e2e-notes.mjs` (before the board rewrite): the sidebar entry rendered as a native
row (252×36, order 40), the panel filled the main column (1160×900), typing reached *已保存*,
and after a page reload the title and body came back. Screenshots: `01-home.png`, `02-panel.png`,
`03-saved.png`, `04-after-reload.png`.

The surface followed the theme: `--dsw-alias-bg-layer-1` resolved to `rgba(248,248,245,.94)`
with `rgb(23,24,22)` text in the light run and to `rgba(30,27,25,.94)` with `rgb(244,241,232)`
text in a dark run.

## Real desktop app

- `plugin_manager install_bundle` reported `application: applied` for
  `@vfvrpq/dsh-sticky-notes 0.1.0` (dependency `link:D:/codes/dsh-sticky-notes`, bundle appended
  to `dsh.profile.bundles`).
- The four tools became callable in the running session immediately:
  `note_create` → `Created sticky note note-mw0tzz4v-kha50a (欢迎使用便签)`, and `note_list`
  read it back with its title and body.
- Live client slots (`cordis_inspect_query`, platform `client`) list `sticky-notes`
  (order 40, active) among `sidebar.panellist` occupants and `sticky-notes` among `main`
  occupants, i.e. the browser half registered in the real window's plugin graph.

## Not verified here

- Community-directory submission (`awesome-dsh-plugin`): its gate requires the repository to be
  at least 1 day old, and this one was created on 2026-11-04, so the PR is opened on or after
  2026-11-05. The entry text is prepared (`category: ui`).
- The user's own window after an upgrade: the browser half is served per page load, so an open
  tab keeps the previous bundle until it is refreshed.
- The unscoped name `dsh-sticky-notes` is taken on npm by an unrelated plugin
  (`zmm863-commits/dsh-sticky-notes@1.0.3`), which is why this package ships scoped.
