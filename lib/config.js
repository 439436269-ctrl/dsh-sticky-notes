/**
 * Shared constants. The host half and the browser bundle cannot import each
 * other (the bundle is a standalone classic script), so the route path and the
 * boot-variable name live here and the bundle mirrors them; a test asserts the
 * two spellings stay identical.
 *
 * @module dsh-sticky-notes/config
 */

/** Authenticated route serving the note list; must stay under `/api`. */
export const ROUTE_PATH = "/api/dsh-notes";

/** Index-injection global that tells the browser half where the route lives. */
export const CONFIG_GLOBAL = "__DSH_STICKY_NOTES_CONFIG__";

/**
 * Storage-domain name. The host validates `/^[a-z][a-z0-9_]*$/`, so the
 * hyphenated package name cannot be used here.
 */
export const DOMAIN_NAME = "sticky_notes";

/** The one table in the domain; the key is the note id. */
export const TABLE_NAME = "notes";

/** Longest title kept; longer text is truncated instead of rejected. */
export const MAX_TITLE_LENGTH = 200;

/** Longest body kept, in UTF-16 code units. */
export const MAX_BODY_LENGTH = 20000;

/** Largest request body the route will parse. */
export const MAX_REQUEST_BYTES = 1024 * 1024;
