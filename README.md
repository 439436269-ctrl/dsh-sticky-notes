# dsh-sticky-notes

A sticky-note panel for the DeepSeek Harness sidebar, plus four tools so the assistant can
read and write the same notes.

- **Sidebar entry** — a note glyph in the left rail next to Plugins / Schedules. Clicking it
  opens the notes panel in the main column.
- **Notes panel** — searchable list on the left, title + body editor on the right. Edits save
  themselves ~0.6 s after you stop typing; the footer shows *Saving… / Saved*.
- **Durable storage** — notes live in the plugin's own storage domain
  (`sticky_notes`, table `notes`) under `$DSH_HOME/storages`, not in `localStorage`, so they
  survive a port change, a browser switch and a desktop-app restart.
- **Assistant tools** — `note_create`, `note_list`, `note_update`, `note_delete`. Ask
  “记一条：明天 10 点交周报” and the note shows up in the panel immediately.

## Install

```sh
dsh plugin add @vfvrpq/dsh-sticky-notes      # from npm
dsh plugin add /path/to/dsh-sticky-notes     # from a checkout, while developing
```

The bundle patch inserts one row (`sticky-notes`); the `dsh.client` block makes the web app
load `lib/client.js` as the browser half. No restart is needed for a directory install: the
host reloads the row, and a page refresh picks up the client bundle.

```sh
dsh --profile <name> --dump-config | grep sticky-notes   # the row is mounted
```

## Tools

| Tool | Parameters | What it does |
|---|---|---|
| `note_list` | `query?` | List notes newest first; `query` filters title + body |
| `note_create` | `body`, `title?` | Create a note; the first body line becomes the title when omitted |
| `note_update` | `id`, `title?`, `body?` | Patch one note; omitted fields keep their stored value |
| `note_delete` | `id` | Delete one note |

All four answer with one text block. Ids look like `note-<base36 time>-<random>`.

## HTTP surface

The panel talks to one authenticated route, mounted under `/api` so the connection service
applies its Host/Origin fence and browser-session check first:

```
GET  /api/dsh-notes                 -> { ok, notes: [...] }
POST /api/dsh-notes { action: ... } -> { ok, note?, notes: [...] }
       create: { title?, body }
       update: { id, title?, body? }
       delete: { id }
```

The route path is published into the served page as
`globalThis.__DSH_STICKY_NOTES_CONFIG__ = { routePath }`, so the browser half never hard-codes it.

## Layout

```
lib/index.js    wiring: domain, route, tools, page injection
lib/config.js   route path, domain name, limits
lib/notes.js    pure shaping/patching/ordering (no runtime imports)
lib/domain.js   storage domain + repository
lib/route.js    the /api/dsh-notes handler
lib/tools.js    the four tool specs
lib/client.js   browser half: sidebar entry, panel, dictionaries, styles
locale/*.json   meta.title / meta.description for the plugin list
```

## Limits

- One body is capped at 20,000 characters, a title at 200; longer text is truncated, not refused.
- No folders, tags, colours or cross-device sync beyond the Host that owns the storage domain.
- Deleting is immediate and has no undo (the panel asks for a second click first).

## Tests

```sh
node --test test/*.test.js
```

`notes.test.js` covers the pure shaping rules, `route.test.js` every HTTP branch,
`client.test.js` the bundle's registrations, and `adapter.test.js` mounts the real `lib/`
against stub Harness packages to prove `apply()` wires the domain, route, tools and
disposal together.

A real browser pass needs a web host: boot one against an isolated profile, then drive it.

```sh
dsh --profile <name> --no-open --port 0      # prints http://127.0.0.1:<port>/?token=…
node scripts/e2e-notes.mjs --base http://127.0.0.1:<port> --token <token>
```

It clicks the sidebar entry, creates a note, waits for *Saved*, reloads, and fails unless the
note came back from the host. Evidence from the shipped run is in `VERIFY.md`.

## Licence

MIT.
