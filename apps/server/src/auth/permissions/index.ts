import type { Context } from "@/lib/context";
import { isAdminEmail } from "@/lib/admin";
import { capabilities, type Capability } from "../capabilities";

/**
 * Resolves capabilities from server-owned authorization facts only.
 *
 * ponytail: administrator capability is all-or-nothing until the product has
 * a real non-admin permission model; add an explicit server-owned policy then.
 */
export function hasCapability(context: Pick<Context, "env" | "session">, capability: Capability) {
  return (
    isAdminEmail(context.session?.user.email, context.env.ADMIN_EMAILS) &&
    Object.values(capabilities).includes(capability)
  );
}
