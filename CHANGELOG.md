# Changelog

## 0.2.0

The board release.

- **Tiled board** — notes render as cards in a grid; the density control pins
  the board to 2 / 3 / 4 / 5 per row or lets it fill the width automatically.
- **Colours** — seven swatches (plain, amber, rose, mint, sky, violet, slate);
  a card, its border and its dots share one accent, and the toolbar filters by colour.
- **Pin** — pinned notes sort to the top and carry a pin mark.
- **Trash** — delete is now soft: notes move to a trash tab with restore, permanent
  delete and empty-trash. The toast carries an undo.
- **Editor dialog** — title and body with debounced auto-save, colour swatches, pin
  toggle, character count, copy, duplicate, archive/restore and permanent delete.
- **Search, sort, export** — text search across title and body, sorting by update
  time / creation time / title, and one-click Markdown export.
- **Shortcuts** — `Ctrl/Cmd+N` new note, `Ctrl/Cmd+F` focus search, `Escape` close.
- **Storage** — the note record gained `color`, `pinned` and `archivedAt`; older
  records are normalized on read, so an existing board keeps working.
- **Route** — new actions `archive`, `restore`, `purge`, `duplicate`, `clear-trash`
  beside `create` / `update`; `GET` now returns every note, trash included.
- **Tools** — `note_create` takes `color` and `pinned`, `note_list` filters by
  colour / pin / trash, `note_update` patches colour, pin and the trash flag, and
  `note_delete` moves to the trash unless `permanent: true`.

## 0.1.0

First release.

- Sidebar entry (`sidebar.panellist`) and a matching main panel (`main`, key `sticky-notes`).
- Searchable note list, title/body editor with debounced auto-save, inline two-click delete.
- Notes persisted in the plugin's `sticky_notes` storage domain, exposed to the panel over
  the authenticated `GET|POST /api/dsh-notes` route.
- Tools: `note_create`, `note_list`, `note_update`, `note_delete`.
- Localized metadata (`locale/en.json`, `locale/zh.json`) and an original icon.
