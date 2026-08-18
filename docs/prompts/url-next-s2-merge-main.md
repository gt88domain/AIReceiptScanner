# Urls.ai：采用分支合入 main + 生产对齐（PR merge-commit 纪律）

## 背景（已核实的事实，不要重新调查）

- 仓库：`gt88domain/url-next`。
- 采用分支 `codex/url-next-adopt-v011-stage1`（tip = `20597cf fix(backoffice): preserve first-login queries`）领先 `origin/main`（`79ac6e1`）**78 个提交**，已 push。
- main 自分岔后**没有新提交**；分支已包含对上游 tag `v0.11.0`（`ff674cc5…`）的真实合并，`ff674cc` 是分支祖先；分支 tip 的 `.template/source.json` 已指向 `v0.11.0 / ff674cc5…`。
- 生产目前从**分支**部署：server 最新 2026-08-16 05:10 UTC（可能缺末尾 1–2 个提交：`f372395`、`20597cf`），web 最新 2026-08-17 03:01 UTC（已是 tip）。本次要让生产 = 合并后的 main。
- 生产 D1 已应用到 `0021`，**本次没有任何数据库动作**。
- ⚠️ `.github/workflows/auto-merge.yml` 硬编码 `merge_method: "squash"`。**绝不启用 auto-merge，绝不选 squash/rebase**——squash 会丢弃 v0.11.0 祖先链，导致 main 上 Quality 的 Modification Manifest 检查失败（AIBranding PR #47 已实际炸过一次，同一根因）。
- 仓库允许 merge commit（`allow_merge_commit: true`）。目前该分支**没有已存在的 PR**。
- 部署预检要求 `apps/server/.production-safety.env`（注意带 `.env` 后缀）。采用工作区已存在该文件（Stage 1 部署验证过）。根脚本 `pnpm verify:production-config` = server 预检；`pnpm deploy:server` 自带预检，但 **`pnpm deploy:web` 不带预检**，因此必须在两次部署前都显式跑 `verify:production-config`。

## 目标

1. 采用分支通过 **PR + Create a merge commit** 合入 main（保留 v0.11.0 祖先链，且留下 PR 出处）。
2. 按精确 SHA 验证 main 上 Quality 转绿，Release Please 恢复。
3. 从与合并后 main 完全一致的工作区重新部署 server 与 web。
4. 把部署出处写入 PR 评论，持久留痕。

## 硬性约束

- 禁止 squash、rebase、force-push；禁止 `gh pr merge --auto`；禁止直接 push main；禁止 `git checkout main` / `git reset --hard`（main 被旧工作区 `/Users/linyan/dev/url-next` 占用，且覆盖动作在本场景无必要、只有风险）。
- 禁止修改 `source.json`、manifest、检查脚本。
- 禁止任何 D1 迁移或数据操作；禁止新建/删除 Cloudflare 资源。
- 禁止合并 Release Please 生成的 release PR。
- 全程在 `/Users/linyan/dev/v5-worktrees/url-next-adopt-v011` 执行；**不要碰**旧工作区 `/Users/linyan/dev/url-next`。

## 执行步骤

### 0. 同步与前置核实（任一不符则停止并报告）

```bash
cd /Users/linyan/dev/v5-worktrees/url-next-adopt-v011
git fetch origin --prune --tags
git status -sb                                   # 期望干净、在 codex/url-next-adopt-v011-stage1
git log --oneline -1 origin/main                 # 期望 79ac6e1
git log --oneline -1 HEAD                        # 期望 20597cf
git log --oneline HEAD..origin/main              # 期望为空
git merge-base --is-ancestor ff674cc5e7160632eb3fabd8e5270552c5b9ae30 HEAD && echo ANCESTRY-OK
git push origin codex/url-next-adopt-v011-stage1   # 确保远端分支为 tip
```

### 1. 本地门禁（分支 tip 全量重跑）

```bash
pnpm install
pnpm test
pnpm check-types
pnpm lint
pnpm fmt:check
pnpm build
pnpm profiles:build -- --profile=directory-lite
pnpm perf:budget
pnpm template:audit-modifications
```

任何一项失败：停止、报告失败输出，不要绕过。

### 2. 建 PR，等待 PR 检查转绿

```bash
gh pr create --base main --head codex/url-next-adopt-v011-stage1 \
  --title "feat(urls): adopt EasyStarter v0.11 backoffice" \
  --body "In-place adoption of EasyStarter v0.11.0 (directory-lite). Must be merged with a merge commit to preserve upstream ancestry (ff674cc). Never squash."
gh pr checks --watch                             # 必须全部通过
```

### 3. 合并：只用 merge commit

```bash
gh pr merge --merge        # 禁止 --squash / --rebase / --auto
```

若仓库 UI/设置不允许 merge commit：停止并报告。

合并后取精确 SHA 并绑定验证：

```bash
git fetch origin
MAIN_SHA=$(git rev-parse origin/main)
gh run list --branch main --commit "$MAIN_SHA"   # 找到该 SHA 的 Quality run
gh run watch <run-id>                            # 必须 success
git merge-base --is-ancestor ff674cc5e7160632eb3fabd8e5270552c5b9ae30 origin/main && echo MAIN-ANCESTRY-OK
```

确认 Release Please 重新运行并开出 release PR（预期 0.6.0）。**不要合并它。**

### 4. 部署前一致性证明 + 预检

```bash
git diff origin/main HEAD --stat     # 期望为空：本工作区文件树 == 合并后 main 的文件树
ls apps/server/.production-safety.env  # 必须存在；若缺失：停止并报告，等用户提供（不要从旧工作区复制名字/格式可能过期的文件）
pnpm verify:production-config          # 必须通过
```

### 5. 重新部署生产（server 与 web 都受预检约束）

```bash
pnpm deploy:server                     # 自带预检
pnpm verify:production-config          # web 部署前再次显式预检（deploy:web 不带守卫）
pnpm deploy:web
```

### 6. 部署后验证

```bash
cd apps/server && npx wrangler deployments list --name url-next-server | head -8
cd ../web && npx wrangler deployments list --name url-next | head -8
```

- 两个 Worker 的最新部署时间必须晚于本次执行开始时间；记录版本 ID 与 UTC 时间。
- 抽查：站点首页正常；`/admin` 未登录重定向到登录页；登录后新后台可用（含首登 query 保留修复）。

### 7. 把部署出处写入 PR 评论

```bash
gh pr comment <PR号> --body "……"
```

评论内容必须包含：合并后的 main SHA、server / web Worker 版本 ID、UTC 部署时间、部署目标（url-next-server / url-next）、预检结果、线上抽查结果。

### 8. 报告（到此停止）

报告：PR 号、合并后 main SHA、本地门禁结果、按 SHA 绑定的 Quality run URL 与结论、Release Please PR 编号、两个 Worker 版本 ID 与部署时间、抽查结果、PR 评论链接。

## 明确不做

- 不做 D1 迁移（生产已在 0021）。
- 不合并 Release Please PR。
- 不删除旧 `/admin` 兼容入口（Stage 3 退役决策另行审批）。
- 不清理/退役旧工作区。
- 不改 auto-merge.yml。

## 失败处理

- 前置核实不符 / `git diff origin/main HEAD` 非空 → 停止并报告。
- 本地门禁或 PR 检查红 → 停止并报告。
- 按 SHA 查到的 Quality 红 → 抓完整日志报告；若报 `upstream.commit must be an ancestor of HEAD`，说明合并路径被 squash 了，停止并报告，不要自行修检查。
- 预检失败或 `.production-safety.env` 缺失 → 停止并报告，等用户补齐。
