## Context
storage provider 目前在多个位置直接 new R2，缺少统一选择入口，不利于后续扩展多 provider。

## Goals / Non-Goals
- Goals:
  - 通过 config 选择 storage provider，默认 r2
  - 提供统一的 provider selector 并做实例缓存
  - 调用方（context/handler）不再直接依赖具体 provider 构造
- Non-Goals:
  - 不实现 s3 或其他 provider
  - 不改变现有上传/删除/访问行为

## Decisions
- Decision: 新增 serverConfig.storage.provider（默认 r2）。
- Decision: 在 storage 模块增加 getStorageProvider(env) 选择器，内部校验 provider key 并缓存实例。
- Decision: 现有 StorageService API 保持不变，由 selector 提供 provider。

## Risks / Trade-offs
- 缓存策略默认假设单一 bucket 绑定；若未来需要多 bucket，再扩展为按 env 维度缓存。

## Migration Plan
- 添加配置字段并设置默认值。
- 落地 selector 并替换 context/handler 的直接构造。
- 运行类型检查。

## Open Questions
- 无。
