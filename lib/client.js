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
    const useRef = React.useRef;
    const useCallback = React.useCallback;

    /** Locale namespace of this plugin (matches the slot registrations). */
    const NS = "stickyNotes";
    /** Sidebar entry id; the main panel registers the same key. */
    const PANEL_ID = "sticky-notes";
    /** Route the host half mounts at; overridden by the injected boot config. */
    const DEFAULT_ROUTE_PATH = "/api/dsh-notes";
    /** Boot global the host half writes into the served page. */
    const CONFIG_GLOBAL = "__DSH_STICKY_NOTES_CONFIG__";
    /** Quiet period after the last keystroke before the note is written. */
    const SAVE_DELAY_MS = 600;
    /** How long the inline delete confirmation stays armed. */
    const CONFIRM_TIMEOUT_MS = 4000;
    /** Preview length on a note card. */
    const PREVIEW_LENGTH = 96;

    const zh = {
      panelTitle: "便签",
      newNote: "新建便签",
      search: "搜索便签…",
      count: "{count} 条",
      empty: "还没有便签。",
      emptyHint: "点「新建便签」，或让助手用 note_create 记一条。",
      noMatch: "没有匹配的便签。",
      selectHint: "选择左侧一条便签开始编辑。",
      untitled: "无标题",
      titlePlaceholder: "标题",
      bodyPlaceholder: "写点什么…",
      delete: "删除",
      confirmDelete: "确认删除",
      saved: "已保存",
      saving: "保存中…",
      saveFailed: "保存失败",
      loadFailed: "便签加载失败",
      retry: "重试",
      justNow: "刚刚",
      minutesAgo: "{n} 分钟前",
      hoursAgo: "{n} 小时前",
      daysAgo: "{n} 天前"
    };

    const en = {
      panelTitle: "Notes",
      newNote: "New note",
      search: "Search notes…",
      count: "{count}",
      empty: "No notes yet.",
      emptyHint: "Click “New note”, or ask the assistant to run note_create.",
      noMatch: "No note matches that search.",
      selectHint: "Pick a note on the left to start editing.",
      untitled: "Untitled",
      titlePlaceholder: "Title",
      bodyPlaceholder: "Write something…",
      delete: "Delete",
      confirmDelete: "Confirm delete",
      saved: "Saved",
      saving: "Saving…",
      saveFailed: "Save failed",
      loadFailed: "Could not load notes",
      retry: "Retry",
      justNow: "just now",
      minutesAgo: "{n} min ago",
      hoursAgo: "{n} h ago",
      daysAgo: "{n} d ago"
    };

    /** Scoped styles; every selector starts at the panel root attribute. */
    const STYLE = [
      '[data-dsh-sticky-notes]{display:flex;flex-direction:column;flex:1 1 auto;height:100%;min-height:0;box-sizing:border-box;color:var(--dsw-alias-label-primary,#1f2329);background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.94));font-size:13px}',
      '[data-dsh-sticky-notes] .dsn-header{display:flex;align-items:center;gap:8px;flex:none;padding:12px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}',
      '[data-dsh-sticky-notes] .dsn-title{font-size:14px;font-weight:600}',
      '[data-dsh-sticky-notes] .dsn-count{font-size:12px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.55));font-variant-numeric:tabular-nums}',
      '[data-dsh-sticky-notes] .dsn-spacer{flex:1 1 auto}',
      '[data-dsh-sticky-notes] .dsn-primary{appearance:none;border:0;border-radius:8px;padding:6px 12px;font:inherit;font-size:12px;font-weight:500;cursor:pointer;color:#fff;background:var(--dsw-alias-brand-primary,#2c6ef2)}',
      '[data-dsh-sticky-notes] .dsn-primary:hover{filter:brightness(1.06)}',
      '[data-dsh-sticky-notes] .dsn-primary:active{filter:brightness(.96)}',
      '[data-dsh-sticky-notes] .dsn-body{display:flex;flex:1 1 auto;min-height:0;min-width:0}',
      '[data-dsh-sticky-notes] .dsn-list{display:flex;flex-direction:column;flex:none;width:264px;min-height:0;border-right:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08))}',
      '[data-dsh-sticky-notes] .dsn-search{margin:10px 10px 6px;padding:6px 10px;border-radius:8px;border:1px solid transparent;outline:none;font:inherit;font-size:12px;color:var(--dsw-alias-label-primary,#1f2329);background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05))}',
      '[data-dsh-sticky-notes] .dsn-search:focus{border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.18))}',
      '[data-dsh-sticky-notes] .dsn-items{display:flex;flex-direction:column;gap:4px;flex:1 1 auto;min-height:0;overflow:auto;padding:4px 8px 12px}',
      '[data-dsh-sticky-notes] .dsn-card{display:flex;flex-direction:column;gap:2px;align-items:flex-start;width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid transparent;border-radius:10px;background:transparent;font:inherit;text-align:left;cursor:pointer;color:inherit}',
      '[data-dsh-sticky-notes] .dsn-card:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.05))}',
      '[data-dsh-sticky-notes] .dsn-card[data-active="true"]{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));border-color:var(--dsw-alias-border-l2,rgba(0,0,0,.16))}',
      '[data-dsh-sticky-notes] .dsn-card-title{max-width:100%;font-weight:600;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '[data-dsh-sticky-notes] .dsn-card-preview{max-width:100%;font-size:11.5px;line-height:1.45;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.56));overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '[data-dsh-sticky-notes] .dsn-card-time{font-size:11px;color:var(--dsw-alias-state-idle-primary,rgba(0,0,0,.4))}',
      '[data-dsh-sticky-notes] .dsn-editor{display:flex;flex-direction:column;gap:8px;flex:1 1 auto;min-width:0;min-height:0;padding:14px 20px 12px}',
      '[data-dsh-sticky-notes] .dsn-editor-title{border:0;outline:none;background:transparent;font:inherit;font-size:18px;font-weight:600;color:inherit;padding:0}',
      '[data-dsh-sticky-notes] .dsn-editor-title::placeholder{color:var(--dsw-alias-state-idle-primary,rgba(0,0,0,.34))}',
      '[data-dsh-sticky-notes] .dsn-editor-body{flex:1 1 auto;min-height:0;width:100%;box-sizing:border-box;border:0;outline:none;resize:none;background:transparent;font:inherit;font-size:13px;line-height:1.7;color:inherit;padding:0}',
      '[data-dsh-sticky-notes] .dsn-editor-body::placeholder{color:var(--dsw-alias-state-idle-primary,rgba(0,0,0,.34))}',
      '[data-dsh-sticky-notes] .dsn-footer{display:flex;align-items:center;gap:10px;flex:none;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l1,rgba(0,0,0,.08));font-size:11.5px;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.56))}',
      '[data-dsh-sticky-notes] .dsn-save[data-state="saved"]{color:var(--dsw-alias-state-success-primary,#128a3a)}',
      '[data-dsh-sticky-notes] .dsn-save[data-state="failed"]{color:var(--dsw-alias-state-error-primary,#d32029)}',
      '[data-dsh-sticky-notes] .dsn-ghost{appearance:none;border:0;border-radius:8px;padding:5px 10px;font:inherit;font-size:11.5px;cursor:pointer;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.6));background:transparent}',
      '[data-dsh-sticky-notes] .dsn-ghost:hover{background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#1f2329)}',
      '[data-dsh-sticky-notes] .dsn-ghost[data-armed="true"]{color:var(--dsw-alias-state-error-primary,#d32029);background:var(--dsw-alias-bg-layer-2,rgba(0,0,0,.06))}',
      '[data-dsh-sticky-notes] .dsn-empty{margin:0;padding:18px 16px;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,rgba(0,0,0,.55))}',
      '[data-dsh-sticky-notes] .dsn-editor-empty{align-items:flex-start;justify-content:flex-start}',
      '[data-dsh-sticky-notes] .dsn-error{display:flex;flex-direction:column;gap:10px;align-items:flex-start;padding:24px 20px;font-size:12.5px;color:var(--dsw-alias-state-error-primary,#d32029)}',
      '[data-dsh-sticky-notes] .dsn-retry{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.16));border-radius:8px;padding:5px 12px;font:inherit;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-primary,#1f2329);background:transparent}'
    ].join("\n");

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
      const tagId = "dsh-sticky-notes/panel.css";
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
      const haystack = `${note.title}\n${note.body}`.toLowerCase();
      return haystack.includes(term);
    }

    /**
     * Human relative time for a timestamp.
     * @param value - epoch ms.
     * @param t - translator.
     * @returns a short localized label.
     */
    function formatRelative(value, t) {
      const translate = typeof t === "function" ? t : fallbackTranslate;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
      const then = value;
      const diff = Date.now() - then;
      const minute = 60000;
      const hour = 60 * minute;
      const day = 24 * hour;
      if (!Number.isFinite(diff) || diff < minute) return translate("justNow");
      if (diff < hour) return fill(translate("minutesAgo"), { n: Math.floor(diff / minute) });
      if (diff < day) return fill(translate("hoursAgo"), { n: Math.floor(diff / hour) });
      if (diff < 7 * day) return fill(translate("daysAgo"), { n: Math.floor(diff / day) });
      return new Date(then).toLocaleDateString();
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

    /** The sidebar entry: a linear note glyph sized by the owner. */
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

    /**
     * The notes panel registered on the `main` slot.
     * @param props - slot props plus the injected `t` and `routePath`.
     */
    function Panel(props) {
      const t = typeof props?.t === "function" ? props.t : fallbackTranslate;
      const routePath = props?.routePath ?? configuredRoutePath();
      const [notes, setNotes] = useState([]);
      const [status, setStatus] = useState("loading");
      const [error, setError] = useState("");
      const [query, setQuery] = useState("");
      const [selectedId, setSelectedId] = useState(null);
      const [draft, setDraft] = useState({ title: "", body: "" });
      const [saveState, setSaveState] = useState("idle");
      const [armed, setArmed] = useState(false);
      const saveTimer = useRef(null);
      const confirmTimer = useRef(null);

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

      // The assistant writes through the same store, so refresh whenever the
      // window comes back: otherwise a note created in the conversation would
      // only appear after the next mount.
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

      useEffect(
        () => () => {
          if (saveTimer.current !== null) clearTimeout(saveTimer.current);
          if (confirmTimer.current !== null) clearTimeout(confirmTimer.current);
        },
        []
      );

      // Keep a valid selection while the list changes under it.
      useEffect(() => {
        if (status !== "ready") return;
        if (selectedId !== null && notes.some((note) => note.id === selectedId)) return;
        setSelectedId(notes.length > 0 ? notes[0].id : null);
      }, [status, notes, selectedId]);

      const selected = notes.find((note) => note.id === selectedId) ?? null;

      // Load the draft only when a different note is selected, so a background
      // refresh never overwrites what is being typed.
      useEffect(() => {
        const current = notes.find((note) => note.id === selectedId) ?? null;
        setDraft(current === null ? { title: "", body: "" } : { title: current.title, body: current.body });
        setSaveState("idle");
        setArmed(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [selectedId]);

      async function createNote() {
        try {
          setSaveState("saving");
          const data = await request(routePath, { action: "create", title: "", body: "" });
          setNotes(Array.isArray(data.notes) ? data.notes : []);
          setStatus("ready");
          if (data.note && typeof data.note.id === "string") setSelectedId(data.note.id);
          setSaveState("idle");
        } catch (failure) {
          setSaveState("failed");
          setError(String(failure && failure.message ? failure.message : failure));
        }
      }

      function edit(next) {
        setDraft(next);
        if (selectedId === null) return;
        const id = selectedId;
        setSaveState("saving");
        if (saveTimer.current !== null) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          saveTimer.current = null;
          try {
            const data = await request(routePath, {
              action: "update",
              id,
              title: next.title,
              body: next.body
            });
            if (Array.isArray(data.notes)) setNotes(data.notes);
            setSaveState("saved");
          } catch (failure) {
            setSaveState("failed");
            setError(String(failure && failure.message ? failure.message : failure));
          }
        }, SAVE_DELAY_MS);
      }

      async function removeSelected() {
        if (selectedId === null) return;
        try {
          const data = await request(routePath, { action: "delete", id: selectedId });
          setNotes(Array.isArray(data.notes) ? data.notes : []);
          setSelectedId(null);
          setSaveState("idle");
          setArmed(false);
        } catch (failure) {
          setSaveState("failed");
          setError(String(failure && failure.message ? failure.message : failure));
        }
      }

      function armDelete() {
        if (armed) {
          if (confirmTimer.current !== null) clearTimeout(confirmTimer.current);
          removeSelected();
          return;
        }
        setArmed(true);
        if (confirmTimer.current !== null) clearTimeout(confirmTimer.current);
        confirmTimer.current = setTimeout(() => {
          confirmTimer.current = null;
          setArmed(false);
        }, CONFIRM_TIMEOUT_MS);
      }

      const visible = notes.filter((note) => matchesNote(note, query));
      const saveLabel = saveState === "saved" ? t("saved") : saveState === "failed" ? t("saveFailed") : saveState === "saving" ? t("saving") : "";

      const header = h(
        "header",
        { className: "dsn-header" },
        h("span", { className: "dsn-title" }, t("panelTitle")),
        h("span", { className: "dsn-count" }, fill(t("count"), { count: notes.length })),
        h("span", { className: "dsn-spacer" }),
        h("button", { type: "button", className: "dsn-primary", onClick: createNote }, t("newNote"))
      );

      if (status === "failed") {
        return h(
          "div",
          { "data-dsh-sticky-notes": "", "data-status": "failed" },
          header,
          h(
            "div",
            { className: "dsn-error", role: "alert" },
            h("span", {}, t("loadFailed") + (error === "" ? "" : "：" + error)),
            h("button", { type: "button", className: "dsn-retry", onClick: load }, t("retry"))
          )
        );
      }

      const list = h(
        "section",
        { className: "dsn-list", "aria-label": t("panelTitle") },
        h("input", {
          className: "dsn-search",
          type: "search",
          value: query,
          placeholder: t("search"),
          spellCheck: false,
          onChange: (event) => setQuery(event.target.value)
        }),
        h(
          "div",
          { className: "dsn-items" },
          visible.length === 0
            ? h(
                "p",
                { className: "dsn-empty" },
                notes.length === 0 ? t("empty") + " " + t("emptyHint") : t("noMatch")
              )
            : visible.map((note) =>
                h(
                  "button",
                  {
                    key: note.id,
                    type: "button",
                    className: "dsn-card",
                    "data-active": note.id === selectedId ? "true" : "false",
                    onClick: () => setSelectedId(note.id)
                  },
                  h("span", { className: "dsn-card-title" }, note.title || t("untitled")),
                  note.body.trim() === ""
                    ? null
                    : h("span", { className: "dsn-card-preview" }, previewOf(note.body)),
                  h("span", { className: "dsn-card-time" }, formatRelative(note.updatedAt, t))
                )
              )
        )
      );

      const editor =
        selected === null
          ? notes.length === 0
            ? h("section", { className: "dsn-editor dsn-editor-empty" })
            : h("section", { className: "dsn-editor dsn-editor-empty" }, h("p", { className: "dsn-empty" }, t("selectHint")))
          : h(
              "section",
              { className: "dsn-editor" },
              h("input", {
                className: "dsn-editor-title",
                value: draft.title,
                placeholder: t("titlePlaceholder"),
                "aria-label": t("titlePlaceholder"),
                spellCheck: false,
                onChange: (event) => edit({ title: event.target.value, body: draft.body })
              }),
              h("textarea", {
                className: "dsn-editor-body",
                value: draft.body,
                placeholder: t("bodyPlaceholder"),
                "aria-label": t("bodyPlaceholder"),
                spellCheck: false,
                onChange: (event) => edit({ title: draft.title, body: event.target.value })
              }),
              h(
                "footer",
                { className: "dsn-footer" },
                h("span", { className: "dsn-save", "data-state": saveState, role: "status" }, saveLabel),
                h("span", { className: "dsn-spacer" }),
                h("span", {}, formatRelative(selected.updatedAt, t)),
                h(
                  "button",
                  {
                    type: "button",
                    className: "dsn-ghost",
                    "data-armed": armed ? "true" : "false",
                    onClick: armDelete
                  },
                  armed ? t("confirmDelete") : t("delete")
                )
              )
            );

      return h(
        "div",
        { "data-dsh-sticky-notes": "", "data-status": status },
        header,
        h("div", { className: "dsn-body" }, list, editor)
      );
    }

    /** Browser-side services this half needs. */
    const inject = ["slots", "locale"];

    /**
     * Register the sidebar entry, the panel, and the dictionaries.
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
          h(Panel, Object.assign({}, props, { t, routePath }))
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
    exports.formatRelative = formatRelative;
    exports.PANEL_ID = PANEL_ID;
    exports.DEFAULT_ROUTE_PATH = DEFAULT_ROUTE_PATH;
    return module.exports;
  }
});
