/**
 * The note colour palette. Ids are the wire format (stored and sent by the
 * tools); the browser half maps the same ids to CSS accents, so a test keeps
 * both lists identical.
 *
 * @module dsh-sticky-notes/palette
 */

/** The default colour: an unstyled note that follows the app surface. */
export const DEFAULT_COLOR = "plain";

/** Every accepted colour id, in display order. */
export const COLOR_IDS = Object.freeze(["plain", "amber", "rose", "mint", "sky", "violet", "slate"]);

/**
 * Coerce any input into a known colour id.
 * @param value - caller-supplied colour.
 * @returns one of `COLOR_IDS`.
 */
export function normalizeColor(value) {
  return typeof value === "string" && COLOR_IDS.includes(value) ? value : DEFAULT_COLOR;
}
