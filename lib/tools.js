/**
 * Tool specs. One file, four tools: the assistant can list, create, patch and
 * delete the same notes the sidebar panel shows.
 *
 * @module dsh-sticky-notes/tools
 */

import { defineTool } from "@deepseek-ai/dsh-tools";

/** Shared output shape: one text block the model reads. */
const OUTPUT = {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: { text: { type: "string", required: true } }
  },
  render: (_args, value) => [{ type: "text", text: value.text }]
};

/** Keep a preview line short enough for one table row. */
function clip(text, max = 120) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/**
 * Build the four tool specs bound to one repository.
 * @param deps - `{ notes }`, the notes repository.
 * @returns the specs registered by `apply()`.
 */
export function createToolSpecs({ notes }) {
  return [
    {
      name: "note_create",
      description:
        "Create a sticky note in the Harness sidebar Notes panel. Use it when the user asks you to remember something short — '记一条', '帮我记下', '存个便签' — or when a durable one-line takeaway belongs somewhere the user can see without the conversation. The note appears in the sidebar immediately; give it a short title (or let the first line of the body become the title).",
      parameters: {
        body: { type: "string", required: true, description: "The note text. Plain text; newlines are kept." },
        title: { type: "string", description: "Optional short title; omitted means the first non-empty body line is used." }
      },
      output: OUTPUT,
      async execute(args) {
        const body = typeof args?.body === "string" ? args.body : "";
        if (body.trim() === "") throw new Error("note body must not be empty; pass the text to remember");
        const note = await notes.create({ title: args?.title, body });
        return { text: `Created sticky note ${note.id} (${note.title}).` };
      }
    },
    {
      name: "note_list",
      description:
        "List sticky notes from the sidebar Notes panel, newest first. Use it before updating or deleting a note so you have the exact id, and when the user asks '便签里有什么' or references a note they wrote earlier.",
      parameters: {
        query: { type: "string", description: "Optional case-insensitive substring matched against title and body." }
      },
      output: OUTPUT,
      async execute(args) {
        const query = typeof args?.query === "string" ? args.query.trim().toLowerCase() : "";
        const all = await notes.list();
        const visible = query === ""
          ? all
          : all.filter((note) => `${note.title}\n${note.body}`.toLowerCase().includes(query));
        if (visible.length === 0) {
          return { text: query === "" ? "There are no sticky notes yet." : `No sticky note matches "${query}".` };
        }
        const lines = visible.map((note) => `- ${note.id} | ${note.title} | ${clip(note.body)}`);
        return { text: `${visible.length} sticky note(s), newest first:\n${lines.join("\n")}` };
      }
    },
    {
      name: "note_update",
      description:
        "Update one sticky note by id: change its title, replace its body, or both. Omit a field to keep the stored value. Use note_list first to obtain the id.",
      parameters: {
        id: { type: "string", required: true, description: "Note id as reported by note_list or note_create." },
        title: { type: "string", description: "New title. An emptied title falls back to the first body line." },
        body: { type: "string", description: "New full body; it replaces the previous body, it is not appended." }
      },
      output: OUTPUT,
      async execute(args) {
        const id = typeof args?.id === "string" ? args.id.trim() : "";
        if (id === "") throw new Error("note id is required; call note_list to find it");
        if (typeof args?.title !== "string" && typeof args?.body !== "string") {
          throw new Error("pass a title, a body, or both");
        }
        const note = await notes.update(id, { title: args.title, body: args.body });
        if (note === undefined) throw new Error(`no sticky note with id ${id}; call note_list to see the current ids`);
        return { text: `Updated sticky note ${note.id} (${note.title}).` };
      }
    },
    {
      name: "note_delete",
      description:
        "Delete one sticky note by id. This removes it from the sidebar panel immediately and cannot be undone, so confirm the id with note_list first and only delete notes the user asked to remove.",
      parameters: {
        id: { type: "string", required: true, description: "Note id as reported by note_list." }
      },
      output: OUTPUT,
      async execute(args) {
        const id = typeof args?.id === "string" ? args.id.trim() : "";
        if (id === "") throw new Error("note id is required; call note_list to find it");
        const removed = await notes.remove(id);
        if (!removed) throw new Error(`no sticky note with id ${id}; call note_list to see the current ids`);
        return { text: `Deleted sticky note ${id}.` };
      }
    }
  ].map((spec) =>
    defineTool({
      ...spec,
      presentCall: (args) => ({
        card: "generic",
        title: spec.name,
        kind: "execute",
        detail: typeof args?.id === "string" ? args.id : clip(args?.title ?? args?.body ?? "", 60)
      })
    })
  );
}
