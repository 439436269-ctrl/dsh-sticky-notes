# dsh-sticky-notes（便签）

给 DeepSeek Harness 左侧栏加一个便签面板，并给助手四个 `note_*` 工具读写同一批便签。

- **左侧栏入口**：在 Plugins / Schedules 旁边多一个便签图标，点开就是便签面板。
- **面板**：左侧可搜索的列表 + 右侧标题/正文编辑器。停止输入约 0.6 秒后自动保存，
  底部显示「保存中… / 已保存」。
- **数据落在存储域**：便签存在插件自己的 storage domain（`sticky_notes` 的 `notes` 表，
  位于 `$DSH_HOME/storages`），不用 `localStorage` —— 换端口、换浏览器、重启桌面端都不丢。
- **助手可写**：`note_create` / `note_list` / `note_update` / `note_delete`。
  说「记一条：明天 10 点交周报」，便签会立刻出现在面板里。

## 安装

```sh
dsh plugin add @vfvrpq/dsh-sticky-notes      # 从 npm 装
dsh plugin add /path/to/dsh-sticky-notes     # 本地目录，开发时用
```

bundle patch 插入一行 `sticky-notes`；`dsh.client` 让 Web 端把 `lib/client.js` 当浏览器半加载。
目录安装不需要重启：宿主自己重载该行，刷新页面即可拿到新的客户端 bundle。

```sh
dsh --profile <名字> --dump-config | grep sticky-notes
```

## 工具

| 工具 | 参数 | 作用 |
|---|---|---|
| `note_list` | `query?` | 按更新时间倒序列出；`query` 过滤标题与正文 |
| `note_create` | `body`、`title?` | 新建；不给标题时取正文第一行 |
| `note_update` | `id`、`title?`、`body?` | 改一条；没给的字段保持原值 |
| `note_delete` | `id` | 删一条 |

四个工具都返回一个文本块。id 形如 `note-<36 进制时间>-<随机串>`。

## 界面与数据

- 侧栏入口与主面板用同一个 id（`sticky-notes`）注册，所以点图标自然切到本面板。
- 面板只认一条鉴权路由：`GET /api/dsh-notes` 取列表，`POST /api/dsh-notes`
  带 `action: create | update | delete` 改数据。路由挂在 `/api` 下，先过连接层的
  Host/Origin 与浏览器会话校验。
- 路由路径通过服务端注入页面（`__DSH_STICKY_NOTES_CONFIG__`），浏览器半不写死。

## 目录

```
lib/index.js    接线：存储域、路由、工具、页面注入
lib/config.js   路由路径、域名字、长度上限
lib/notes.js    纯函数：整形、打补丁、排序（无运行时依赖）
lib/domain.js   存储域与仓库
lib/route.js    /api/dsh-notes 处理器
lib/tools.js    四个工具
lib/client.js   浏览器半：侧栏入口、面板、词典、样式
locale/*.json   插件列表用的 meta.title / meta.description
```

## 边界

- 正文上限 20,000 字、标题 200 字，超出截断而不是报错。
- 没有文件夹、标签、颜色，也没有跨 Host 同步。
- 删除立即生效且不可撤销（面板要求点两次确认）。

## 测试

```sh
node --test test/*.test.js
```

真机挂载与非浏览器侧验证记录见 `VERIFY.md`。

## 许可

MIT。
