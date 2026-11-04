/**
 * dsh-sticky-notes — a sticky-note panel in the Harness sidebar.
 *
 * Two halves, one package:
 * - this file is the host half: it opens the `sticky_notes` storage domain,
 *   mounts the authenticated `/api/dsh-notes` route the panel talks to, and
 *   registers the four `note_*` tools the assistant uses. It also publishes
 *   the route path into the served page so the browser half never guesses.
 * - `./client` is the browser half: the sidebar entry and the notes panel.
 *
 * @module dsh-sticky-notes
 */

import { CONFIG_GLOBAL, ROUTE_PATH } from "./config.js";
import { createNotesRepository } from "./domain.js";
import { createNotesRoute } from "./route.js";
import { createToolSpecs } from "./tools.js";

/** Plugin name, also the bundle row id and the settings-page namespace. */
export const name = "sticky-notes";

/** Host services the plugin reads: tools, the auth fence, and durable storage. */
export const inject = ["tools", "connection", "storageDomain"];

/**
 * Mount the storage domain, the route, the tools, and the page injection.
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
  const notes = createNotesRepository(ctx);

  // Closing the domain on unload keeps a plugin reload from leaving the unit
  // open and refusing the next `open()` with `already-open`.
  ctx.effect(
    () => async () => {
      const domain = await notes.ready.catch(() => undefined);
      if (domain !== undefined) await domain.close().catch(() => {});
    },
    "sticky-notes: storage domain"
  );

  ctx.effect(() => ctx.connection.fetch.register(createNotesRoute(notes, ROUTE_PATH)), "sticky-notes: notes route");

  for (const spec of createToolSpecs({ notes })) {
    ctx.tools.register(spec);
  }

  // The client reads its route from the served page, so a configured path and
  // the panel's URL can never drift apart.
  ctx.on("webserver/index-inject", (table) => {
    table.push({ kind: "global", name: CONFIG_GLOBAL, value: { routePath: ROUTE_PATH } });
  });
}
