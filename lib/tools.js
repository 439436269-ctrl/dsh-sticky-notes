/**
 * Tool specs: the assistant lists, creates, patches and deletes the same notes
 * the sidebar board shows, including colours, pins and the trash.
 *
 * @module dsh-sticky-notes/tools
 */

import { defineTool } from "@deepseek-ai/dsh-tools";
import { COLOR_IDS } from "./palette.js";
import { SORT_MODES, countNotes, filterNotes, isArchived, sortNotes } from "./notes.js";

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

/** A one-line descriptor for a note row. */
function describe(note) {
  const marks = [note.color === "plain" ? "" : note.color, note.pinned ? "pinned" : "", isArchived(note) ? "trash" : ""]
    .filter((mark) => mark !== "")
    .join(",");
  return `- ${note.id} | ${note.title}${marks === "" ? "" : ` [${marks}]`} | ${clip(note.body)}`;
}

/**
 * Build the tool specs bound to one repository.
 * @param deps - `{ notes }`, the notes repository.
 * @returns the specs registered by `apply()`.
 */
export function createToolSpecs({ notes }) {
  return [
    {
      name: "note_create",
      description:
        "Create a sticky note on the Harness sidebar board. Use it when the user asks you to remember something short — '记一条', '帮我记下', '存个便签' — or when a durable takeaway belongs where the user can see it without the conversation. Give it a colour from the palette when the user wants notes grouped by kind, and pin it when it must stay on top.",
      parameters: {
        body: { type: "string", required: true, description: "The note text. Plain text; newlines are kept." },
        title: { type: "string", description: "Optional short title; omitted means the first non-empty body line is used." },
        color: {
          type: "string",
          enum: COLOR_IDS,
          description: "Card colour: plain (default), amber, rose, mint, sky, violet or slate."
        },
        pinned: { type: "boolean", description: "Keep the note at the top of the board. Defaults to false." }
      },
      output: OUTPUT,
      async execute(args) {
        const body = typeof args?.body === "string" ? args.body : "";
        if (body.trim() === "") throw new Error("note body must not be empty; pass the text to remember");
        const note = await notes.create({ title: args?.title, body, color: args?.color, pinned: args?.pinned === true });
        return { text: `Created sticky note ${note.id} (${note.title}) colour=${note.color} pinned=${note.pinned}.` };
      }
    },
    {
      name: "note_list",
      description:
        "List sticky notes from the sidebar board. Filters combine: text (title and body), colour, and pinned-only; the trash is excluded unless includeArchived is true. Returns each id so note_update / note_delete can address it.",
      parameters: {
        query: { type: "string", description: "Optional case-insensitive substring matched against title and body." },
        color: { type: "string", enum: COLOR_IDS, description: "Only notes of this colour." },
        pinned: { type: "boolean", description: "Only pinned notes when true." },
        includeArchived: { type: "boolean", description: "Include notes in the trash. Defaults to false." },
        sort: { type: "string", enum: SORT_MODES, description: "Order: updated (default), created, or title." }
      },
      output: OUTPUT,
      async execute(args) {
        const all = await notes.list();
        const counts = countNotes(all);
        const filtered = filterNotes(all, {
          view: args?.pinned === true ? "pinned" : "all",
          color: args?.color,
          query: args?.query
        }).filter((note) => (args?.includeArchived === true ? true : !isArchived(note)));
        const ordered = sortNotes(filtered, SORT_MODES.includes(args?.sort) ? args.sort : "updated");
        if (ordered.length === 0) {
          const scope = args?.includeArchived === true ? "sticky notes" : "active sticky notes";
          return { text: `There are no matching ${scope}. Board: ${counts.active} active, ${counts.pinned} pinned, ${counts.trash} in trash.` };
        }
        const header = `${ordered.length} sticky note(s), ${SORT_MODES.includes(args?.sort) ? args.sort : "updated"} order; board: ${counts.active} active, ${counts.pinned} pinned, ${counts.trash} in trash.`;
        return { text: `${header}\n${ordered.map(describe).join("\n")}` };
      }
    },
    {
      name: "note_update",
      description:
        "Update one sticky note by id: title, body, colour, pin state, or whether it sits in the trash. Omit a field to keep it. Use note_list first to obtain the id.",
      parameters: {
        id: { type: "string", required: true, description: "Note id as reported by note_list or note_create." },
        title: { type: "string", description: "New title. An emptied title falls back to the first body line." },
        body: { type: "string", description: "New full body; it replaces the previous body, it is not appended." },
        color: { type: "string", enum: COLOR_IDS, description: "New card colour." },
        pinned: { type: "boolean", description: "true keeps the note on top; false unpins it." },
        archived: { type: "boolean", description: "true moves the note to the trash; false restores it." }
      },
      output: OUTPUT,
      async execute(args) {
        const id = typeof args?.id === "string" ? args.id.trim() : "";
        if (id === "") throw new Error("note id is required; call note_list to find it");
        const patch = {};
        if (typeof args?.title === "string") patch.title = args.title;
        if (typeof args?.body === "string") patch.body = args.body;
        if (typeof args?.color === "string") patch.color = args.color;
        if (typeof args?.pinned === "boolean") patch.pinned = args.pinned;
        if (typeof args?.archived === "boolean") patch.archivedAt = args.archived ? Date.now() : null;
        if (Object.keys(patch).length === 0) {
          throw new Error("pass a title, body, colour, pinned or archived field");
        }
        const note = await notes.update(id, patch);
        if (note === undefined) throw new Error(`no sticky note with id ${id}; call note_list to see the current ids`);
        return {
          text: `Updated sticky note ${note.id} (${note.title}) colour=${note.color} pinned=${note.pinned} archived=${isArchived(note)}.`
        };
      }
    },
    {
      name: "note_delete",
      description:
        "Delete one sticky note by id. The default moves it to the trash (restorable with note_update archived=false); permanent=true erases it. Confirm the id with note_list first and only delete notes the user asked to remove.",
      parameters: {
        id: { type: "string", required: true, description: "Note id as reported by note_list." },
        permanent: { type: "boolean", description: "true erases the note instead of moving it to the trash." }
      },
      output: OUTPUT,
      async execute(args) {
        const id = typeof args?.id === "string" ? args.id.trim() : "";
        if (id === "") throw new Error("note id is required; call note_list to find it");
        if (args?.permanent === true) {
          const removed = await notes.purge(id);
          if (!removed) throw new Error(`no sticky note with id ${id}; call note_list to see the current ids`);
          return { text: `Permanently deleted sticky note ${id}.` };
        }
        const note = await notes.archive(id);
        if (note === undefined) throw new Error(`no sticky note with id ${id}; call note_list to see the current ids`);
        return { text: `Moved sticky note ${id} to the trash (restore with note_update archived=false).` };
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
