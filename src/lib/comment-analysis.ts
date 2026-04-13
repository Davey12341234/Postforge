export type CommentSentiment = "pos" | "neu" | "neg";

export function analyzeCommentSentiment(text: string): CommentSentiment {
  const t = text.toLowerCase();
  const neg = ["not", "bad", "worst", "hate", "never"].filter((w) => t.includes(w)).length;
  const pos = ["great", "love", "thanks", "awesome", "nice"].filter((w) => t.includes(w)).length;
  if (pos > neg) return "pos";
  if (neg > pos) return "neg";
  return "neu";
}
