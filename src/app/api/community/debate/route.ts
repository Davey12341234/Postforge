import { NextResponse, type NextRequest } from "next/server";
import { guardDebate } from "@/lib/chat-route-guard";
import { resolveLlm } from "@/lib/llm-resolve";
import { openaiChatCompletionJson, pickChatTextFromCompletion } from "@/lib/openai-api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { topic } = (await req.json()) as { topic?: string };
  if (!topic?.trim()) {
    return NextResponse.json({ error: "topic required" }, { status: 400 });
  }

  const gated = await guardDebate(req);
  if (gated) {
    return gated;
  }

  const llm = resolveLlm();
  if (llm.provider === "none") {
    return NextResponse.json({ error: llm.message }, { status: 503 });
  }

  const system = (side: string) =>
    `You are ${side} in a short, good-faith debate (max ~120 words). Topic: ${topic}`;

  try {
    if (llm.provider === "openai") {
      const [a, b] = await Promise.all([
        openaiChatCompletionJson({
          apiKey: llm.apiKey,
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system("FOR the motion") },
            { role: "user", content: "Open with your strongest argument." },
          ],
        }),
        openaiChatCompletionJson({
          apiKey: llm.apiKey,
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: system("AGAINST the motion") },
            { role: "user", content: "Open with your strongest argument." },
          ],
        }),
      ]);
      return NextResponse.json({
        topic: topic.trim(),
        for: pickChatTextFromCompletion(a),
        against: pickChatTextFromCompletion(b),
      });
    }

    const zai = llm.zai;
    const [a, b] = await Promise.all([
      zai.chat.completions.create({
        model: "glm-4-air",
        messages: [
          { role: "system", content: system("FOR the motion") },
          { role: "user", content: "Open with your strongest argument." },
        ],
        stream: false,
        thinking: { type: "disabled" },
      }),
      zai.chat.completions.create({
        model: "glm-4-flash",
        messages: [
          { role: "system", content: system("AGAINST the motion") },
          { role: "user", content: "Open with your strongest argument." },
        ],
        stream: false,
        thinking: { type: "disabled" },
      }),
    ]);

    return NextResponse.json({
      topic: topic.trim(),
      for: pickChatTextFromCompletion(a),
      against: pickChatTextFromCompletion(b),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Debate failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
