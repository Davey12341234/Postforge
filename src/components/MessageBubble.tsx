"use client";

import { useCallback, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage } from "@/lib/types";
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
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => void copyAssistant()}
              className="rounded-lg bg-zinc-950/60 px-2 py-1 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
            >
              {copied ? "Copied" : "Copy"}
            </button>
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
