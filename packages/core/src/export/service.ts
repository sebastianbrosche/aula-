import { type Actor, type Ctx, requireRole } from "../actor.ts";

export type ExportStub = {
  exported: false;
  connected: false;
  live: false;
  status: "not_connected";
  destinations: ["google_photos", "google_drive"];
};

export async function exportStub(
  _ctx: Ctx,
  actor: Actor | null,
): Promise<ExportStub> {
  requireRole(actor, ["teacher", "school_admin"]);
  return {
    exported: false,
    connected: false,
    live: false,
    status: "not_connected",
    destinations: ["google_photos", "google_drive"],
  };
}
