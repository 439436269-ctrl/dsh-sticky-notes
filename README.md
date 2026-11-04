# dsh-sticky-notes

A tiled sticky-note board in the DeepSeek Harness sidebar, plus four tools so the
assistant works the same notes.

- **Sidebar entry** — a note glyph in the left rail. Clicking it opens the board in
  the main column.
- **Tiled board** — one card per note. The density control pins the grid to 2 / 3 / 4
  / 5 per row, or lets it fill the width automatically (the choice is remembered).
- **Colours** — seven accents (plain, amber, rose, mint, sky, violet, slate). A card,
  its border and its dot share one accent; the toolbar filters by colour.
- **Pin** — pinned notes stay on top and carry a small pin mark.
- **Trash** — deleting moves a note to the trash tab, where it can be restored,
  deleted for good, or emptied all at once. The toast carries an undo.
- **Editor** — click a card for a dialog with title, body, colour swatches, pin toggle,
  character count, copy, duplicate, archive/restore and permanent delete. Typing saves
  itself ~0.55 s after the last keystroke.
- **Search, sort, export** — text search over title and body, sort by recently updated /
  created / title, and one-click Markdown export of the whole board.
- **Shortcuts** — `Ctrl/Cmd+N` new note, `Ctrl/Cmd+F` focus search, `Escape` close.
- **Durable storage** — notes live in the plugin's `sticky_notes` storage domain under
  `$DSH_HOME/storages`, not in `localStorage`, so they survive a port change, a browser
  switch and a desktop-app restart.
- **Assistant tools** — `note_create`, `note_list`, `note_update`, `note_delete`. Ask
  “记一条：明天 10 点交周报，放琥珀色” and the card appears on the board.

## Install

```sh
dsh plugin add @vfvrpq/dsh-sticky-notes      # from npm
dsh plugin add /path/to/dsh-sticky-notes     # from a checkout, while developing
```

The bundle patch inserts one row (`sticky-notes`); the `dsh.client` block makes the web app
load `lib/client.js` as the browser half. A directory install needs no restart of the app —
the host reloads the row — but an already-open tab only picks up the bundle on its next load.

```sh
dsh --profile <name> --dump-config | grep sticky-notes   # the row is mounted
```

## Tools

| Tool | Parameters | What it does |
|---|---|---|
| `note_create` | `body`, `title?`, `color?`, `pinned?` | Create a note; the first body line becomes the title when omitted |
| `note_list` | `query?`, `color?`, `pinned?`, `includeArchived?`, `sort?` | List notes with the board's filters; the trash is hidden unless asked for |
| `note_update` | `id`, `title?`, `body?`, `color?`, `pinned?`, `archived?` | Patch one note; `archived: false` restores it |
| `note_delete` | `id`, `permanent?` | Move to the trash, or erase when `permanent: true` |

All four answer with one text block. Ids look like `note-<base36 time>-<random>`.

## HTTP surface

The board talks to one authenticated route, mounted under `/api` so the connection
service applies its Host/Origin fence and browser-session check first:

```
GET  /api/dsh-notes                 -> { ok, notes: [...] }            (trash included)
POST /api/dsh-notes { action: ... } -> { ok, note?, notes: [...] }
       create      { title?, body, color?, pinned? }
       update      { id, title?, body?, color?, pinned?, archivedAt? }
       archive     { id }        (alias: delete)
       restore     { id }
       purge       { id }
       duplicate   { id }
       clear-trash { }
```

The route path is published into the served page as
`globalThis.__DSH_STICKY_NOTES_CONFIG__ = { routePath }`, so the browser half never hard-codes it.

## Layout

```
lib/index.js    wiring: domain, route, tools, page injection
lib/config.js   route path, domain name, limits
lib/palette.js  colour ids shared with the board
lib/notes.js    pure shaping/patching/filtering/ordering (no runtime imports)
lib/domain.js   storage domain + repository (archive, restore, purge, duplicate)
lib/route.js    the /api/dsh-notes handler
lib/tools.js    the four tool specs
lib/client.js   browser half: sidebar entry, tiled board, editor dialog, dictionaries, styles
locale/*.json   meta.title / meta.description for the plugin list
```

## Limits

- One body is capped at 20,000 characters, a title at 200; longer text is truncated, not refused.
- No folders, tags or cross-device sync beyond the Host that owns the storage domain.
- Card order is by pin and then the chosen sort key; there is no drag-to-reorder.

## Tests

```sh
node --test test/*.test.js
```

`notes.test.js` covers the pure shaping, colour, pin, trash and ordering rules,
`route.test.js` every HTTP branch, `client.test.js` the bundle's registrations and its
filter/sort copy, and `adapter.test.js` mounts the real `lib/` against stub Harness
packages to prove `apply()` wires the domain, route, tools and disposal together.

A real browser pass needs a web host: boot one against an isolated profile, then drive it.

```sh
dsh --profile <name> --no-open --port 0      # prints http://127.0.0.1:<port>/?token=…
node scripts/e2e-notes.mjs --base http://127.0.0.1:<port> --token <token>
```

It creates a coloured pinned note through the UI, switches the grid to three per row,
searches, archives and restores through the trash, and fails unless colour, pin and
content survive a reload. Evidence from the shipped run is in `VERIFY.md`.

## Licence

MIT.
