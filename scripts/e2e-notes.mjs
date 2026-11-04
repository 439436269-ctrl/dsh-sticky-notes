/**
 * Headless end-to-end check for dsh-sticky-notes against a locally booted web
 * host: open the app, click the sidebar entry, create a note through the panel,
 * wait for the auto-save, reload, and prove the note survived.
 *
 * Usage:
 *   node scripts/e2e-notes.mjs --base http://127.0.0.1:PORT --token <token>
 */
import { existsSync, readdirSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Resolve playwright from a local install, then from the npx cache. */
async function loadPlaywright() {
  const cacheRoot = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "npm-cache", "_npx");
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_DIR,
    join(process.cwd(), "node_modules", "playwright"),
    join(homedir(), "node_modules", "playwright")
  ].filter(Boolean);
  if (existsSync(cacheRoot)) {
    for (const entry of readdirSync(cacheRoot)) candidates.push(join(cacheRoot, entry, "node_modules", "playwright"));
  }
  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    return import(pathToFileURL(join(candidate, "index.mjs")).href);
  }
  throw new Error("playwright not found; set PLAYWRIGHT_MODULE_DIR to a directory containing playwright/");
}

const { chromium } = await loadPlaywright();

function argument(name) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

const base = argument("base");
const token = argument("token");
const outDir = argument("out") ?? join(process.cwd(), "scripts", "shots");
if (base === undefined) throw new Error("--base is required");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  channel: process.env.E2E_BROWSER_CHANNEL ?? "msedge"
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});

