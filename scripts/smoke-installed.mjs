/**
 * Smoke test an installed copy of the plugin (npm or directory install): open a
 * running host, click the sidebar entry, and prove the panel mounts and its
 * route answers without creating anything.
 *
 * Usage: node scripts/smoke-installed.mjs --base http://127.0.0.1:PORT --token <token>
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { pathToFileURL } from "node:url";

/** Resolve playwright from a local install, then from the npx cache. */
async function loadPlaywright() {
  const cacheRoot = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "npm-cache", "_npx");
  const candidates = [process.env.PLAYWRIGHT_MODULE_DIR, join(process.cwd(), "node_modules", "playwright")].filter(Boolean);
  if (existsSync(cacheRoot)) {
    for (const entry of readdirSync(cacheRoot)) candidates.push(join(cacheRoot, entry, "node_modules", "playwright"));
  }
  for (const candidate of candidates) {
    if (existsSync(candidate)) return import(pathToFileURL(join(candidate, "index.mjs")).href);
  }
  throw new Error("playwright not found; set PLAYWRIGHT_MODULE_DIR");
}

const { chromium } = await loadPlaywright();

function argument(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

const base = argument("base");
const token = argument("token");
if (base === undefined) throw new Error("--base is required");

const browser = await chromium.launch({ headless: true, channel: process.env.E2E_BROWSER_CHANNEL ?? "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

await page.goto(token === undefined ? base : `${base}/?token=${token}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

/** Clear first-run overlays by dispatching on their buttons. */
for (let round = 0; round < 8; round += 1) {
  const clicked = await page.evaluate(() => {
    const labels = ["暂不开启", "稍后配置", "知道了", "保留当前显示", "结束", "继续"];
    const match = Array.from(document.querySelectorAll('button, [role="button"]')).find((element) => {
      const text = (element.innerText || "").replace(/\s+/g, "").trim();
      return labels.includes(text) && element.getBoundingClientRect().width > 0;
    });
    if (match === undefined) return null;
    match.click();
    return (match.innerText || "").trim();
  });
  if (clicked === null) break;
  await page.waitForTimeout(600);
}

const entries = await page.getByRole("button", { name: "便签", exact: true }).count();
if (entries === 0) throw new Error("the sidebar entry is missing: is the client bundle loaded?");
await page.getByRole("button", { name: "便签", exact: true }).first().click();
await page.waitForTimeout(1200);

const panel = page.locator("[data-dsh-sticky-notes]");
const panelCount = await panel.count();
if (panelCount !== 1) throw new Error("the notes panel did not mount");

// The board build must expose its density control and the seven colour swatches.
const density = await panel.locator('select[aria-label="每行"], select[aria-label="Per row"]').count();
const swatches = await panel.locator(".dsn-colors .dsn-swatch").count();

const api = await page.evaluate(async () => {
  const response = await fetch("/api/dsh-notes", { headers: { accept: "application/json" }, cache: "no-store" });
  const body = await response.json().catch(() => null);
  return { status: response.status, ok: body !== null && body.ok === true, count: body && Array.isArray(body.notes) ? body.notes.length : -1 };
});

const scoped = errors.filter((entry) => /sticky-notes|dsn-/.test(entry));
const result = { entries, panelCount, density, swatches, api, errors: scoped };
console.log(`result: ${JSON.stringify(result)}`);
await browser.close();
if (!api.ok || scoped.length > 0) process.exitCode = 1;
if (density !== 1 || swatches !== 7) process.exitCode = 1;
