import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { retentionCron } from "@/services/retention-cron";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [retentionCron],
});
