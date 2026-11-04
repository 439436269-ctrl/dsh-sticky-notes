# Changelog

## 0.1.0

First release.

- Sidebar entry (`sidebar.panellist`) and a matching main panel (`main`, key `sticky-notes`).
- Searchable note list, title/body editor with debounced auto-save, inline two-click delete.
- Notes persisted in the plugin's `sticky_notes` storage domain, exposed to the panel over
  the authenticated `GET|POST /api/dsh-notes` route.
- Tools: `note_create`, `note_list`, `note_update`, `note_delete`.
- Localized metadata (`locale/en.json`, `locale/zh.json`) and an original icon.
