import { ORPCError } from "@orpc/server";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { ticket, ticketMessage, ticketStatusValues } from "@/db/schema/tickets";
import { user } from "@/db/schema/auth";
import { isRequestRateLimited } from "@/handlers/request-rate-limit";
import { adminTicketsProcedure, ticketsProcedure } from "@/lib/orpc";
import { recordAdminAuditLog } from "@/modules/audit";
import type { Context } from "@/lib/context";

const ticketStatusSchema = z.enum(ticketStatusValues);
const ticketSummarySchema = z.object({
  id: z.string(),
  subject: z.string(),
  status: ticketStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
const ticketMessageSchema = z.object({
  id: z.string(),
  authorUserId: z.string(),
  authorRole: z.enum(["user", "admin"]),
  body: z.string(),
  createdAt: z.date(),
});
const ticketDetailSchema = ticketSummarySchema.extend({
  userId: z.string(),
  closedAt: z.date().nullable(),
  messages: z.array(ticketMessageSchema),
});
const adminTicketDetailSchema = ticketDetailSchema.extend({
  metadata: z.record(z.string(), z.unknown()).nullable(),
});
const createSchema = z.object({
  subject: z.string().trim().min(3).max(160),
  body: z.string().trim().min(1).max(5_000),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});
const replySchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(1).max(5_000),
});

async function getTicketDetail(context: Context, id: string) {
  const item = await context.db.query.ticket.findFirst({ where: eq(ticket.id, id) });
  if (!item) throw new ORPCError("NOT_FOUND", { message: "Ticket not found" });
  const messages = await context.db
    .select()
    .from(ticketMessage)
    .where(eq(ticketMessage.ticketId, id))
    .orderBy(ticketMessage.createdAt);
  return { ...item, messages };
}

export const ticketsRouter = {
  listMine: ticketsProcedure.output(z.array(ticketSummarySchema)).handler(async ({ context }) =>
    context.db
      .select({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      })
      .from(ticket)
      .where(eq(ticket.userId, context.session!.user.id))
      .orderBy(desc(ticket.updatedAt)),
  ),
  getMine: ticketsProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(ticketDetailSchema)
    .handler(async ({ context, input }) => {
      const item = await getTicketDetail(context, input.id);
      if (item.userId !== context.session!.user.id)
        throw new ORPCError("NOT_FOUND", { message: "Ticket not found" });
      return item;
    }),
  create: ticketsProcedure
    .input(createSchema)
    .output(ticketDetailSchema)
    .handler(async ({ context, input }) => {
      if (
        isRequestRateLimited(context.request, `tickets:${context.session!.user.id}`, 60_000, {
          cloudflareOnly: context.env.NODE_ENV === "production",
        })
      ) {
        throw new ORPCError("TOO_MANY_REQUESTS", {
          message: "Please wait a minute before creating another ticket",
        });
      }
      const now = new Date();
      const id = crypto.randomUUID();
      await context.db.insert(ticket).values({
        id,
        userId: context.session!.user.id,
        subject: input.subject,
        status: "open",
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      });
      await context.db.insert(ticketMessage).values({
        id: crypto.randomUUID(),
        ticketId: id,
        authorUserId: context.session!.user.id,
        authorRole: "user",
        body: input.body,
        createdAt: now,
      });
      return getTicketDetail(context, id);
    }),
  reply: ticketsProcedure
    .input(replySchema)
    .output(ticketDetailSchema)
    .handler(async ({ context, input }) => {
      const item = await getTicketDetail(context, input.ticketId);
      if (item.userId !== context.session!.user.id)
        throw new ORPCError("NOT_FOUND", { message: "Ticket not found" });
      if (item.status === "closed")
        throw new ORPCError("BAD_REQUEST", { message: "Closed tickets cannot be replied to" });
      const now = new Date();
      await context.db.insert(ticketMessage).values({
        id: crypto.randomUUID(),
        ticketId: item.id,
        authorUserId: context.session!.user.id,
        authorRole: "user",
        body: input.body,
        createdAt: now,
      });
      await context.db
        .update(ticket)
        .set({ status: "open", updatedAt: now })
        .where(eq(ticket.id, item.id));
      return getTicketDetail(context, item.id);
    }),
  listAdmin: adminTicketsProcedure
    .input(z.object({ status: ticketStatusSchema.optional() }))
    .output(z.array(ticketSummarySchema.extend({ userId: z.string() })))
    .handler(({ context, input }) => {
      const query = context.db
        .select({
          id: ticket.id,
          userId: ticket.userId,
          subject: ticket.subject,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
        })
        .from(ticket)
        .orderBy(desc(ticket.updatedAt));
      return input.status ? query.where(eq(ticket.status, input.status)) : query;
    }),
  getAdmin: adminTicketsProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(adminTicketDetailSchema)
    .handler(({ context, input }) => getTicketDetail(context, input.id)),
  replyAdmin: adminTicketsProcedure
    .input(replySchema)
    .output(adminTicketDetailSchema)
    .handler(async ({ context, input }) => {
      const item = await getTicketDetail(context, input.ticketId);
      if (item.status === "closed")
        throw new ORPCError("BAD_REQUEST", { message: "Closed tickets cannot be replied to" });
      const now = new Date();
      await context.db.insert(ticketMessage).values({
        id: crypto.randomUUID(),
        ticketId: item.id,
        authorUserId: context.session!.user.id,
        authorRole: "admin",
        body: input.body,
        createdAt: now,
      });
      await context.db
        .update(ticket)
        .set({ status: "replied", updatedAt: now })
        .where(eq(ticket.id, item.id));
      if (context.email) {
        const owner = await context.db.query.user.findFirst({ where: eq(user.id, item.userId) });
        if (owner)
          await context.email.send({
            to: owner.email,
            subject: `Reply: ${item.subject.replace(/[\r\n]+/g, " ")}`,
            text: input.body,
          });
      }
      await recordAdminAuditLog(context.db, {
        actor: context.session!.user,
        action: "tickets.replied",
        entity: { type: "ticket", id: item.id },
        before: { status: item.status },
        after: { status: "replied" },
      });
      return getTicketDetail(context, item.id);
    }),
  closeAdmin: adminTicketsProcedure
    .input(z.object({ ticketId: z.string().uuid() }))
    .output(adminTicketDetailSchema)
    .handler(async ({ context, input }) => {
      const item = await getTicketDetail(context, input.ticketId);
      const now = new Date();
      await context.db
        .update(ticket)
        .set({ status: "closed", closedAt: now, updatedAt: now })
        .where(eq(ticket.id, item.id));
      await recordAdminAuditLog(context.db, {
        actor: context.session!.user,
        action: "tickets.closed",
        entity: { type: "ticket", id: item.id },
        before: { status: item.status },
        after: { status: "closed" },
      });
      return getTicketDetail(context, item.id);
    }),
  countOpenAdmin: adminTicketsProcedure
    .output(z.object({ count: z.number().int().nonnegative() }))
    .handler(async ({ context }) => {
      const [result] = await context.db
        .select({ count: count() })
        .from(ticket)
        .where(eq(ticket.status, "open"));
      return { count: result?.count ?? 0 };
    }),
};
