# 05 — Storage plan

## Existing baseline

The Asset Service persists an `asset` record with `id`, `owner_id`,
`visibility`, `storage_key`, MIME type, size, and timestamps. It writes storage
first, removes an object if metadata persistence fails, and authorizes reads by
owner or public visibility before fetching bytes. Products should store an
`asset.id` in their own table (for example, a cover, generated image, or
export), not add product columns to `asset`.

The legacy avatar path is different by design: `GET /api/storage/*` serves
only the public avatar key prefix. It must remain restricted to that purpose;
it is not a product-file API.

## Required product-file contract

1. A server-side domain validates file intent, MIME type, byte size, owner, and
   desired visibility.
2. The domain calls `createAsset` and stores the returned `asset.id`.
3. Reads go through `getReadableAsset`/`getAsset` or a domain policy that first
   applies the same authorization decision.
4. Public URLs are issued only for records marked public. Private objects never
   become public because a caller knows `storage_key`.
5. Delete/replacement operations update the domain reference and handle the
   R2/D1 non-transactional repair path explicitly.

## Gaps to close in `hardening/assets`

- Define a small, reusable input-validation policy for product uploads instead
  of trusting each domain to validate MIME type and size ad hoc.
- Add an asset-ID based server transport pattern (not an upload UI) and tests
  for public/private reads, owner changes, deletion failure/retry, and orphan
  repair.
- Document cache, content-disposition, retention, and malware/scanning choices
  as product decisions. Do not silently promise virus scanning in the template.
- Add review guidance preventing new raw-key storage routes outside the legacy
  avatar exception.

No general public bucket, presigned-URL policy, or product upload screen is
introduced in Phase 0.
