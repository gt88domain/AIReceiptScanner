# Assets

Every product file stored in R2 or another configured provider has an `asset`
record with owner, visibility, storage key, MIME type, and size. Use the Asset
Service for every product file: `createAsset`, `getAsset`, `deleteAsset`, and
`authorizeAsset`. It writes storage before the record, reads only after
authorization, and deletes the object before removing the record.

Use `getReadableAsset` before returning private asset metadata or a download
URL. Product-specific fields such as a Novel cover or generated logo belong in
the owning module and reference `asset.id`; do not add those columns to
`asset`.

The legacy avatar path is migrated conservatively: only a storage URL already
persisted in `user.image` is eligible for lazy adoption, and the user row is the
ownership proof. Unknown R2 objects are never assigned from their key text.
New uploads create the asset record immediately. Storage lists are bounded and
ordered from asset metadata rather than R2's lexicographic key order.
