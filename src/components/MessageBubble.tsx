"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { formatBytes } from "@/lib/file-attachments";
import type { ChatMessage } from "@/lib/types";
import {
  getActiveSpeechMessageId,
  isSpeechSynthesisAvailable,
  speakAssistantMessage,
  stopSpeech,
  subscribeSpeechActive,
} from "@/lib/speech-synthesis";
import { ThinkingCanvas } from "./ThinkingCanvas";

export function MessageBubble({
  message,
  isStreamingThinking,
  showGeneratingPlaceholder,
}: {
  message: ChatMessage;
  /** True while SSE is still filling this assistant message */
  isStreamingThinking?: boolean;
  /** Pulse line when assistant shell is still empty */
  showGeneratingPlaceholder?: boolean;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const speechActiveId = useSyncExternalStore(
    subscribeSpeechActive,
    getActiveSpeechMessageId,
    () => null,
  );
  const isSpeakingThis = !isUser && speechActiveId === message.id;
  const canSpeak = !isUser && isSpeechSynthesisAvailable();

  const copyAssistant = useCallback(async () => {
    if (!message.content.trim()) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [message.content]);

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(720px,92vw)] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-emerald-600/25 text-zinc-100 ring-1 ring-emerald-500/30"
            : "bg-zinc-900/80 text-zinc-100 ring-1 ring-zinc-800"
        }`}
      >
        {message.thinking ? (
          <>
            <ThinkingCanvas text={message.thinking} active={Boolean(isStreamingThinking)} />
            <details className="mb-2 rounded-lg bg-zinc-950/40 p-2 text-xs text-zinc-500 ring-1 ring-zinc-800">
              <summary className="cursor-pointer select-none text-zinc-400">Raw reasoning</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-sans text-[11px] text-zinc-500">
                {message.thinking}
              </pre>
            </details>
          </>
        ) : null}

        {message.toolCalls?.length ? (
          <details className="mb-2 rounded-lg bg-zinc-950/60 p-2 text-xs ring-1 ring-zinc-800" open>
            <summary className="cursor-pointer select-none text-zinc-300">Tool calls</summary>
            <div className="mt-2 space-y-2">
              {message.toolCalls.map((t) => (
                <div key={t.id} className="rounded-lg bg-black/30 p-2">
                  <div className="font-mono text-[11px] text-cyan-300">{t.name}</div>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-zinc-500">
                    {JSON.stringify(t.arguments, null, 2)}
                  </pre>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-zinc-400">
                    {t.result}
                  </pre>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        {message.errorCorrectionLog?.length ? (
          <details className="mb-2 rounded-lg bg-zinc-950/40 p-2 text-xs text-zinc-500 ring-1 ring-zinc-800">
            <summary className="cursor-pointer select-none text-zinc-400">Corrections</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {message.errorCorrectionLog.map((e, i) => (
                <li key={`${e.at}-${i}`}>
                  <span className="text-zinc-600">[{e.kind}]</span> {e.detail}
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        {!isUser && message.content.trim() ? (
          <div className="mb-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => void copyAssistant()}
              className="rounded-lg bg-zinc-950/60 px-2 py-1 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            {canSpeak ? (
              <button
                type="button"
                onClick={() => {
                  if (isSpeakingThis) {
                    stopSpeech();
                    return;
                  }
                  speakAssistantMessage(message.id, message.content);
                }}
                className={`rounded-lg px-2 py-1 text-[11px] font-medium ring-1 ring-zinc-800 ${
                  isSpeakingThis
                    ? "bg-cyan-950/80 text-cyan-200 hover:bg-cyan-900/80"
                    : "bg-zinc-950/60 text-zinc-400 hover:text-zinc-200"
                }`}
                title="Read this reply aloud (browser text-to-speech)"
              >
                {isSpeakingThis ? "Stop" : "Speak"}
              </button>
            ) : null}
          </div>
        ) : null}

        {isUser && message.attachments?.length ? (
          <div className="mb-2 flex flex-col gap-2">
            {message.attachments.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-zinc-800/90 bg-zinc-950/40 p-2 ring-1 ring-white/5"
              >
                <div className="text-[10px] text-zinc-500">
                  {a.name} · {formatBytes(a.sizeBytes)}
                </div>
                {a.mimeType.startsWith("image/") && a.dataBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-attached preview
                  <img
                    src={`data:${a.mimeType};base64,${a.dataBase64}`}
                    alt=""
                    className="mt-1 max-h-48 max-w-full rounded-lg object-contain"
                  />
                ) : a.mimeType.startsWith("image/") ? (
                  <p className="mt-1 text-[10px] text-zinc-600">Image (uploaded to Gemini — preview not stored)</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : showGeneratingPlaceholder ? (
          <p className="animate-pulse text-zinc-500">Generating…</p>
        ) : (
          <div className="babygpt-markdown prose prose-invert max-w-none prose-p:my-2 prose-headings:my-3">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
