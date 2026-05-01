import OpenAI from "openai";
import type { Dalle3Quality, Dalle3Size } from "@/lib/image-gen/types";

export type Dalle3GenerateResult = {
  url: string;
  revisedPrompt?: string | null;
};

export async function generateDalle3Image(options: {
  prompt: string;
  size: Dalle3Size;
  quality: Dalle3Quality;
}): Promise<Dalle3GenerateResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const openai = new OpenAI({ apiKey: key });
  const res = await openai.images.generate({
    model: "dall-e-3",
    prompt: options.prompt,
    n: 1,
    size: options.size,
    quality: options.quality,
    response_format: "url",
  });
  const first = res.data?.[0];
  const url = first?.url;
  if (!url) {
    throw new Error("DALL·E 3 returned no image URL");
  }
  return {
    url,
    revisedPrompt: first?.revised_prompt ?? null,
  };
}
