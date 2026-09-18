import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_DEPTH = 4;
const MAX_ENTRIES = 20;
const MAX_TEXT_LENGTH = 500;

function truncate(value: string) {
  return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}…` : value;
}

function MetadataEntries({
  entries,
  depth,
}: {
  entries: ReadonlyArray<[string, unknown]>;
  depth: number;
}) {
  const visibleEntries = entries.slice(0, MAX_ENTRIES);
  return (
    <dl className="space-y-2">
      {visibleEntries.map(([key, value]) => (
        <div className="grid gap-1 sm:grid-cols-3" key={key}>
          <dt className="font-medium text-muted-foreground text-sm">{truncate(key)}</dt>
          <dd className="min-w-0 break-words text-sm sm:col-span-2">
            <MetadataValue value={value} depth={depth} />
          </dd>
        </div>
      ))}
      {entries.length > MAX_ENTRIES ? (
        <div className="grid gap-1 sm:grid-cols-3">
          <dt className="font-medium text-muted-foreground text-sm">…</dt>
          <dd className="text-muted-foreground text-sm sm:col-span-2">
            Additional values omitted.
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function MetadataValue({ value, depth }: { value: unknown; depth: number }) {
  if (value === null) return <span className="text-muted-foreground">null</span>;
  if (typeof value === "string") return <>{truncate(value)}</>;
  if (typeof value === "number" || typeof value === "boolean") return <>{String(value)}</>;
  if (depth >= MAX_DEPTH)
    return <span className="text-muted-foreground">Nested value omitted.</span>;
  if (Array.isArray(value)) {
    return (
      <div className="border-muted ml-1 border-l pl-3">
        <MetadataEntries
          entries={value.map((item, index) => [String(index), item])}
          depth={depth + 1}
        />
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="border-muted ml-1 border-l pl-3">
        <MetadataEntries entries={Object.entries(value)} depth={depth + 1} />
      </div>
    );
  }
  return <>{truncate(String(value))}</>;
}

/** Safe, bounded display of administrator-only Ticket metadata. */
export function TicketMetadata({ metadata }: { metadata: Record<string, unknown> | null }) {
  const entries = metadata ? Object.entries(metadata) : [];
  if (entries.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Metadata</CardTitle>
      </CardHeader>
      <CardContent>
        <MetadataEntries entries={entries} depth={0} />
      </CardContent>
    </Card>
  );
}
