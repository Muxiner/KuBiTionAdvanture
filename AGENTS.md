# 项目约定（AGENTS.md）

## 自动提交（重要）
- 每完成一轮用户请求的修改后，**自动将改动提交到 git 仓库**，无需用户再次要求。
- 提交前先查看 `git status` / `git diff`，只提交与本轮相关的文件，绝不提交密钥或无关产物。
- 提交信息用简洁中文描述本轮改动。
- 默认只 `commit`，**不 `push`**，除非用户明确要求推送。

## 项目要点
- 纯前端 HTML5 沙盒生存文字游戏（React `createClass` + 浏览器内 Babel），无构建工具。
- 本地开发运行：`python3 dev_server.py`（实时重载 + 本地存档后端 + 服务器自身热重载）。
- 存档：账号/密码存档写入 `saves/<账号>.json`；另有浏览器 `localStorage` 多槽本地存档。
- 界面为铺满窗口的响应式流式布局；样式按 `css/01…09` 分类加载，响应式/覆盖样式集中在 `css/09-responsive.css`（必须最后加载）。
- `saves/` 下的实际存档文件与 `__pycache__/` 已由 `.gitignore` 忽略。

## 文案规范（v0.52）
- 玩家可见文案统一「原因 + 建议」；按钮禁用说明缺什么，空状态说明下一步。
- 数字必须走 `src/lib.js` 的 `fmtNum` / `fmtHours` / `fmtMoney` / `fmtQty` / `fmtItemName` / `fmtReqText` / `fmtMissingText`，不要手写千分位或单位。
- 术语统一：生命 / 体力 / 满腹 / 水分 / 精神 / 体温；禁止用"饱食""饥饿度""精力"等旧词混用。
- 存档统一称：账号存档（跨设备，需 dev_server）/ 本地存档（本浏览器）/ 自动存档（出门时自动保存）/ 存档槽。
- 详细规范见 `.ui-optimize/STYLE-GUIDE.md`。