await page.goto(token === undefined ? base : `${base}/?token=${token}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);

/**
 * Clear the first-run overlays a fresh profile shows: the API-key prompt and
 * the sidebar hint. Both are plain buttons with visible labels.
 * @param target - the page.
 */
async function dismissOverlays(target) {
  const labels = ["暂不开启", "稍后配置", "知道了", "保留当前显示", "跳过", "以后再说", "结束", "继续"];
  for (let round = 0; round < 8; round += 1) {
    // A fresh profile can stack two dialogs (cost-meter hint above the API-key
    // prompt), so the mask swallows pointer clicks: dispatch on the button
    // itself instead of hitting coordinates.
    const clicked = await target.evaluate((wanted) => {
      const candidates = Array.from(document.querySelectorAll('button, [role="button"]'));
      const match = candidates.find((element) => {
        const text = (element.innerText || "").replace(/\s+/g, "").trim();
        return wanted.some((label) => text === label) && element.getBoundingClientRect().width > 0;
      });
      if (match === undefined) return null;
      match.click();
      return (match.innerText || "").trim();
    }, labels);
    if (clicked === null) {
      await target.keyboard.press("Escape").catch(() => {});
      await target.waitForTimeout(300);
      const remaining = await target.evaluate(
        () => document.querySelectorAll('[role="dialog"], [aria-modal="true"]').length
      );
      if (remaining === 0) return;
      continue;
    }
    console.log(`dismissed: ${clicked}`);
    await target.waitForTimeout(700);
  }
}

await dismissOverlays(page);

// Catalogue the sidebar entries: the plugin's own button carries its label.
const buttons = page.locator("button");
const catalog = [];
for (let index = 0; index < (await buttons.count()); index += 1) {
  const button = buttons.nth(index);
  const label = (await button.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
  const aria = (await button.getAttribute("aria-label").catch(() => "")) ?? "";
  const title = (await button.getAttribute("title").catch(() => "")) ?? "";
  const box = await button.boundingBox().catch(() => null);
  if (box !== null) catalog.push({ index, label, aria, title, box });
}
await writeFile(join(outDir, "buttons.json"), JSON.stringify(catalog, null, 2), "utf8");
await page.screenshot({ path: join(outDir, "01-home.png") });

const entry = catalog.find((item) => /便签|Notes/i.test(item.aria) || /便签|Notes/.test(item.label) || /便签|Notes/i.test(item.title));
if (entry === undefined) {
  console.log(`sidebar entries: ${catalog.map((item) => `${item.index}:${item.aria || item.label || item.title}`).join(" | ")}`);
  throw new Error("sticky-notes sidebar entry not found");
}
console.log(`entry: ${JSON.stringify(entry)}`);

await buttons.nth(entry.index).click({ timeout: 5000 });
await page.waitForTimeout(1200);
const panel = page.locator("[data-dsh-sticky-notes]");
const panelCount = await panel.count();
const panelBox = panelCount ? await panel.first().boundingBox() : null;
const paint = panelCount
  ? await panel.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        color: style.color,
        bgBase: getComputedStyle(document.documentElement).getPropertyValue("--dsw-alias-bg-base").trim(),
        bgLayer1: getComputedStyle(document.documentElement).getPropertyValue("--dsw-alias-bg-layer-1").trim()
      };
    })
  : null;
await page.screenshot({ path: join(outDir, "02-panel.png") });
console.log(`panel: count=${panelCount} box=${JSON.stringify(panelBox)} paint=${JSON.stringify(paint)}`);

if (panelCount !== 1) throw new Error("the notes panel did not mount");

// Opening the sidebar can surface another fresh-profile hint; clear it before
// driving the panel itself.
await dismissOverlays(page);

// Create a note through the panel, then wait past the debounce window.
const newNote = page.getByRole("button", { name: /新建便签|New note/i }).first();
if (!(await newNote.count())) throw new Error("the new-note button is missing");
await newNote.click({ timeout: 5000 });
await page.waitForTimeout(600);

const titleInput = panel.locator("input.dsn-editor-title");
const bodyInput = panel.locator("textarea.dsn-editor-body");
if (!(await titleInput.count()) || !(await bodyInput.count())) throw new Error("the editor inputs are missing");

const marker = `e2e-${Date.now().toString(36)}`;
await titleInput.fill(`便签端到端 ${marker}`);
await bodyInput.fill("从面板写入的第一段。\n第二行用来确认换行。");
await page.waitForTimeout(1600);

const saveState = await panel.locator(".dsn-save").getAttribute("data-state");
const saveText = (await panel.locator(".dsn-save").innerText()).trim();
const listTitles = await panel.locator(".dsn-card-title").allInnerTexts();
await page.screenshot({ path: join(outDir, "03-saved.png") });
console.log(`save: state=${saveState} text=${saveText} titles=${JSON.stringify(listTitles)}`);

// Reload: the note must come back from the host, not from local component state.
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(5000);
await dismissOverlays(page);
const entryAfter = page.locator("button", { has: page.locator("svg") });
const buttonsAfter = page.locator("button");
let clicked = false;
for (let index = 0; index < (await buttonsAfter.count()); index += 1) {
  const aria = (await buttonsAfter.nth(index).getAttribute("aria-label").catch(() => "")) ?? "";
  if (/便签|Notes/i.test(aria)) {
    await buttonsAfter.nth(index).click({ timeout: 5000 });
    clicked = true;
    break;
  }
}
if (!clicked) throw new Error("the sidebar entry disappeared after reload");
await page.waitForTimeout(1200);
const titlesAfter = await page.locator("[data-dsh-sticky-notes] .dsn-card-title").allInnerTexts();
const bodyAfter = await page.locator("[data-dsh-sticky-notes] textarea").inputValue().catch(() => "");
await page.screenshot({ path: join(outDir, "04-after-reload.png") });
console.log(`after reload: titles=${JSON.stringify(titlesAfter)} body=${JSON.stringify(bodyAfter)}`);

const result = {
  entryFound: true,
  panel: { count: panelCount, box: panelBox, paint },
  save: { state: saveState, text: saveText },
  persisted: {
    titleSurvived: titlesAfter.some((title) => title.includes(marker)),
    bodySurvived: bodyAfter.includes(marker) || bodyAfter.includes("第一段")
  },
  errors: errors.filter((entry) => /dsh-sticky-notes|dsn-|sticky-notes/.test(entry)),
  ambientErrors: errors.filter((entry) => !/dsh-sticky-notes|dsn-|sticky-notes/.test(entry))
};
await writeFile(join(outDir, "result.json"), JSON.stringify(result, null, 2), "utf8");
console.log(`result: ${JSON.stringify(result)}`);

await browser.close();
if (result.errors.length > 0) process.exitCode = 1;
if (!result.persisted.titleSurvived || !result.persisted.bodySurvived) process.exitCode = 1;
