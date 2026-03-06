// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// ── Every 30 minutes: Har tarah ka expired data saaf karo (Chat + Media) ──
crons.interval(
  "delete-expired-messages-and-media",
  { minutes: 30 }, // ── Sirf yahan 30 karna tha ──
  internal.cleanup.deleteExpiredMessages,
);

export default crons;