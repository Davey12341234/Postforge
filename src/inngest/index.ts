import { inngest } from "@/lib/inngest";
import { unifiedImageGenerated } from "@/inngest/functions/unified-image";
import { retentionCron } from "@/services/retention-cron";

export { inngest };
export const functions = [retentionCron, unifiedImageGenerated];
