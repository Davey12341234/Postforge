/**
 * Context window trimming — keeps token costs bounded on long conversations.
 *
 * Strategy (cheapest that preserves coherence):
 *   1. Always keep system messages verbatim.
 *   2. Always keep the most recent MAX_TAIL turns.
 *   3. When total chars exceed CHAR_BUDGET, drop oldest non-system turns
 *      until we're under budget, then prepend a one-line summary stub so
 *      the model knows context was trimmed.
 *
 * CHAR_BUDGET of 60 000 chars ≈ ~15 000 tokens (4 chars/token average),
 * well within all Claude and GLM context windows while preventing unbounded
 * cost growth on marathon chat sessions.
 */

export const CONTEXT_CHAR_BUDGET = 60_000;
export const CONTEXT_MAX_TAIL = 12; // always keep at least this many turns

type Msg = { role: "user" | "assistant" | "system"; content: string };

function charCount(msgs: Msg[]): number {
  return msgs.reduce((n, m) => n + m.content.length, 0);
}

/**
 * Trim `messages` so total character count stays within `budget`.
 * Returns a new array — never mutates the input.
 */
export function trimContext(
  messages: Msg[],
  budget = CONTEXT_CHAR_BUDGET,
  maxTail = CONTEXT_MAX_TAIL,
): Msg[] {
  if (charCount(messages) <= budget) return messages;

  const system = messages.filter((m) => m.role === "system");
  const conv = messages.filter((m) => m.role !== "system");

  // Always keep the tail intact
  const tail = conv.slice(-maxTail);
  let middle = conv.slice(0, conv.length - maxTail);

  // Drop from the oldest end of middle until we fit
  while (middle.length > 0 && charCount([...system, ...middle, ...tail]) > budget) {
    middle = middle.slice(1);
  }

  const trimmed = [...system, ...middle, ...tail];

  // If we actually dropped messages, prepend a stub so the model isn't confused
  const dropped = conv.length - middle.length - tail.length;
  if (dropped > 0) {
    const stub: Msg = {
      role: "system",
      content: `[Context trimmed: ${dropped} earlier message${dropped === 1 ? "" : "s"} removed to fit context window.]`,
    };
    return [stub, ...trimmed];
  }

  return trimmed;
}
