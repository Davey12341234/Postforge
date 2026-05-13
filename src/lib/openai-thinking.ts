type ChatRole = "system" | "user" | "assistant";

/**
 * OpenAI’s Chat Completions API has no GLM-style `thinking` channel, so when the user
 * enables “Thinking” we strengthen the system prompt with an explicit reasoning instruction.
 */
export function mergeOpenAiThinkingDirective(
  messages: { role: ChatRole; content: string }[],
): { role: ChatRole; content: string }[] {
  const directive =
    "Instructions: reason step-by-step internally, then reply with only the final user-facing answer (clear and direct). Do not expose raw chain-of-thought unless the user asks for your reasoning.";
  const idx = messages.findIndex((m) => m.role === "system");
  if (idx >= 0) {
    const copy = [...messages];
    const cur = copy[idx]!;
    copy[idx] = { ...cur, content: `${cur.content}\n\n${directive}` };
    return copy;
  }
  return [{ role: "system", content: directive }, ...messages];
}
