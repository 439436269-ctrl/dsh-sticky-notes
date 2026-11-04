window.__ModuleLoader__.load({
  id: "@vfvrpq/dsh-sticky-notes",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;
    const useState = React.useState;
    const useEffect = React.useEffect;
    const useMemo = React.useMemo;
    const useRef = React.useRef;
    const useCallback = React.useCallback;

    /** Locale namespace of this plugin (matches the slot registrations). */
    const NS = "stickyNotes";
    /** Sidebar entry id; the main board registers the same key. */
    const PANEL_ID = "sticky-notes";
    /** Route the host half mounts at; overridden by the injected boot config. */
    const DEFAULT_ROUTE_PATH = "/api/dsh-notes";
    /** Boot global the host half writes into the served page. */
    const CONFIG_GLOBAL = "__DSH_STICKY_NOTES_CONFIG__";
    /** Quiet period after the last keystroke before a note is written. */
    const SAVE_DELAY_MS = 550;
    /** How long the two-click confirmations stay armed. */
    const CONFIRM_TIMEOUT_MS = 4000;
    /** How long the undo toast stays up. */
    const TOAST_TIMEOUT_MS = 6000;
    /** Preview length on a card. */
    const PREVIEW_LENGTH = 180;
    /** Board densities: "auto" fills the width, a number pins the columns. */
    const DENSITIES = ["auto", "2", "3", "4", "5"];
    /** Sort keys; mirrors the host's SORT_MODES. */
    const SORTS = ["updated", "created", "title"];
    /** Colour ids; mirrors the host palette. */
    const COLORS = ["plain", "amber", "rose", "mint", "sky", "violet", "slate"];
    /** Where the board remembers density and sort for this browser. */
    const PREFS_KEY = "dsh-sticky-notes:prefs";

    const zh = {
      panelTitle: "便签",
      newNote: "新建便签",
      search: "搜索便签…",
      count: "{n} 条",
      filterColor: "颜色",
      allColors: "全部",
      viewAll: "全部",
      viewPinned: "置顶",
      viewTrash: "回收站",
      sort: "排序",
      sortUpdated: "最近更新",
      sortCreated: "创建时间",
      sortTitle: "标题",
      density: "每行",
      densityAuto: "自适应",
      densityN: "{n} 个",
      exportAll: "导出 Markdown",
      empty: "还没有便签。",
      emptyHint: "点「新建便签」，或让助手用 note_create 记一条。",
      emptyPinned: "还没有置顶的便签。",
      emptyTrash: "回收站是空的。",
      emptyFiltered: "没有符合条件的便签。",
      editorTitle: "标题",
      editorBody: "写点什么…",
      editNote: "编辑便签",
      colorLabel: "颜色",
      pin: "置顶",
      pinned: "已置顶",
      unpin: "取消置顶",
      copy: "复制",
      copied: "已复制",
      duplicate: "复制一份",
      archive: "移到回收站",
      restore: "恢复",
      purge: "永久删除",
      confirmPurge: "确认永久删除",
      clearTrash: "清空回收站",
      confirmClearTrash: "确认清空",
      trashEmpty: "回收站已清空",
      close: "关闭",
      saved: "已保存",
      saving: "保存中…",
      saveFailed: "保存失败",
      loadFailed: "便签加载失败",
      retry: "重试",
      undo: "撤销",
      archivedToast: "已移到回收站",
      purgedToast: "已永久删除",
      chars: "{n} 字",
      created: "创建于 {time}",
      updated: "更新于 {time}",
      justNow: "刚刚",
      minutesAgo: "{n} 分钟前",
      hoursAgo: "{n} 小时前",
      daysAgo: "{n} 天前",
      colorPlain: "默认",
      colorAmber: "琥珀",
      colorRose: "玫瑰",
      colorMint: "薄荷",
      colorSky: "天蓝",
      colorViolet: "紫罗兰",
      colorSlate: "石板"
    };

    const en = {
      panelTitle: "Notes",
      newNote: "New note",
      search: "Search notes…",
      count: "{n}",
      filterColor: "Colour",
      allColors: "All",
      viewAll: "All",
      viewPinned: "Pinned",
      viewTrash: "Trash",
      sort: "Sort",
      sortUpdated: "Recently updated",
      sortCreated: "Created",
      sortTitle: "Title",
      density: "Per row",
      densityAuto: "Auto",
      densityN: "{n}",
      exportAll: "Export Markdown",
      empty: "No notes yet.",
      emptyHint: "Click “New note”, or ask the assistant to run note_create.",
      emptyPinned: "Nothing is pinned yet.",
      emptyTrash: "The trash is empty.",
      emptyFiltered: "No note matches these filters.",
      editorTitle: "Title",
      editorBody: "Write something…",
      editNote: "Edit note",
      colorLabel: "Colour",
      pin: "Pin",
      pinned: "Pinned",
      unpin: "Unpin",
      copy: "Copy",
      copied: "Copied",
      duplicate: "Duplicate",
      archive: "Move to trash",
      restore: "Restore",
      purge: "Delete permanently",
      confirmPurge: "Confirm delete",
      clearTrash: "Empty trash",
      confirmClearTrash: "Confirm empty",
      trashEmpty: "Trash emptied",
      close: "Close",
      saved: "Saved",
      saving: "Saving…",
      saveFailed: "Save failed",
      loadFailed: "Could not load notes",
      retry: "Retry",
      undo: "Undo",
      archivedToast: "Moved to trash",
      purgedToast: "Deleted permanently",
      chars: "{n} chars",
      created: "Created {time}",
      updated: "Updated {time}",
      justNow: "just now",
      minutesAgo: "{n} min ago",
      hoursAgo: "{n} h ago",
      daysAgo: "{n} d ago",
      colorPlain: "Plain",
      colorAmber: "Amber",
      colorRose: "Rose",
      colorMint: "Mint",
      colorSky: "Sky",
      colorViolet: "Violet",
      colorSlate: "Slate"
    };

    /** Colour swatch labels, keyed by id. */
    const COLOR_LABELS = {
      plain: "colorPlain",
      amber: "colorAmber",
      rose: "colorRose",
      mint: "colorMint",
      sky: "colorSky",
      violet: "colorViolet",
      slate: "colorSlate"
    };

    /** Scoped styles; every selector starts at the panel root attribute. */
    const STYLE = [
      '[data-dsh-sticky-notes]{display:flex;flex-direction:column;flex:1 1 auto;height:100%;min-height:0;box-sizing:border-box;color:var(--dsw-alias-label-primary,#1f2329);background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.94));font-size:13px}',
      '[data-dsh-sticky-notes] .dsn-header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;flex:none;padding:12px 16px 8px}',
      '[data-dsh-sticky-notes] .dsn-title{font-size:15px;font-weight:600}',
      '[data-dsh-sticky-notes] .dsn-count{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.55));font-variant-numeric:tabular-nums}',
      '[data-dsh-sticky-notes] .dsn-spacer{flex:1 1 auto}',
      '[data-dsh-sticky-notes] .dsn-primary{appearance:none;border:0;border-radius:8px;padding:6px 12px;font:inherit;font-size:12px;font-weight:500;cursor:pointer;color:#fff;background:var(--dsw-alias-brand-primary,#2c6ef2)}',
      '[data-dsh-sticky-notes] .dsn-primary:hover{filter:brightness(1.06)}',
      '[data-dsh-sticky-notes] .dsn-ghost{appearance:none;border:0;border-radius:8px;padding:5px 10px;font:inherit;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.62));background:transparent}',
      '[data-dsh-sticky-notes] .dsn-ghost:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#1f2329)}',
      '[data-dsh-sticky-notes] .dsn-ghost[data-armed="true"]{color:var(--dsw-alias-state-error-primary,#d32029);background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06))}',
      '[data-dsh-sticky-notes] .dsn-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;flex:none;padding:0 16px 10px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}',
      '[data-dsh-sticky-notes] .dsn-search{flex:1 1 200px;min-width:140px;max-width:320px;padding:6px 10px;border-radius:8px;border:1px solid transparent;outline:none;font:inherit;font-size:12px;color:inherit;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05))}',
      '[data-dsh-sticky-notes] .dsn-search:focus{border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.18))}',
      '[data-dsh-sticky-notes] .dsn-tabs{display:flex;gap:2px;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05))}',
      '[data-dsh-sticky-notes] .dsn-tab{appearance:none;border:0;border-radius:7px;padding:4px 9px;font:inherit;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.6));background:transparent}',
      '[data-dsh-sticky-notes] .dsn-tab[data-active="true"]{background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.9));color:var(--dsw-alias-label-primary,#1f2329);box-shadow:0 1px 2px rgba(0,0,0,.12)}',
      '[data-dsh-sticky-notes] .dsn-tab .dsn-tabcount{opacity:.6;margin-left:4px;font-variant-numeric:tabular-nums}',
      '[data-dsh-sticky-notes] .dsn-colors{display:flex;align-items:center;gap:4px}',
      '[data-dsh-sticky-notes] .dsn-swatch{appearance:none;width:16px;height:16px;padding:0;border-radius:50%;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.2));background-color:var(--dsn-accent,transparent)}',
      '[data-dsh-sticky-notes] .dsn-swatch[data-color="plain"]{background:linear-gradient(135deg,rgba(0,0,0,.06),rgba(0,0,0,.16))}',
      '[data-dsh-sticky-notes] .dsn-swatch[data-active="true"]{box-shadow:0 0 0 2px var(--dsw-alias-bg-layer-1,#fff),0 0 0 4px var(--dsw-alias-brand-primary,#2c6ef2)}',
      '[data-dsh-sticky-notes] .dsn-select{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.1));border-radius:8px;padding:4px 8px;font:inherit;font-size:12px;color:inherit;background:transparent;cursor:pointer}',
      '[data-dsh-sticky-notes] .dsn-field{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.6))}',
      '[data-dsh-sticky-notes] .dsn-body{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;overflow:auto;padding:14px 16px 20px}',
      '[data-dsh-sticky-notes] .dsn-board{display:grid;gap:12px;align-content:start}',
      '[data-dsh-sticky-notes] .dsn-board[data-density="auto"]{grid-template-columns:repeat(auto-fill,minmax(216px,1fr))}',
      '[data-dsh-sticky-notes] .dsn-board[data-density="2"]{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '[data-dsh-sticky-notes] .dsn-board[data-density="3"]{grid-template-columns:repeat(3,minmax(0,1fr))}',
      '[data-dsh-sticky-notes] .dsn-board[data-density="4"]{grid-template-columns:repeat(4,minmax(0,1fr))}',
      '[data-dsh-sticky-notes] .dsn-board[data-density="5"]{grid-template-columns:repeat(5,minmax(0,1fr))}',
      '[data-dsh-sticky-notes] .dsn-card{position:relative;display:flex;flex-direction:column;gap:6px;min-height:148px;box-sizing:border-box;padding:12px 12px 8px;border-radius:12px;cursor:pointer;text-align:left;color:inherit;font:inherit;border:1px solid color-mix(in srgb,var(--dsn-accent,var(--dsw-alias-border-l1)) 34%,transparent);background:color-mix(in srgb,var(--dsn-accent,transparent) 13%,var(--dsw-alias-bg-layer-1,#fff))}',
      '[data-dsh-sticky-notes] .dsn-card:hover{border-color:color-mix(in srgb,var(--dsn-accent,var(--dsw-alias-border-l2)) 62%,transparent)}',
      '[data-dsh-sticky-notes] .dsn-card[data-pinned="true"]{box-shadow:inset 3px 0 0 color-mix(in srgb,var(--dsn-accent,var(--dsw-alias-brand-primary)) 70%,transparent)}',
      '[data-dsh-sticky-notes] .dsn-card-head{display:flex;align-items:flex-start;gap:6px}',
      '[data-dsh-sticky-notes] .dsn-card-title{margin:0;font-size:13px;font-weight:600;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}',
      '[data-dsh-sticky-notes] .dsn-card-text{flex:1 1 auto;margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.66));white-space:pre-wrap;overflow:hidden;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;word-break:break-word}',
      '[data-dsh-sticky-notes] .dsn-card-foot{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.55))}',
      '[data-dsh-sticky-notes] .dsn-pin{display:inline-flex;align-items:center;flex:none;margin-top:1px;color:color-mix(in srgb,var(--dsn-accent,var(--dsw-alias-brand-primary)) 72%,var(--dsw-alias-label-secondary))}',
      '[data-dsh-sticky-notes] .dsn-card[data-archived="true"] .dsn-card-actions{opacity:1}',
      '[data-dsh-sticky-notes] .dsn-card-actions{display:flex;align-items:center;gap:2px;opacity:0;transition:opacity .12s ease}',
      '[data-dsh-sticky-notes] .dsn-card:hover .dsn-card-actions,[data-dsh-sticky-notes] .dsn-card:focus-within .dsn-card-actions{opacity:1}',
      '[data-dsh-sticky-notes] .dsn-icon{appearance:none;border:0;border-radius:6px;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;padding:0;cursor:pointer;color:inherit;background:transparent}',
      '[data-dsh-sticky-notes] .dsn-icon:hover{background:color-mix(in srgb,var(--dsn-accent,var(--dsw-alias-label-primary)) 14%,transparent)}',
      '[data-dsh-sticky-notes] .dsn-icon[data-on="true"]{color:color-mix(in srgb,var(--dsn-accent,var(--dsw-alias-brand-primary)) 85%,var(--dsw-alias-label-primary))}',
      '[data-dsh-sticky-notes] .dsn-empty{margin:0;padding:26px 6px;font-size:12.5px;line-height:1.7;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.55))}',
      '[data-dsh-sticky-notes] .dsn-error{display:flex;flex-direction:column;gap:10px;align-items:flex-start;padding:24px 20px;font-size:12.5px;color:var(--dsw-alias-state-error-primary,#d32029)}',
      '[data-dsh-sticky-notes] .dsn-retry{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));border-radius:8px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-primary,#1f2329);background:transparent}',
      '[data-dsh-sticky-notes] .dsn-colors[aria-label]{margin:0}',
      '[data-dsh-sticky-notes] .dsn-modal{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.32);box-sizing:border-box}',
      '[data-dsh-sticky-notes] .dsn-dialog{display:flex;flex-direction:column;gap:10px;width:min(680px,94vw);max-height:min(78vh,760px);box-sizing:border-box;padding:16px 18px 14px;border-radius:14px;border:1px solid color-mix(in srgb,var(--dsn-accent,var(--dsw-alias-border-l1)) 30%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsn-accent,transparent) 7%,var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1)));box-shadow:0 18px 48px rgba(0,0,0,.3);color:var(--dsw-alias-label-primary,#1f2329)}',
      '[data-dsh-sticky-notes] .dsn-dialog-title{border:0;outline:none;background:transparent;font:inherit;font-size:19px;font-weight:600;color:inherit;padding:0}',
      '[data-dsh-sticky-notes] .dsn-dialog-title::placeholder{color:var(--dsw-alias-state-idle-primary,rgba(0,0,0,.35))}',
      '[data-dsh-sticky-notes] .dsn-dialog-body{flex:1 1 auto;min-height:170px;width:100%;box-sizing:border-box;border:0;outline:none;resize:none;background:transparent;font:inherit;font-size:13px;line-height:1.7;color:inherit;padding:0}',
      '[data-dsh-sticky-notes] .dsn-dialog-body::placeholder{color:var(--dsw-alias-state-idle-primary,rgba(0,0,0,.35))}',
      '[data-dsh-sticky-notes] .dsn-dialog-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '[data-dsh-sticky-notes] .dsn-dialog-foot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));font-size:11.5px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.56))}',
      '[data-dsh-sticky-notes] .dsn-save[data-state="saved"]{color:var(--dsw-alias-state-success-primary,#128a3a)}',
      '[data-dsh-sticky-notes] .dsn-save[data-state="failed"]{color:var(--dsw-alias-state-error-primary,#d32029)}',
      '[data-dsh-sticky-notes] .dsn-toast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:90;display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:10px;font-size:12.5px;color:var(--dsw-alias-bg-layer-1,#fff);background:var(--dsw-alias-label-primary,#1f2329);box-shadow:0 8px 24px rgba(0,0,0,.3)}',
      '[data-dsh-sticky-notes] .dsn-toast button{appearance:none;border:0;border-radius:6px;padding:3px 8px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;color:inherit;background:rgba(127,127,127,.28)}'
    ].join("\n");

    /** Accent per colour id; the card and the swatches read the same value. */
    const ACCENTS = {
      plain: "transparent",
      amber: "#D9A200",
      rose: "#D9526F",
      mint: "#2E9C67",
      sky: "#2F7BD8",
      violet: "#7757D6",
      slate: "#5B6472"
    };

    /** Which CSS custom property a colour sets, or nothing for plain. */
    function accentStyle(color) {
      const accent = ACCENTS[color] ?? "transparent";
      return accent === "transparent" ? undefined : { "--dsn-accent": accent };
    }

    /** Module-level translator; replaced by `apply()` once the locale service binds. */
    let fallbackTranslate = (key) => key;

    /** The route path the host half published, with the shipped default. */
    function configuredRoutePath() {
      const config = globalThis[CONFIG_GLOBAL];
      return typeof config === "object" && config !== null && typeof config.routePath === "string" && config.routePath !== ""
        ? config.routePath
        : DEFAULT_ROUTE_PATH;
    }

    /**
     * Install the scoped stylesheet once.
     * @returns a disposer removing the tag.
     */
    function installStyle() {
      if (typeof document === "undefined") return () => {};
      const tagId = "dsh-sticky-notes/board.css";
      if (document.querySelector('style[data-plugin-css="' + tagId + '"]') !== null) return () => {};
      const tag = document.createElement("style");
      tag.dataset.plugin = "dsh-sticky-notes";
      tag.dataset.pluginCss = tagId;
      tag.textContent = STYLE;
      document.head.appendChild(tag);
      return () => {
        if (tag.parentNode !== null) tag.parentNode.removeChild(tag);
      };
    }

    /**
     * Fill `{key}` placeholders.
     * @param template - localized template.
     * @param values - substitution table.
     * @returns the rendered string.
     */
    function fill(template, values) {
      return String(template).replace(/\{(\w+)\}/g, (whole, key) =>
        Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : whole
      );
    }

    /**
     * Collapse a body into a one-line card preview.
     * @param body - note body.
     * @returns at most `PREVIEW_LENGTH` characters.
     */
    function previewOf(body) {
      const flat = String(body ?? "").replace(/\s+/g, " ").trim();
      return flat.length > PREVIEW_LENGTH ? flat.slice(0, PREVIEW_LENGTH) + "…" : flat;
    }

    /**
     * Whether a note matches a search term.
     * @param note - the note.
     * @param query - raw search input.
     * @returns true when the term appears in the title or the body.
     */
    function matchesNote(note, query) {
      const term = String(query ?? "").trim().toLowerCase();
      if (term === "") return true;
      return `${note.title}\n${note.body}`.toLowerCase().includes(term);
    }

    /** Whether a note sits in the trash. */
    function archivedOf(note) {
      return typeof note.archivedAt === "number" && note.archivedAt > 0;
    }

    /**
     * Apply the board filters the way the host does, so an offline render and
     * a tool answer agree.
     * @param notes - every note.
     * @param options - `{ view, color, query }`.
     * @returns the matching notes.
     */
    function filterNotes(notes, options) {
      const view = options?.view ?? "all";
      const color = options?.color && options.color !== "all" ? options.color : "";
      return notes.filter((note) => {
        const archived = archivedOf(note);
        if (view === "trash" ? !archived : archived) return false;
        if (view === "pinned" && !note.pinned) return false;
        if (color !== "" && note.color !== color) return false;
        return matchesNote(note, options?.query);
      });
    }

    /**
     * Pinned first, then the chosen key; the trash keeps plain history order.
     * @param notes - notes to sort.
     * @param mode - `updated` | `created` | `title`.
     * @returns a new, sorted array.
     */
    function sortNotes(notes, mode) {
      const keyed = notes.map((note) => ({ note, archived: archivedOf(note) }));
      keyed.sort((left, right) => {
        const pinLeft = left.archived ? 0 : left.note.pinned ? 1 : 0;
        const pinRight = right.archived ? 0 : right.note.pinned ? 1 : 0;
        if (pinLeft !== pinRight) return pinRight - pinLeft;
        if (mode === "title") {
          const compared = left.note.title.localeCompare(right.note.title, undefined, { sensitivity: "base" });
          if (compared !== 0) return compared;
        } else if (mode === "created") {
          if (left.note.createdAt !== right.note.createdAt) return right.note.createdAt - left.note.createdAt;
        } else if (left.note.updatedAt !== right.note.updatedAt) {
          return right.note.updatedAt - left.note.updatedAt;
        }
        return left.note.id < right.note.id ? -1 : left.note.id > right.note.id ? 1 : 0;
      });
      return keyed.map((entry) => entry.note);
    }

    /**
     * Counts shown on the view tabs.
     * @param notes - every note.
     * @returns `{ all, pinned, trash }`.
     */
    function countsOf(notes) {
      let all = 0;
      let pinned = 0;
      let trash = 0;
      for (const note of notes) {
        if (archivedOf(note)) trash += 1;
        else {
          all += 1;
          if (note.pinned) pinned += 1;
        }
      }
      return { all, pinned, trash };
    }

    /**
     * Human relative time for a timestamp.
     * @param value - epoch ms.
     * @param t - translator.
     * @returns a short localized label, or the empty string when unknown.
     */
    function formatRelative(value, t) {
      const translate = typeof t === "function" ? t : fallbackTranslate;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
      const diff = Date.now() - value;
      const minute = 60000;
      const hour = 60 * minute;
      const day = 24 * hour;
      if (!Number.isFinite(diff) || diff < minute) return translate("justNow");
      if (diff < hour) return fill(translate("minutesAgo"), { n: Math.floor(diff / minute) });
      if (diff < day) return fill(translate("hoursAgo"), { n: Math.floor(diff / hour) });
      if (diff < 7 * day) return fill(translate("daysAgo"), { n: Math.floor(diff / day) });
      return new Date(value).toLocaleDateString();
    }

    /**
     * One call against the notes route.
     * @param path - route path.
     * @param payload - POST body, or null/undefined for a GET.
     * @returns the parsed JSON answer.
     */
    async function request(path, payload) {
      const init =
        payload === null || payload === undefined
          ? { method: "GET", headers: { accept: "application/json" }, cache: "no-store", credentials: "same-origin" }
          : {
              method: "POST",
              headers: { "content-type": "application/json", accept: "application/json" },
              body: JSON.stringify(payload),
              cache: "no-store",
              credentials: "same-origin"
            };
      const response = await fetch(path, init);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = body !== null && typeof body === "object" && typeof body.error === "string" ? body.error : "";
        throw new Error(detail === "" ? "HTTP " + response.status : detail);
      }
      return body ?? {};
    }

    /** Read the board preferences this browser saved. */
    function readPrefs() {
      try {
        const raw = globalThis.localStorage?.getItem(PREFS_KEY);
        const parsed = raw === undefined || raw === null ? null : JSON.parse(raw);
        return {
          density: DENSITIES.includes(parsed?.density) ? parsed.density : "auto",
          sort: SORTS.includes(parsed?.sort) ? parsed.sort : "updated"
        };
      } catch {
        return { density: "auto", sort: "updated" };
      }
    }

    /** Persist the board preferences, ignoring a storage-denied browser. */
    function writePrefs(prefs) {
      try {
        globalThis.localStorage?.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        /* private mode / quota: the board still works, it just forgets. */
      }
    }

    /** A small inline glyph set: pin, trash, copy, duplicate, restore, close. */
    function Glyph(props) {
      const size = props?.size ?? 14;
      const common = {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: props?.filled === true ? "currentColor" : "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
        focusable: "false",
        style: { display: "block" }
      };
      switch (props.name) {
        case "pin":
          return h("svg", common, h("path", { d: "M9 4h6l-1 6 3 3v1H7v-1l3-3z" }), h("path", { d: "M12 14v6" }));
        case "trash":
          return h("svg", common, h("path", { d: "M5 7h14" }), h("path", { d: "M9 7V5h6v2" }), h("path", { d: "M7 7l1 12h8l1-12" }));
        case "copy":
          return h("svg", common, h("rect", { x: 9, y: 9, width: 10, height: 10, rx: 2 }), h("path", { d: "M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" }));
        case "duplicate":
          return h("svg", common, h("rect", { x: 4, y: 4, width: 11, height: 11, rx: 2 }), h("path", { d: "M9 20h9a2 2 0 0 0 2-2V9" }));
        case "restore":
          return h("svg", common, h("path", { d: "M4 12a8 8 0 1 0 3-6.3" }), h("path", { d: "M4 4v5h5" }));
        case "close":
          return h("svg", common, h("path", { d: "M6 6l12 12M18 6L6 18" }));
        case "plus":
          return h("svg", common, h("path", { d: "M12 5v14M5 12h14" }));
        default:
          return null;
      }
    }

    /** The sidebar entry: a note glyph sized by the owner. */
    function Icon(props) {
      const size = typeof props?.size === "number" && props.size > 0 ? props.size : 20;
      return h(
        "svg",
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.6,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          "aria-hidden": true,
          focusable: "false",
          style: { display: "block", opacity: props?.active === true ? 1 : 0.78 }
        },
        h("path", { d: "M6.25 3.75h8.2l3.3 3.3v13.2H6.25z" }),
        h("path", { d: "M14.45 3.75v3.35h3.3" }),
        h("path", { d: "M9 11.1h6M9 14.2h6M9 17.3h3.6" })
      );
    }

    /** One note tile. */
    function NoteCard(props) {
      const { note, t, onOpen, onPin, onArchive, onRestore } = props;
      const archived = archivedOf(note);
      return h(
        "article",
        {
          className: "dsn-card",
          "data-color": note.color,
          "data-pinned": note.pinned ? "true" : "false",
          "data-archived": archived ? "true" : "false",
          style: accentStyle(note.color),
          tabIndex: 0,
          role: "button",
          "aria-label": note.title,
          onClick: () => onOpen(note.id),
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(note.id);
            }
          }
        },
        h(
          "div",
          { className: "dsn-card-head" },
          h("h3", { className: "dsn-card-title" }, note.title || t("editorTitle")),
          note.pinned ? h("span", { className: "dsn-pin", title: t("pinned") }, h(Glyph, { name: "pin", size: 12, filled: true })) : null,
          h("span", { className: "dsn-spacer" }),
          h(
            "span",
            { className: "dsn-card-actions" },
            h(
              "button",
              {
                type: "button",
                className: "dsn-icon",
                title: note.pinned ? t("unpin") : t("pin"),
                "aria-label": note.pinned ? t("unpin") : t("pin"),
                "aria-pressed": note.pinned ? "true" : "false",
                "data-on": note.pinned ? "true" : "false",
                onClick: (event) => {
                  event.stopPropagation();
                  onPin(note);
                }
              },
              h(Glyph, { name: "pin", filled: note.pinned })
            ),
            h(
              "button",
              {
                type: "button",
                className: "dsn-icon",
                title: archived ? t("restore") : t("archive"),
                "aria-label": archived ? t("restore") : t("archive"),
                onClick: (event) => {
                  event.stopPropagation();
                  if (archived) onRestore(note);
                  else onArchive(note);
                }
              },
              h(Glyph, { name: archived ? "restore" : "trash" })
            )
          )
        ),
        note.body.trim() === "" ? null : h("p", { className: "dsn-card-text" }, previewOf(note.body)),
        h(
          "div",
          { className: "dsn-card-foot" },
          h("span", {}, formatRelative(archived ? note.archivedAt : note.updatedAt, t)),
          h("span", { className: "dsn-spacer" }),
          note.color === "plain" ? null : h("span", { className: "dsn-swatch", style: accentStyle(note.color), "aria-hidden": true })
        )
      );
    }

    /** The editor dialog for one note, with debounced auto-save. */
    function NoteEditor(props) {
      const { note, t, onPatch, onArchive, onRestore, onPurge, onDuplicate, onClose } = props;
      const archived = archivedOf(note);
      const [draft, setDraft] = useState({ title: note.title, body: note.body });
      const [color, setColor] = useState(note.color);
      const [pinned, setPinned] = useState(note.pinned);
      const [saveState, setSaveState] = useState("idle");
      const [armed, setArmed] = useState(false);
      const [copied, setCopied] = useState(false);
      const timer = useRef(null);
      const confirmTimer = useRef(null);

      useEffect(
        () => () => {
          if (timer.current !== null) clearTimeout(timer.current);
          if (confirmTimer.current !== null) clearTimeout(confirmTimer.current);
        },
        []
      );

      function schedule(next) {
        setDraft(next);
        setSaveState("saving");
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
          timer.current = null;
          try {
            await onPatch(note.id, { title: next.title, body: next.body });
            setSaveState("saved");
          } catch {
            setSaveState("failed");
          }
        }, SAVE_DELAY_MS);
      }

      async function applyNow(patch) {
        setSaveState("saving");
        try {
          await onPatch(note.id, patch);
          setSaveState("saved");
        } catch {
          setSaveState("failed");
        }
      }

      function armPurge() {
        if (armed) {
          onPurge(note.id);
          return;
        }
        setArmed(true);
        if (confirmTimer.current !== null) clearTimeout(confirmTimer.current);
        confirmTimer.current = setTimeout(() => {
          confirmTimer.current = null;
          setArmed(false);
        }, CONFIRM_TIMEOUT_MS);
      }

      const saveLabel =
        saveState === "saved" ? t("saved") : saveState === "failed" ? t("saveFailed") : saveState === "saving" ? t("saving") : "";

      return h(
        "div",
        {
          className: "dsn-modal",
          role: "presentation",
          onMouseDown: (event) => {
            if (event.target === event.currentTarget) onClose();
          }
        },
        h(
          "div",
          {
            className: "dsn-dialog",
            role: "dialog",
            "aria-modal": "true",
            "aria-label": t("editNote"),
            "data-color": color,
            style: accentStyle(color)
          },
          h("input", {
            className: "dsn-dialog-title",
            value: draft.title,
            placeholder: t("editorTitle"),
            "aria-label": t("editorTitle"),
            spellCheck: false,
            onChange: (event) => schedule({ title: event.target.value, body: draft.body })
          }),
          h(
            "div",
            { className: "dsn-dialog-row" },
            h("span", { className: "dsn-field" }, t("colorLabel")),
            h(
              "div",
              { className: "dsn-colors", role: "group", "aria-label": t("colorLabel") },
              COLORS.map((id) =>
                h("button", {
                  key: id,
                  type: "button",
                  className: "dsn-swatch",
                  "data-color": id,
                  "data-active": color === id ? "true" : "false",
                  title: t(COLOR_LABELS[id]),
                  "aria-label": t(COLOR_LABELS[id]),
                  "aria-pressed": color === id ? "true" : "false",
                  style: accentStyle(id),
                  onClick: () => {
                    setColor(id);
                    void applyNow({ color: id });
                  }
                })
              )
            ),
            h("span", { className: "dsn-spacer" }),
            h(
              "button",
              {
                type: "button",
                className: "dsn-ghost",
                "aria-pressed": pinned ? "true" : "false",
                "data-on": pinned ? "true" : "false",
                onClick: () => {
                  setPinned(!pinned);
                  void applyNow({ pinned: !pinned });
                }
              },
              h(Glyph, { name: "pin", filled: pinned }),
              " ",
              pinned ? t("pinned") : t("pin")
            )
          ),
          h("textarea", {
            className: "dsn-dialog-body",
            value: draft.body,
            placeholder: t("editorBody"),
            "aria-label": t("editorBody"),
            spellCheck: false,
            onChange: (event) => schedule({ title: draft.title, body: event.target.value })
          }),
          h(
            "div",
            { className: "dsn-dialog-foot" },
            h("span", { className: "dsn-save", "data-state": saveState, role: "status" }, saveLabel),
            h("span", {}, fill(t("chars"), { n: draft.body.length })),
            h("span", { className: "dsn-spacer" }),
            h(
              "button",
              {
                type: "button",
                className: "dsn-ghost",
                title: t("copy"),
                onClick: async () => {
                  try {
                    await navigator.clipboard.writeText(`${draft.title}\n\n${draft.body}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  } catch {
                    setCopied(false);
                  }
                }
              },
              copied ? t("copied") : t("copy")
            ),
            h(
              "button",
              {
                type: "button",
                className: "dsn-ghost",
                title: t("duplicate"),
                onClick: () => onDuplicate(note.id)
              },
              t("duplicate")
            ),
            archived
              ? h(
                  "button",
                  {
                    type: "button",
                    className: "dsn-ghost",
                    onClick: () => onRestore(note.id)
                  },
                  t("restore")
                )
              : h(
                  "button",
                  {
                    type: "button",
                    className: "dsn-ghost",
                    onClick: () => onArchive(note.id)
                  },
                  t("archive")
                ),
            h(
              "button",
              {
                type: "button",
                className: "dsn-ghost",
                "data-armed": armed ? "true" : "false",
                onClick: armPurge
              },
              armed ? t("confirmPurge") : t("purge")
            ),
            h(
              "button",
              {
                type: "button",
                className: "dsn-icon",
                title: t("close"),
                "aria-label": t("close"),
                onClick: onClose
              },
              h(Glyph, { name: "close" })
            )
          )
        )
      );
    }

    /** The board registered on the `main` slot. */
    function Board(props) {
      const t = typeof props?.t === "function" ? props.t : fallbackTranslate;
      const routePath = props?.routePath ?? configuredRoutePath();
      const prefs = useMemo(readPrefs, []);
      const [notes, setNotes] = useState([]);
      const [status, setStatus] = useState("loading");
      const [error, setError] = useState("");
      const [query, setQuery] = useState("");
      const [color, setColor] = useState("all");
      const [view, setView] = useState("all");
      const [sort, setSort] = useState(prefs.sort);
      const [density, setDensity] = useState(prefs.density);
      const [editingId, setEditingId] = useState(null);
      const [toast, setToast] = useState(null);
      const [trashArmed, setTrashArmed] = useState(false);
      const searchRef = useRef(null);
      const trashTimer = useRef(null);

      useEffect(() => {
        writePrefs({ density, sort });
      }, [density, sort]);

      const load = useCallback(async () => {
        try {
          const data = await request(routePath, null);
          setNotes(Array.isArray(data.notes) ? data.notes : []);
          setStatus("ready");
          setError("");
        } catch (failure) {
          setStatus("failed");
          setError(String(failure && failure.message ? failure.message : failure));
        }
      }, [routePath]);

      useEffect(() => {
        load();
      }, [load]);

      // The assistant writes through the same store: refresh when the window
      // comes back so a note created in the conversation shows up.
      useEffect(() => {
        const refresh = () => {
          void load();
        };
        const onVisibility = () => {
          if (document.visibilityState !== "hidden") refresh();
        };
        window.addEventListener("focus", refresh);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
          window.removeEventListener("focus", refresh);
          document.removeEventListener("visibilitychange", onVisibility);
        };
      }, [load]);

      const counts = useMemo(() => countsOf(notes), [notes]);
      const visible = useMemo(
        () => sortNotes(filterNotes(notes, { view, color, query }), sort),
        [notes, view, color, query, sort]
      );
      const editing = notes.find((note) => note.id === editingId) ?? null;

      const showToast = useCallback((message, action) => {
        setToast({ message, action });
      }, []);

      useEffect(() => {
        if (toast === null) return undefined;
        const timer = setTimeout(() => setToast(null), TOAST_TIMEOUT_MS);
        return () => clearTimeout(timer);
      }, [toast]);

      useEffect(
        () => () => {
          if (trashTimer.current !== null) clearTimeout(trashTimer.current);
        },
        []
      );

      const createNote = useCallback(async () => {
        try {
          const data = await request(routePath, { action: "create", title: "", body: "", color: color === "all" ? "plain" : color });
          setNotes(Array.isArray(data.notes) ? data.notes : []);
          setStatus("ready");
          if (data.note && typeof data.note.id === "string") setEditingId(data.note.id);
        } catch (failure) {
          setStatus("failed");
          setError(String(failure && failure.message ? failure.message : failure));
        }
      }, [routePath, color]);

      const patchNote = useCallback(
        async (id, patch) => {
          const data = await request(routePath, { action: "update", id, ...patch });
          if (Array.isArray(data.notes)) setNotes(data.notes);
          return data.note;
        },
        [routePath]
      );

      const archiveNote = useCallback(
        async (id) => {
          const data = await request(routePath, { action: "archive", id });
          if (Array.isArray(data.notes)) setNotes(data.notes);
          if (editingId === id) setEditingId(null);
          showToast(t("archivedToast"), async () => {
            const restored = await request(routePath, { action: "restore", id });
            if (Array.isArray(restored.notes)) setNotes(restored.notes);
          });
        },
        [routePath, editingId, t, showToast]
      );

      const restoreNote = useCallback(
        async (id) => {
          const data = await request(routePath, { action: "restore", id });
          if (Array.isArray(data.notes)) setNotes(data.notes);
        },
        [routePath]
      );

      const purgeNote = useCallback(
        async (id) => {
          const data = await request(routePath, { action: "purge", id });
          if (Array.isArray(data.notes)) setNotes(data.notes);
          if (editingId === id) setEditingId(null);
          showToast(t("purgedToast"));
        },
        [routePath, editingId, t, showToast]
      );

      const duplicateNote = useCallback(
        async (id) => {
          const data = await request(routePath, { action: "duplicate", id });
          if (Array.isArray(data.notes)) setNotes(data.notes);
          if (data.note && typeof data.note.id === "string") setEditingId(data.note.id);
        },
        [routePath]
      );

      async function clearTrash() {
        if (!trashArmed) {
          setTrashArmed(true);
          if (trashTimer.current !== null) clearTimeout(trashTimer.current);
          trashTimer.current = setTimeout(() => {
            trashTimer.current = null;
            setTrashArmed(false);
          }, CONFIRM_TIMEOUT_MS);
          return;
        }
        setTrashArmed(false);
        const data = await request(routePath, { action: "clear-trash" });
        if (Array.isArray(data.notes)) setNotes(data.notes);
        setToast({ message: t("trashEmpty") });
      }

      // Ctrl/Cmd+N creates, Ctrl/Cmd+F focuses the search, Escape closes.
      useEffect(() => {
        const onKey = (event) => {
          const meta = event.ctrlKey || event.metaKey;
          const key = String(event.key).toLowerCase();
          if (meta && key === "n") {
            event.preventDefault();
            void createNote();
          } else if (meta && key === "f") {
            event.preventDefault();
            searchRef.current?.focus();
          } else if (event.key === "Escape" && editingId !== null) {
            setEditingId(null);
          }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
      }, [createNote, editingId]);

      function exportMarkdown() {
        const list = sortNotes(filterNotes(notes, { view: "all", color: "all", query: "" }), "updated");
        const lines = [`# ${t("panelTitle")}`, ""];
        for (const note of list) {
          lines.push(`## ${note.title}`, "");
          if (note.body.trim() !== "") lines.push(note.body, "");
          lines.push(`<!-- ${note.id} · ${note.color} · ${new Date(note.updatedAt).toISOString()} -->`, "");
        }
        const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "sticky-notes.md";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }

      const tabs = [
        { id: "all", label: t("viewAll"), count: counts.all },
        { id: "pinned", label: t("viewPinned"), count: counts.pinned },
        { id: "trash", label: t("viewTrash"), count: counts.trash }
      ];

      const header = h(
        "header",
        { className: "dsn-header" },
        h("span", { className: "dsn-title" }, t("panelTitle")),
        h("span", { className: "dsn-count" }, fill(t("count"), { n: counts.all })),
        h("span", { className: "dsn-spacer" }),
        h("button", { type: "button", className: "dsn-primary", onClick: createNote, title: "Ctrl/Cmd+N" }, t("newNote"))
      );

      const toolbar = h(
        "div",
        { className: "dsn-toolbar" },
        h("input", {
          ref: searchRef,
          className: "dsn-search",
          type: "search",
          value: query,
          placeholder: t("search"),
          "aria-label": t("search"),
          spellCheck: false,
          onChange: (event) => setQuery(event.target.value)
        }),
        h(
          "div",
          { className: "dsn-tabs", role: "tablist", "aria-label": t("panelTitle") },
          tabs.map((tab) =>
            h(
              "button",
              {
                key: tab.id,
                type: "button",
                role: "tab",
                className: "dsn-tab",
                "data-active": view === tab.id ? "true" : "false",
                "aria-selected": view === tab.id ? "true" : "false",
                onClick: () => setView(tab.id)
              },
              tab.label,
              h("span", { className: "dsn-tabcount" }, String(tab.count))
            )
          )
        ),
        h(
          "div",
          { className: "dsn-colors", role: "group", "aria-label": t("filterColor") },
          h(
            "button",
            {
              type: "button",
              className: "dsn-ghost",
              "data-active": color === "all" ? "true" : "false",
              "aria-pressed": color === "all" ? "true" : "false",
              onClick: () => setColor("all")
            },
            t("allColors")
          ),
          COLORS.map((id) =>
            h("button", {
              key: id,
              type: "button",
              className: "dsn-swatch",
              "data-color": id,
              "data-active": color === id ? "true" : "false",
              title: t(COLOR_LABELS[id]),
              "aria-label": t(COLOR_LABELS[id]),
              "aria-pressed": color === id ? "true" : "false",
              style: accentStyle(id),
              onClick: () => setColor(color === id ? "all" : id)
            })
          )
        ),
        h(
          "label",
          { className: "dsn-field" },
          t("sort"),
          h(
            "select",
            { className: "dsn-select", value: sort, "aria-label": t("sort"), onChange: (event) => setSort(event.target.value) },
            h("option", { value: "updated" }, t("sortUpdated")),
            h("option", { value: "created" }, t("sortCreated")),
            h("option", { value: "title" }, t("sortTitle"))
          )
        ),
        h(
          "label",
          { className: "dsn-field" },
          t("density"),
          h(
            "select",
            { className: "dsn-select", value: density, "aria-label": t("density"), onChange: (event) => setDensity(event.target.value) },
            DENSITIES.map((id) =>
              h("option", { key: id, value: id }, id === "auto" ? t("densityAuto") : fill(t("densityN"), { n: id }))
            )
          )
        ),
        h("span", { className: "dsn-spacer" }),
        view === "trash" && counts.trash > 0
          ? h(
              "button",
              { type: "button", className: "dsn-ghost", "data-armed": trashArmed ? "true" : "false", onClick: clearTrash },
              trashArmed ? t("confirmClearTrash") : t("clearTrash")
            )
          : null,
        h("button", { type: "button", className: "dsn-ghost", onClick: exportMarkdown }, t("exportAll"))
      );

      let body;
      if (status === "failed") {
        body = h(
          "div",
          { className: "dsn-error", role: "alert" },
          h("span", {}, t("loadFailed") + (error === "" ? "" : "：" + error)),
          h("button", { type: "button", className: "dsn-retry", onClick: load }, t("retry"))
        );
      } else if (visible.length === 0) {
        const message =
          view === "trash"
            ? t("emptyTrash")
            : view === "pinned"
              ? t("emptyPinned")
              : notes.length === 0
                ? t("empty") + " " + t("emptyHint")
                : t("emptyFiltered");
        body = h("p", { className: "dsn-empty" }, message);
      } else {
        body = h(
          "div",
          { className: "dsn-board", "data-density": density },
          visible.map((note) =>
            h(NoteCard, {
              key: note.id,
              note,
              t,
              onOpen: setEditingId,
              onPin: (target) => void patchNote(target.id, { pinned: !target.pinned }),
              onArchive: (target) => void archiveNote(target.id),
              onRestore: (target) => void restoreNote(target.id)
            })
          )
        );
      }

      return h(
        "div",
        { "data-dsh-sticky-notes": "", "data-status": status, "data-view": view },
        header,
        toolbar,
        h("div", { className: "dsn-body" }, body),
        editing === null
          ? null
          : h(NoteEditor, {
              key: editing.id,
              note: editing,
              t,
              onPatch: patchNote,
              onArchive: (id) => void archiveNote(id),
              onRestore: (id) => void restoreNote(id),
              onPurge: (id) => void purgeNote(id),
              onDuplicate: (id) => void duplicateNote(id),
              onClose: () => setEditingId(null)
            }),
        toast === null
          ? null
          : h(
              "div",
              { className: "dsn-toast", role: "status" },
              h("span", {}, toast.message),
              toast.action
                ? h(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        const action = toast.action;
                        setToast(null);
                        void action();
                      }
                    },
                    t("undo")
                  )
                : null
            )
      );
    }

    /** Browser-side services this half needs. */
    const inject = ["slots", "locale"];

    /**
     * Register the sidebar entry, the board, and the dictionaries.
     * @param ctx - client root context.
     */
    function apply(ctx) {
      const removeStyle = installStyle();
      ctx.effect(() => () => removeStyle(), "sticky-notes: styles");

      const t = ctx.locale.bind(NS);
      fallbackTranslate = t;
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "sticky-notes: dictionaries");
      const routePath = configuredRoutePath();

      ctx.slots.inject("main", () =>
        ctx.slots.register({ name: "main", key: PANEL_ID, locale: NS }, (props) =>
          h(Board, Object.assign({}, props, { t, routePath }))
        )
      );

      ctx.slots.inject("sidebar.panellist", () =>
        ctx.slots.register(
          { name: "sidebar.panellist", id: PANEL_ID, order: 40, label: () => t("panelTitle"), locale: NS },
          (props) => h(Icon, { size: props?.size, active: props?.active === true })
        )
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.configuredRoutePath = configuredRoutePath;
    exports.previewOf = previewOf;
    exports.matchesNote = matchesNote;
    exports.filterNotes = filterNotes;
    exports.sortNotes = sortNotes;
    exports.countsOf = countsOf;
    exports.formatRelative = formatRelative;
    exports.accents = ACCENTS;
    exports.COLORS = COLORS;
    exports.DENSITIES = DENSITIES;
    exports.SORTS = SORTS;
    exports.PANEL_ID = PANEL_ID;
    exports.DEFAULT_ROUTE_PATH = DEFAULT_ROUTE_PATH;
    return module.exports;
  }
});
