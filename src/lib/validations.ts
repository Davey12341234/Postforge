import { z } from "zod";

export const generateRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  postCount: z.coerce.number().min(1).max(10).optional().default(3),
  brandId: z.string().min(1).optional(),
});
