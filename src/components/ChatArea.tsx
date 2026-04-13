"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import type { PlanDefinition } from "@/lib/plans";
import type { PowerTemplate } from "@/lib/instant-templates";

export function ChatArea({
  messages,
  empty,
  onOpenPlans,
  onOpenSearch,
  onJumpToQuantum,
  busy,
  streamingAssistantId,
  plan,
  onPickTemplate,
  onInsertComposerText,
}: {
  messages: ChatMessage[];
  empty: boolean;
  onOpenPlans: () => void;
  onOpenSearch: () => void;
  onJumpToQuantum: () => void;
  busy?: boolean;
  streamingAssistantId?: string | null;
  plan: PlanDefinition;
  onPickTemplate: (t: PowerTemplate) => void;
  /** replace = set draft; prefixFirst = put text at start of composer (for mode prefixes). */
  onInsertComposerText: (text: string, how?: "replace" | "prefixFirst") => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastContent = messages.at(-1)?.content ?? "";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastContent]);

  if (empty) {
    return (
      <div className="flex-1 overflow-auto">
        <WelcomeScreen
          onOpenPlans={onOpenPlans}
          onOpenSearch={onOpenSearch}
          onJumpToQuantum={onJumpToQuantum}
          plan={plan}
          onPickTemplate={onPickTemplate}
          onInsertComposerText={onInsertComposerText}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isStreamingThinking={Boolean(busy && streamingAssistantId === m.id && m.role === "assistant")}
            showGeneratingPlaceholder={Boolean(
              busy &&
                streamingAssistantId === m.id &&
                m.role === "assistant" &&
                !m.content.trim() &&
                !(m.thinking && m.thinking.trim()),
            )}
          />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
