# dsh-sticky-notes（便签）

给 DeepSeek Harness 左侧栏加一面可平铺的便签墙，并给助手四个 `note_*` 工具读写同一批便签。

- **左侧栏入口**：在 Plugins / Schedules 旁边多一个便签图标，点开就是便签墙。
- **平铺排列**：「每行」可选 2 / 3 / 4 / 5 个或自适应铺满，选择会记住。
- **颜色**：7 种色板（默认、琥珀、玫瑰、薄荷、天蓝、紫罗兰、石板）；卡片底色、描边与色点
  共用同一种强调色，工具栏还能按颜色筛选。
- **置顶**：置顶的便签始终排在最前，卡片上带一个小图钉。
- **回收站**：删除变成软删除，进回收站后可以恢复、永久删除或一键清空；底部提示条带「撤销」。
- **编辑器**：点卡片打开弹层，可改标题/正文/颜色/置顶，看字数，复制、复制一份、移入回收站/恢复、
  永久删除。停止输入约 0.55 秒自动保存。
- **搜索、排序、导出**：标题+正文全文搜索，按最近更新 / 创建时间 / 标题排序，一键导出 Markdown。
- **快捷键**：`Ctrl/Cmd+N` 新建、`Ctrl/Cmd+F` 聚焦搜索、`Esc` 关闭弹层。
- **数据落在存储域**：存在插件自己的 storage domain（`sticky_notes` 的 `notes` 表，位于
  `$DSH_HOME/storages`），不用 `localStorage` —— 换端口、换浏览器、重启桌面端都不丢。
- **助手可写**：`note_create` / `note_list` / `note_update` / `note_delete`。
  说「记一条：明天 10 点交周报，放琥珀色」，卡片会立刻出现在便签墙上。

## 安装

```sh
dsh plugin add @vfvrpq/dsh-sticky-notes      # 从 npm 装
dsh plugin add /path/to/dsh-sticky-notes     # 本地目录，开发时用
```

bundle patch 插入一行 `sticky-notes`；`dsh.client` 让 Web 端把 `lib/client.js` 当浏览器半加载。
目录安装不需要重启应用（宿主自己重载该行），但已经打开的标签页要在下次加载时才会换到新 bundle。

```sh
dsh --profile <名字> --dump-config | grep sticky-notes
```

## 工具

| 工具 | 参数 | 作用 |
|---|---|---|
| `note_create` | `body`、`title?`、`color?`、`pinned?` | 新建；不给标题时取正文第一行 |
| `note_list` | `query?`、`color?`、`pinned?`、`includeArchived?`、`sort?` | 按便签墙的筛选列出；默认不含回收站 |
| `note_update` | `id`、`title?`、`body?`、`color?`、`pinned?`、`archived?` | 改一条；`archived: false` 即恢复 |
| `note_delete` | `id`、`permanent?` | 默认移入回收站，`permanent: true` 才彻底删除 |

四个工具都返回一个文本块。id 形如 `note-<36 进制时间>-<随机串>`。

## 界面与数据

- 侧栏入口与主面板用同一个 id（`sticky-notes`）注册，所以点图标自然切到便签墙。
- 便签墙只认一条鉴权路由：`GET /api/dsh-notes` 取全部便签（含回收站），
  `POST /api/dsh-notes` 带 `action` 改数据（create / update / archive / restore / purge /
  duplicate / clear-trash）。路由挂在 `/api` 下，先过连接层的 Host/Origin 与会话校验。
- 路由路径通过服务端注入页面（`__DSH_STICKY_NOTES_CONFIG__`），浏览器半不写死。

## 目录

```
lib/index.js    接线：存储域、路由、工具、页面注入
lib/config.js   路由路径、域名字、长度上限
lib/palette.js  颜色 id（与浏览器半共用同一套取值）
lib/notes.js    纯函数：整形、打补丁、筛选、排序（无运行时依赖）
lib/domain.js   存储域与仓库（归档 / 恢复 / 彻底删除 / 复制）
lib/route.js    /api/dsh-notes 处理器
lib/tools.js    四个工具
lib/client.js   浏览器半：侧栏入口、平铺便签墙、编辑弹层、词典、样式
locale/*.json   插件列表用的 meta.title / meta.description
```

## 边界

- 正文上限 20,000 字、标题 200 字，超出截断而不是报错。
- 没有文件夹、标签，也没有跨 Host 同步。
- 顺序由「置顶 + 排序键」决定，没有拖拽排序。

## 测试

```sh
node --test test/*.test.js
```

`notes.test.js` 覆盖整形/颜色/置顶/回收站/排序规则，`route.test.js` 覆盖每个 HTTP 分支，
`client.test.js` 覆盖 bundle 注册与它的筛选排序副本，`adapter.test.js` 把真实 `lib/` 挂到
stub 的 Harness 包上，证明 `apply()` 的接线与卸载清理。

真机验证：起一个隔离 profile 的 Web 端，再用无头浏览器驱动。

```sh
dsh --profile <名字> --no-open --port 0      # 打印 http://127.0.0.1:<端口>/?token=…
node scripts/e2e-notes.mjs --base http://127.0.0.1:<端口> --token <token>
```

脚本会通过界面新建一条彩色置顶便签、把网格切到每行 3 个、搜索、移入回收站再恢复，
并断言刷新后颜色/置顶/内容都还在。实测记录见 `VERIFY.md`。

## 许可

MIT。
