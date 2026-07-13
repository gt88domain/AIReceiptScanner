# Change: Add Aliyun OSS storage provider

## Why
Users need a storage provider option for Alibaba Cloud OSS while keeping the existing storage abstraction and upload/delete behavior.

## What Changes
- Add `aliyun-oss` as a supported storage provider key.
- Implement an Aliyun OSS provider that satisfies the existing storage provider protocol.
- Add server environment examples for OSS bucket and endpoint settings, reusing the existing Alibaba Cloud AccessKey variables.
- Add a dashboard page that demonstrates uploading a file through the storage API.

## Impact
- Affected specs: storage
- Affected code:
  - packages/app-config/src/types.ts
  - apps/server/src/storage/*
  - apps/server/src/lib/context.ts
  - apps/server/src/handlers/storage.ts
  - apps/server/.dev.vars.example
  - apps/server/.env.production.example
  - apps/web/src/routes/_authed/(dashboard)/*
  - apps/web/src/configs/data/sidebar-data.ts
  - packages/i18n/src/messages/web/*.json
