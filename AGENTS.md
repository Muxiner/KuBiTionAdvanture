# 项目约定（AGENTS.md）

## 自动提交（重要）
- 每完成一轮用户请求的修改后，**自动将改动提交到 git 仓库**，无需用户再次要求。
- 提交前先查看 `git status` / `git diff`，只提交与本轮相关的文件，绝不提交密钥或无关产物。
- 提交信息用简洁中文描述本轮改动。
- 默认只 `commit`，**不 `push`**，除非用户明确要求推送。

## 预编译与提交（v0.54）
- 改完 `src/**/*.js`（JSX 源码）后，提交前必须运行 `node build_game.js` 更新 `build/game.bundle.js`。
- `node build_game.js --check` 可校验产物是否过期（过期/缺失时退出码 1，可用于提交前/CI）。
- `dev_server.py` 启动时会自动构建一次；开发模式页面走源码热加载，不依赖产物。
- 静态部署必须包含最新的 `build/game.bundle.js`，否则页面会提示启动失败。
- `build/game.bundle.js` 为自动生成文件，手改无效；提交时连同源码一起提交最新产物。

## 渲染性能约定（v0.55）
- 不允许在 rAF/高频回调里对根组件 `setState`；动画/进度类瞬时状态走 `UX_PROGRESS` 总线（`src/ui/common.js`），由订阅组件局部 `setState`。
- 给组件加 `shouldComponentUpdate` 时必须列全实际读取的 context key（`uxCtxChanged`），可变对象用内容签名兜底，本地 state 变化要放行。
- 当前是**阶段性渲染隔离**：完整状态切片、`addTime`/`handleDayOver` 批量 `setState` 未做，不要当作已完成。
- 新增/修改 JSX 源码后仍须 `node build_game.js`。

## 项目要点
- 纯前端 HTML5 沙盒生存文字游戏（React `createClass`）；生产用离线预编译 `build/game.bundle.js`，开发用浏览器内 Babel 源码热加载，无 npm/打包器。
- 本地开发运行：`python3 dev_server.py`（实时重载 + 本地存档后端 + 服务器自身热重载；启动时自动构建一次预编译产物）。
- 存档：账号/密码存档写入 `saves/<账号>.json`；另有浏览器 `localStorage` 多槽本地存档。
- 界面为铺满窗口的响应式流式布局；样式按 `css/01…09` 分类加载，响应式/覆盖样式集中在 `css/09-responsive.css`（必须最后加载）。
- `saves/` 下的实际存档文件与 `__pycache__/` 已由 `.gitignore` 忽略。

## 文案规范（v0.53）
- 玩家可见文案统一「原因 + 建议」；按钮禁用说明缺什么，空状态说明下一步。
- 数字必须走 `src/lib.js` 的 `fmtNum` / `fmtHours` / `fmtMoney` / `fmtQty` / `fmtItemName` / `fmtReqText` / `fmtMissingText`，不要手写千分位或单位。
- 术语统一：生命 / 体力 / 满腹 / 水分 / 精神 / 体温；禁止用"饱食""饥饿度""精力"等旧词混用。
- 存档统一称：账号存档（跨设备，需 dev_server）/ 本地存档（本浏览器）/ 自动存档（出门时自动保存）/ 存档槽。
- 物品/事件描述同样适用：去重（不允许两件物品共用完全相同的描述）、标点全角（省略号统一 `……`）、不写与 UI 重复的精确数值；数据层只改文本字段，不改键名/数值。
- 详细规范见 `.ui-optimize/STYLE-GUIDE.md`（UI 文案）与 `.ui-optimize/CONTENT-GUIDE.md`（物品/事件文本）。

