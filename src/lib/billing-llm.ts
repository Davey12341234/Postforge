import { resolveLlm } from "@/lib/llm-resolve";
import { openaiChatCompletionJson, pickChatTextFromCompletion } from "@/lib/openai-api";

export async function completeBillingText(opts: {
  system: string;
  user: string;
}): Promise<{ text: string } | { error: string }> {
  const llm = resolveLlm();
  if (llm.provider === "none") {
    return { error: llm.message };
  }

  const messages = [
    { role: "system" as const, content: opts.system },
    { role: "user" as const, content: opts.user },
  ];

  try {
    if (llm.provider === "openai") {
      const data = await openaiChatCompletionJson({
        apiKey: llm.apiKey,
        model: "gpt-4o-mini",
        messages,
      });
      return { text: pickChatTextFromCompletion(data).trim() };
    }

    const zai = llm.zai;
    const raw = await zai.chat.completions.create({
      model: "glm-4-flash",
      messages,
      stream: false,
      thinking: { type: "disabled" },
    });
    return { text: pickChatTextFromCompletion(raw as unknown).trim() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LLM request failed";
    return { error: msg };
  }
}
