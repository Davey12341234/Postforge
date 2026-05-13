/**
 * Lightweight heuristic “mood” from draft + recent user text — drives subtle UI tint only.
 */

export type MoodId = "analytical" | "creative" | "learning" | "urgent" | "philosophical" | "neutral";

export type Mood = {
  id: MoodId;
  label: string;
  emoji: string;
  /** Applied to main column for gradient + border tint */
  shellClass: string;
  /** Subtle header underline / ring accent */
  accentClass: string;
};

const MOODS: Record<MoodId, Mood> = {
  analytical: {
    id: "analytical",
    label: "Analytical",
    emoji: "🔬",
    shellClass:
      "from-sky-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-sky-500/15",
    accentClass: "ring-sky-500/40 text-sky-200/90",
  },
  creative: {
    id: "creative",
    label: "Creative",
    emoji: "🎨",
    shellClass:
      "from-fuchsia-950/20 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-fuchsia-500/15",
    accentClass: "ring-fuchsia-500/35 text-fuchsia-200/90",
  },
  learning: {
    id: "learning",
    label: "Learning",
    emoji: "📚",
    shellClass:
      "from-amber-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-amber-500/15",
    accentClass: "ring-amber-500/35 text-amber-200/90",
  },
  urgent: {
    id: "urgent",
    label: "Urgent",
    emoji: "⚡",
    shellClass:
      "from-rose-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-rose-500/20",
    accentClass: "ring-rose-500/40 text-rose-200/90",
  },
  philosophical: {
    id: "philosophical",
    label: "Philosophical",
    emoji: "🌌",
    shellClass:
      "from-violet-950/25 via-zinc-950/80 to-zinc-950 bg-gradient-to-br ring-violet-500/15",
    accentClass: "ring-violet-500/35 text-violet-200/90",
  },
  neutral: {
    id: "neutral",
    label: "Neutral",
    emoji: "◆",
    shellClass: "from-zinc-950 via-zinc-950 to-zinc-950 bg-gradient-to-br ring-zinc-800/40",
    accentClass: "ring-zinc-700 text-zinc-400",
  },
};

export function inferMood(text: string): Mood {
  const t = text.toLowerCase();
  if (!t.trim()) return MOODS.neutral;

  if (
    /\b(urgent|asap|deadline|production|crash|error|segfault|outage|incident)\b/.test(t) ||
    /!!!/.test(text)
  ) {
    return MOODS.urgent;
  }
  if (
    /\b(why|meaning|consciousness|ethics|exist|universe|should we|philosophy|moral)\b/.test(t)
  ) {
    return MOODS.philosophical;
  }
  if (
    /\b(story|poem|creative|imagine|brand|design|write a song|fiction|art)\b/.test(t) ||
    /\b(color|colour|visual|aesthetic)\b/.test(t)
  ) {
    return MOODS.creative;
  }
  if (
    /\b(learn|explain|tutorial|what is|how does|beginner|eli5|simple)\b/.test(t) ||
    /\b(teach|course|study)\b/.test(t)
  ) {
    return MOODS.learning;
  }
  if (
    /\b(analyze|data|metric|sql|spreadsheet|logic|proof|derive|compare|optimize|benchmark)\b/.test(
      t,
    ) ||
    /\b(code|function|class|debug|refactor|typescript|python)\b/.test(t)
  ) {
    return MOODS.analytical;
  }

  return MOODS.neutral;
}
