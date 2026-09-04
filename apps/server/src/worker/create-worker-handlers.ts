import { createDb } from "../db";
import { createEmailService } from "../emails";
import { resolveJobQueue } from "../lib/jobs-binding";
import type { ServerRuntimeConfig } from "../lib/runtime-config";
import { runCreditMaintenance } from "../credits";
import { processBillingOutbox } from "../payments/application/billing-outbox";
import { reconcilePaymentOperations } from "../payments/application/payment-operation-recovery";
import {
  processPendingWebhookEvents,
  purgeProcessedWebhookEvents,
} from "../payments/application/webhook-dispatch";
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
      const db = createDb(env.DB);
      if (controller.cron === "10 16 * * *") {
        if (runtimeConfig.features.billing) {
          await purgeProcessedWebhookEvents(db);
        }
        if (runtimeConfig.features.credits) {
          await runCreditMaintenance(db);
        }
        return;
      }
      if (controller.cron !== "* * * * *") return;
      if (runtimeConfig.features.billing) {
        await processPendingWebhookEvents(db);
        await processBillingOutbox(db);
        await reconcilePaymentOperations(db);
        const email =
          runtimeConfig.email.enabled && runtimeConfig.email.capabilities.operationalAlerts
            ? createEmailService(runtimeConfig.email, env)
            : undefined;
        await alertPendingWebhookEvents(db, env.ADMIN_EMAILS, { email });
      }
      const queue = resolveJobQueue(runtimeConfig.features, env);
      if (!queue) return;
      await createJobService(db, queue).flushOutbox();
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
