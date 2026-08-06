import { createDb } from "../db";
import { createEmailService } from "../emails";
import { resolveJobQueue } from "../lib/jobs-binding";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import { runCreditMaintenance } from "../credits";
import { processBillingOutbox } from "../payments/application/billing-outbox";
import { processPendingWebhookEvents } from "../payments/application/webhook-dispatch";
import { alertPendingWebhookEvents } from "../payments/application/webhook-observability";
import { jobRegistry } from "../modules/jobs";
import { consumeDeadLetterMessages } from "../modules/jobs/job.dead-letter";
import { createJobService } from "../modules/jobs/job.service";
import { consumeJobMessages } from "../modules/jobs/job.worker";

type JobHandlers = {
  scheduled: (controller: ScheduledController, env: Cloudflare.Env) => Promise<void>;
  queue: (batch: MessageBatch, env: Cloudflare.Env) => Promise<void>;
};

function requireJobQueueDlqName(env: Pick<Cloudflare.Env, "JOB_QUEUE_DLQ_NAME">) {
  if (!env.JOB_QUEUE_DLQ_NAME) {
    throw new Error("Jobs are enabled but JOB_QUEUE_DLQ_NAME is not configured.");
  }
  return env.JOB_QUEUE_DLQ_NAME;
}

/** Builds the existing Queue/DLQ/Cron contract only for Jobs-enabled Workers. */
export function createJobWorkerHandlers(runtimeConfig: ServerRuntimeConfig): JobHandlers {
  return {
    async scheduled(controller, env) {
      if (controller.cron !== "* * * * *") return;
      const db = createDb(env.DB);
      if (runtimeConfig.features.billing) {
        await processPendingWebhookEvents(db);
        await processBillingOutbox(db);
        const email =
          runtimeConfig.email.enabled && runtimeConfig.email.capabilities.operationalAlerts
            ? createEmailService(runtimeConfig.email, env)
            : undefined;
        await alertPendingWebhookEvents(db, env.ADMIN_EMAILS, { email });
      }
      const queue = resolveJobQueue(runtimeConfig.features, env);
      if (!queue) return;
      await createJobService(db, queue).flushOutbox();
      const scheduledAt = new Date(controller.scheduledTime);
      if (
        runtimeConfig.features.credits &&
        scheduledAt.getUTCHours() === 16 &&
        scheduledAt.getUTCMinutes() === 10
      ) {
        await runCreditMaintenance(db);
      }
    },
    async queue(batch, env) {
      const db = createDb(env.DB);
      if (batch.queue === requireJobQueueDlqName(env)) {
        await consumeDeadLetterMessages(db, batch);
        return;
      }
      await consumeJobMessages(db, batch, jobRegistry.handlers);
    },
  };
}
