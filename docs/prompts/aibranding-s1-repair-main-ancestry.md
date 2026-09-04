# AIBranding：修复 main 的 v0.12.0 祖先链（PR merge-commit 纪律）

## 背景（已核实的事实，不要重新调查）

- 仓库：`gt88domain/aibranding-easystarter`。
- `origin/main` 当前为 `6e105f7 feat(aibranding): adopt EasyStarter v0.12 (#47)`，是 PR #47 的 **squash 合并**。
- 采用分支 `codex/aibranding-v012-adopt-v056`（tip = `ca5a6df`，已 push）包含对上游 tag `v0.12.0`（commit `02306a72b9d763db9d572dc2f8225b7efb4ca4ae`）的**真实合并**（`3dbb212`）。
- squash 后 main 的**文件树与 `ca5a6df` 完全一致**（`git diff ca5a6df origin/main` 为空）。内容无损，只丢祖先链。
- `.template/source.json` 记录 `upstream.commit = 02306a72…`，squash 后该 commit 不再是 main 的祖先。
- 后果：main 上 Quality 失败（`Modification Manifest check failed: upstream.commit must be an ancestor of HEAD` + 连锁的逐文件缺记录报错），Release Please 随之失败。
- tag `v0.12.0` 已在仓库对象库中（`git rev-parse v0.12.0` = `02306a72…`）。
- ⚠️ `.github/workflows/auto-merge.yml` 硬编码 `merge_method: "squash"`。**本修复绝不启用 auto-merge，绝不选 squash/rebase**。
- 仓库允许 merge commit（若实际不允许，停止并报告）。

## 目标

通过一个普通 PR 的 **merge commit** 让 main 重新获得真实的 v0.12.0 祖先链，**不改变任何文件内容**，使 Quality 恢复绿色、Release Please 恢复工作，并留下 PR 出处。

## 硬性约束

- 内容中立：修复后 main 的文件树必须与 `6e105f7` 完全一致（`git diff` 为空）。
- 禁止修改 `scripts/check-template-modifications.mjs`、`.template/source.json` 或任何 manifest 记录来「让检查通过」。
- 禁止 squash、rebase、force-push；禁止直接 push main；禁止 `gh pr merge --auto`。
- 禁止生产部署、禁止 D1 迁移、禁止 wrangler deploy、禁止触碰任何 secret。
- 禁止合并 Release Please 生成的 release PR。
- 在全新干净工作区执行；不要使用 `/Users/linyan/dev/aibranding-next`（脏工作区，停在别的分支），不要动 `aibranding-v012-adopt-v056`（留作参照）。**不要 checkout main 分支名**（避免与其他检出冲突），直接在新建的修复分支上工作。

## 执行步骤

### 0. 准备干净工作区与修复分支

```bash
cd /Users/linyan/dev/aibranding-next
git fetch origin --prune --tags
git worktree add /Users/linyan/dev/v5-worktrees/aibranding-main-ancestry-repair -b fix/main-v012-ancestry origin/main
cd /Users/linyan/dev/v5-worktrees/aibranding-main-ancestry-repair
```

### 1. 前置核实（任一不符则停止并报告）

```bash
git log --oneline -1 origin/main          # 期望 6e105f7
git diff ca5a6df origin/main --stat       # 期望为空
git rev-parse v0.12.0                     # 期望 02306a72…
```

### 2. 修复合并（在修复分支上）

```bash
git merge --no-ff --no-edit ca5a6df -m "merge: restore v0.12.0 ancestry after squash-merged adoption (#47)"
```

预期：**零冲突、文件树不变**（分支内容已全部在 main 里，只是缺血缘）。

### 3. 本地验证

```bash
git merge-base --is-ancestor 02306a72b9d763db9d572dc2f8225b7efb4ca4ae HEAD && echo ANCESTRY-OK
git diff HEAD^1 HEAD --stat               # 期望为空
pnpm install
pnpm test
pnpm check-types
pnpm lint
pnpm fmt:check
pnpm build
pnpm template:check-modifications         # Modification Manifest 检查，必须转绿
```

任何一项失败：停止、保留现场、报告失败输出，不要尝试绕过。

### 4. 推送修复分支，建 PR，等检查转绿

```bash
git push origin fix/main-v012-ancestry
gh pr create --base main --head fix/main-v012-ancestry \
  --title "fix(governance): restore v0.12.0 ancestry after squash-merged adoption" \
  --body "Content-neutral merge to restore upstream ancestry required by the Modification Manifest check. Must be merged with a merge commit. Never squash."
gh pr checks --watch                      # 必须全部通过
```

### 5. 合并：只用 merge commit，并按精确 SHA 验证

```bash
gh pr merge --merge                       # 禁止 --squash / --rebase / --auto
git fetch origin
MAIN_SHA=$(git rev-parse origin/main)
git diff "$MAIN_SHA" 6e105f7 --stat       # 期望为空：内容未变
git merge-base --is-ancestor 02306a72b9d763db9d572dc2f8225b7efb4ca4ae origin/main && echo MAIN-ANCESTRY-OK
gh run list --branch main --commit "$MAIN_SHA"
gh run watch <run-id>                     # Quality 必须 success
```

确认 Release Please 重新运行并开出 release PR（预期 0.6.0）。**不要合并它。**

### 6. 报告（到此停止）

报告内容：PR 号、合并后 main SHA、`ANCESTRY-OK` / `MAIN-ANCESTRY-OK` 结果、本地门禁结果、按 SHA 绑定的 Quality run URL 与结论、Release Please PR 编号、确认 `codex/aibranding-v012-adopt-v056` 现在显示为已合并（`git merge-base --is-ancestor ca5a6df origin/main`）。

## 明确不做

- 不部署生产、不应用 `0018_aibranding_v012_core` 迁移、不切流。
- 不删除任何分支或 worktree。
- 不改 auto-merge.yml（防复发改进另行决策）。
- 不合并 Release Please PR。

## 失败处理

- 步骤 1 前置不符 → 停止，报告实际状态。
- 合并出现冲突 → 停止，`git merge --abort`，报告冲突文件清单。
- 本地门禁或 PR 检查红 → 停止，保留现场报告。
- 按 SHA 查到的 Quality 仍红 → 抓完整失败日志报告；若只剩逐文件 manifest 记录错误，说明基线已能解析但确有个别文件缺记录，**停止等待用户决策**，不要自行编造记录。
