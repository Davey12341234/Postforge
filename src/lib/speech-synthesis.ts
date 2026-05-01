/**
 * Browser Speech Synthesis (Web Speech API) — one utterance at a time app-wide.
 */

type Listener = (activeMessageId: string | null) => void;

const listeners = new Set<Listener>();
let activeMessageId: string | null = null;

function notify(): void {
  for (const l of listeners) l(activeMessageId);
}

export function getActiveSpeechMessageId(): string | null {
  return activeMessageId;
}

export function subscribeSpeechActive(listener: Listener): () => void {
  listeners.add(listener);
  listener(activeMessageId);
  return () => {
    listeners.delete(listener);
  };
}

/** Strip common Markdown so TTS reads more naturally (best-effort). */
export function textForSpeech(markdown: string): string {
  let t = markdown;
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/^#{1,6}\s+/gm, "");
  t = t.replace(/^\s*[-*+]\s+/gm, "");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/_{1,2}([^_]+)_{1,2}/g, "$1");
  t = t.replace(/\s+/g, " ");
  return t.trim();
}

export function isSpeechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";
}

export function speakAssistantMessage(messageId: string, markdownContent: string): boolean {
  if (!isSpeechSynthesisAvailable()) return false;
  const text = textForSpeech(markdownContent);
  if (!text) return false;

  window.speechSynthesis.cancel();
  activeMessageId = messageId;
  notify();

  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;

  const done = () => {
    if (activeMessageId === messageId) {
      activeMessageId = null;
      notify();
    }
  };
  u.onend = done;
  u.onerror = done;

  try {
    window.speechSynthesis.speak(u);
  } catch {
    activeMessageId = null;
    notify();
    return false;
  }
  return true;
}

export function stopSpeech(): void {
  if (!isSpeechSynthesisAvailable()) return;
  window.speechSynthesis.cancel();
  activeMessageId = null;
  notify();
}
