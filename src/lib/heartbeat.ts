import { predictNextUserIntent } from "./retrocausal-prediction";
import { dueReminders, removeReminder } from "./reminders";

export type HeartbeatSuggestion = {
  id: string;
  title: string;
  body: string;
  draft: string;
};

const INTERVAL_MS = 5 * 60_000;

export function startHeartbeat(opts: {
  getLastUserMessage: () => string | null;
  onSuggest: (s: HeartbeatSuggestion) => void;
}): () => void {
  const tick = () => {
    const now = Date.now();
    const due = dueReminders(now);
    if (due.length) {
      const r = due[0];
      opts.onSuggest({
        id: `rem-${r.id}`,
        title: "Reminder",
        body: r.text,
        draft: `Follow up: ${r.text}`,
      });
      removeReminder(r.id);
      return;
    }

    const last = opts.getLastUserMessage();
    if (last) {
      const ideas = predictNextUserIntent(last);
      if (ideas.length) {
        const pick = ideas[Math.floor(Math.random() * ideas.length)];
        opts.onSuggest({
          id: `retro-${now}`,
          title: "BabyGPT suggests",
          body: `Would you like to continue: ${pick}?`,
          draft: pick,
        });
      }
    }
  };

  const id = window.setInterval(tick, INTERVAL_MS);
  return () => window.clearInterval(id);
}

export { INTERVAL_MS };
