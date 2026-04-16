export type CommentSentiment = "pos" | "neu" | "neg";

const NEG_HINTS = [
  "worst",
  "hate",
  "terrible",
  "awful",
  "stupid",
  "idiot",
  "sucks",
  "garbage",
  "trash",
  "pathetic",
  "disgusting",
  "horrible",
  "useless",
];
const POS_HINTS = [
  "great",
  "love",
  "thanks",
  "awesome",
  "nice",
  "helpful",
  "beautiful",
  "appreciate",
  "inspiring",
  "yes",
];

/** Heuristic for community tone — errs toward blocking harsh drive-by negativity. */
export function analyzeCommentSentiment(text: string): CommentSentiment {
  const t = text.toLowerCase();
  const neg = NEG_HINTS.filter((w) => t.includes(w)).length + (t.includes("bad") ? 1 : 0);
  const pos = POS_HINTS.filter((w) => t.includes(w)).length;
  if (pos > neg) return "pos";
  if (neg > pos) return "neg";
  return "neu";
}

/** Community feed keeps comments constructive — no pile-ons or harsh insults. */
export function shouldRejectCommunityComment(text: string): boolean {
  return analyzeCommentSentiment(text) === "neg";
}
