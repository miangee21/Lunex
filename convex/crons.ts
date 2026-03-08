// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "delete-expired-messages-and-media",
  { minutes: 30 },
  internal.cleanup.deleteExpiredMessages,
);

export default crons;
