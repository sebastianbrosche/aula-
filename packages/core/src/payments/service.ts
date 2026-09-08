import { type Actor, type Ctx, requireRole } from "../actor.ts";

export type PaymentsStub = {
  live: false;
  stripe: false;
  provider: "stub";
  status: "test_not_live";
};

export async function paymentsStub(
  _ctx: Ctx,
  actor: Actor | null,
): Promise<PaymentsStub> {
  requireRole(actor, ["guardian"]);
  return {
    live: false,
    stripe: false,
    provider: "stub",
    status: "test_not_live",
  };
}
