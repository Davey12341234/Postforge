import { z } from "zod";

export const dalle3SizeSchema = z.enum(["1024x1024", "1792x1024", "1024x1792"]);
export type Dalle3Size = z.infer<typeof dalle3SizeSchema>;

export const dalle3QualitySchema = z.enum(["standard", "hd"]);
export type Dalle3Quality = z.infer<typeof dalle3QualitySchema>;

export const imageGenerateBodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  size: dalle3SizeSchema.optional().default("1024x1024"),
  quality: dalle3QualitySchema.optional().default("standard"),
  /** Optional extra instructions merged into the prompt (brand context, etc.). */
  styleHint: z.string().max(2000).optional(),
});

export type ImageGenerateBody = z.infer<typeof imageGenerateBodySchema>;
