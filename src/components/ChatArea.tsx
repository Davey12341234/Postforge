"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { WelcomeScreen } from "./WelcomeScreen";
import type { PlanDefinition } from "@/lib/plans";
import type { PowerTemplate } from "@/lib/instant-templates";
import { CHAT_COLUMN_CLASS } from "@/lib/chat-layout";

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
  introIntakeComplete,
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
  /** False until the blocking connection questionnaire has been completed in this browser. */
  introIntakeComplete?: boolean;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  const lastContent = messages.at(-1)?.content ?? "";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, lastContent]);

  if (empty) {
    return (
      <div className="bbgpt-chat-scroll flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y">
        <WelcomeScreen
          onOpenPlans={onOpenPlans}
          onOpenSearch={onOpenSearch}
          onJumpToQuantum={onJumpToQuantum}
          plan={plan}
          onPickTemplate={onPickTemplate}
          onInsertComposerText={onInsertComposerText}
          introIntakeComplete={introIntakeComplete}
        />
      </div>
    );
  }

  return (
      <div className="bbgpt-chat-scroll flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-4 touch-pan-y sm:px-4 sm:py-5">
      <div className={`flex flex-col gap-3 ${CHAT_COLUMN_CLASS}`}>
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
