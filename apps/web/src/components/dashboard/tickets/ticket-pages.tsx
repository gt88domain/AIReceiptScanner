import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Loader2Icon, MessageSquareTextIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrpc } from "@/hooks/use-orpc";
import { AdminEmptyState } from "../admin/admin-empty-state";
import { AdminPageHeader } from "../admin/admin-page-header";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Please try again.";
}

function TicketComposer({
  label,
  onSubmit,
  pending,
}: {
  label: string;
  onSubmit: (body: string) => void;
  pending: boolean;
}) {
  const [body, setBody] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (body.trim()) onSubmit(body.trim());
      }}
    >
      <textarea
        className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
        maxLength={5_000}
        placeholder="Write a reply…"
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />
      <Button disabled={pending || body.trim().length === 0} type="submit">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {label}
      </Button>
    </form>
  );
}

function TicketThread({
  ticket,
  replyLabel,
  onReply,
  replyPending,
}: {
  ticket: {
    subject: string;
    status: "open" | "replied" | "closed";
    messages: Array<{ id: string; authorRole: "user" | "admin"; body: string; createdAt: Date }>;
  };
  replyLabel: string;
  onReply: (body: string) => void;
  replyPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">{ticket.subject}</h1>
        <span className="rounded-full bg-muted px-3 py-1 font-medium text-sm capitalize">
          {ticket.status}
        </span>
      </div>
      <div className="space-y-3">
        {ticket.messages.map((message) => (
          <Card key={message.id}>
            <CardHeader className="pb-2">
              <CardDescription>
                {message.authorRole === "admin" ? "Support" : "You"} ·{" "}
                {dateTimeFormatter.format(message.createdAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">{message.body}</CardContent>
          </Card>
        ))}
      </div>
      {ticket.status === "closed" ? (
        <p className="text-muted-foreground text-sm">
          This ticket is closed and cannot receive replies.
        </p>
      ) : (
        <TicketComposer label={replyLabel} onSubmit={onReply} pending={replyPending} />
      )}
    </div>
  );
}

export function MyTicketsPage() {
  const orpc = useOrpc();
  const router = useRouter();
  const tickets = useQuery(orpc.tickets.listMine.queryOptions());
  const create = useMutation({
    ...orpc.tickets.create.mutationOptions(),
    onSuccess: async (item) => {
      toast.success("Ticket created.");
      await router.navigate({ to: "/tickets/$ticketId", params: { ticketId: item.id } });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">My tickets</h1>
        <p className="mt-2 text-muted-foreground">Ask the account administrator for help.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusIcon className="size-5" /> New ticket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              create.mutate({ subject: subject.trim(), body: body.trim() });
            }}
          >
            <Input
              maxLength={160}
              placeholder="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
            <textarea
              className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-28 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px]"
              maxLength={5_000}
              placeholder="How can we help?"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <Button
              disabled={create.isPending || subject.trim().length < 3 || body.trim().length === 0}
              type="submit"
            >
              {create.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Create ticket
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.isPending ? <Skeleton className="h-32 w-full" /> : null}
          {tickets.isError ? (
            <p className="text-destructive text-sm">Tickets could not be loaded.</p>
          ) : null}
          {tickets.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No tickets yet.</p>
          ) : null}
          <div className="divide-y">
            {tickets.data?.map((ticket) => (
              <Link
                className="flex items-center justify-between gap-4 py-3 hover:underline"
                key={ticket.id}
                params={{ ticketId: ticket.id }}
                to="/tickets/$ticketId"
              >
                <span>{ticket.subject}</span>
                <span className="text-muted-foreground text-sm capitalize">{ticket.status}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function MyTicketDetailPage({ ticketId }: { ticketId: string }) {
  const orpc = useOrpc();
  const router = useRouter();
  const ticket = useQuery(orpc.tickets.getMine.queryOptions({ input: { id: ticketId } }));
  const reply = useMutation({
    ...orpc.tickets.reply.mutationOptions(),
    onSuccess: () => router.invalidate(),
    onError: (error) => toast.error(errorMessage(error)),
  });
  if (ticket.isPending) return <Skeleton className="h-80 w-full" />;
  if (ticket.isError || !ticket.data)
    return <p className="text-destructive">Ticket could not be loaded.</p>;
  return (
    <TicketThread
      ticket={ticket.data}
      replyLabel="Send reply"
      replyPending={reply.isPending}
      onReply={(body) => reply.mutate({ ticketId, body })}
    />
  );
}

export function AdminTicketsPage() {
  const orpc = useOrpc();
  const [status, setStatus] = useState<"open" | "replied" | "closed" | "all">("open");
  const tickets = useQuery(
    orpc.tickets.listAdmin.queryOptions({ input: status === "all" ? {} : { status } }),
  );
  return (
    <div className="space-y-6">
      <AdminPageHeader description="Read and reply to account support tickets." title="Support" />
      <div className="flex flex-wrap gap-2">
        {(["open", "replied", "closed", "all"] as const).map((value) => (
          <Button
            key={value}
            onClick={() => setStatus(value)}
            size="sm"
            variant={status === value ? "default" : "outline"}
          >
            {value}
          </Button>
        ))}
      </div>
      {tickets.isPending ? <Skeleton className="h-48 w-full" /> : null}
      {tickets.isError ? (
        <AdminEmptyState
          description="Support tickets could not be loaded."
          icon={MessageSquareTextIcon}
          title="Support unavailable"
        />
      ) : null}
      {tickets.data?.length === 0 ? (
        <AdminEmptyState
          description="No tickets match this status."
          icon={MessageSquareTextIcon}
          title="No tickets"
        />
      ) : null}
      {tickets.data && tickets.data.length > 0 ? (
        <Card>
          <CardContent className="divide-y">
            {tickets.data.map((ticket) => (
              <Link
                className="flex items-center justify-between gap-4 py-4 hover:underline"
                key={ticket.id}
                params={{ ticketId: ticket.id }}
                to="/admin/support/$ticketId"
              >
                <span>
                  <span className="block font-medium">{ticket.subject}</span>
                  <span className="text-muted-foreground text-sm">{ticket.userId}</span>
                </span>
                <span className="text-muted-foreground text-sm capitalize">{ticket.status}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function AdminTicketDetailPage({ ticketId }: { ticketId: string }) {
  const orpc = useOrpc();
  const router = useRouter();
  const ticket = useQuery(orpc.tickets.getAdmin.queryOptions({ input: { id: ticketId } }));
  const reply = useMutation({
    ...orpc.tickets.replyAdmin.mutationOptions(),
    onSuccess: () => router.invalidate(),
    onError: (error) => toast.error(errorMessage(error)),
  });
  const close = useMutation({
    ...orpc.tickets.closeAdmin.mutationOptions(),
    onSuccess: () => router.invalidate(),
    onError: (error) => toast.error(errorMessage(error)),
  });
  if (ticket.isPending) return <Skeleton className="h-80 w-full" />;
  if (ticket.isError || !ticket.data)
    return <p className="text-destructive">Ticket could not be loaded.</p>;
  return (
    <div className="space-y-6">
      <TicketThread
        ticket={ticket.data}
        replyLabel="Send reply"
        replyPending={reply.isPending}
        onReply={(body) => reply.mutate({ ticketId, body })}
      />
      {ticket.data.status !== "closed" ? (
        <Button
          disabled={close.isPending}
          onClick={() => close.mutate({ ticketId })}
          variant="outline"
        >
          Close ticket
        </Button>
      ) : null}
    </div>
  );
}
