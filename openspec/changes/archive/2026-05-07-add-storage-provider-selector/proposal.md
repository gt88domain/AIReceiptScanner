# Change: Add storage provider selector

## Why
需要为模板预留多 storage provider 能力，并且把 provider 创建逻辑集中，避免在 context/handler 中分散 new。

## What Changes
- 新增 storage 配置（默认 provider 为 r2）。
- 在 storage 模块增加 provider selector（类似 emails 的 getEmailProvider）。
- 更新 context 与文件服务 handler 统一走 selector。
- 保持现有 storage service API，不改现有上传/删除行为。

## Impact
- Affected specs: storage
- Affected code:
  - apps/server/src/storage/index.ts
  - apps/server/src/storage/providers/*
  - apps/server/src/lib/context.ts
  - apps/server/src/handlers/storage.ts
  - apps/server/src/configs/types.ts
  - apps/server/src/configs/server-config.ts
