# Assets

Every product file stored in R2 or another configured provider has an `asset`
record with owner, visibility, storage key, MIME type, and size. Create the
record only after the storage write succeeds; delete the storage object when a
record is permanently removed.

Use `getReadableAsset` before returning private asset metadata or a download
URL. Product-specific fields such as a Novel cover or generated logo belong in
the owning module and reference `asset.id`; do not add those columns to
`asset`.
