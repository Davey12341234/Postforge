import { inngest } from "@/lib/inngest";
import { retentionCron } from "@/services/retention-cron";

export { inngest };
export const functions = [retentionCron];
