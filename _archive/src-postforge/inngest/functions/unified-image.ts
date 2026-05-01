import { inngest } from "@/lib/inngest";

/**
 * Fired after a DALL·E 3 image is stored (local or R2). Extend for webhooks,
 * analytics pipelines, or downstream publish workflows.
 */
export const unifiedImageGenerated = inngest.createFunction(
  {
    id: "unified-image-generated",
    name: "Unified / image generated",
    triggers: [{ event: "unified/image.generated" }],
  },
  async ({ event }: { event: { data: Record<string, unknown> } }) => {
    const data = event.data as {
      imageId?: string;
      profileId?: string;
      publicUrl?: string;
      costCredits?: number;
    };
    return { ok: true, imageId: data.imageId };
  },
);
