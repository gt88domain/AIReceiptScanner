import { WorkerEntrypoint } from "cloudflare:workers";
import { ZodError } from "zod";
import type {
  ControlAnalyticsInputV1,
  ControlAuditInputV1,
  ControlUsersInputV1,
} from "@repo/shared/control-read";
import { logSafeError } from "@/lib/safe-error";
import { createControlReadV1 } from "@/modules/control-read";
import { createControlReadDependencies } from "@/modules/control-read/dependencies";
import { serverRuntimeConfig } from "./runtime";

function controlReadFailure(error: unknown): never {
  if (error instanceof ZodError) throw new Error("CONTROL_INVALID_INPUT");
  logSafeError("Control RPC read failed", error);
  throw new Error("CONTROL_UNAVAILABLE");
}

/** Same-account, service-binding-only RPC surface for the fixed ControlReadV1 contract. */
export class ControlReadEntrypoint extends WorkerEntrypoint<Cloudflare.Env> {
  #control() {
    return createControlReadV1(createControlReadDependencies(this.env, serverRuntimeConfig));
  }

  async getSnapshot() {
    try {
      return await this.#control().getSnapshot();
    } catch (error) {
      return controlReadFailure(error);
    }
  }

  async getOverview() {
    try {
      return await this.#control().getOverview();
    } catch (error) {
      return controlReadFailure(error);
    }
  }

  async getAnalytics(input: ControlAnalyticsInputV1) {
    try {
      return await this.#control().getAnalytics(input);
    } catch (error) {
      return controlReadFailure(error);
    }
  }

  async listUsers(input: ControlUsersInputV1) {
    try {
      return await this.#control().listUsers(input);
    } catch (error) {
      return controlReadFailure(error);
    }
  }

  async getIntegrations() {
    try {
      return await this.#control().getIntegrations();
    } catch (error) {
      return controlReadFailure(error);
    }
  }

  async listAudit(input: ControlAuditInputV1) {
    try {
      return await this.#control().listAudit(input);
    } catch (error) {
      return controlReadFailure(error);
    }
  }

  async getSystem() {
    try {
      return await this.#control().getSystem();
    } catch (error) {
      return controlReadFailure(error);
    }
  }
}
