import type { ErrorCorrectionLogEntry, ToolCall } from "./types";

export function extractSseTextDelta(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  try {
    const j = JSON.parse(payload) as {
      schrodinger?: boolean;
      winner?: string;
      bbgpt_agent?: unknown;
      babygpt_agent?: unknown;
      choices?: { delta?: { content?: string }; message?: { content?: string } }[];
    };
    if (j.schrodinger) return "";
    const c =
      j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? "";
    return typeof c === "string" ? c : "";
  } catch {
    return "";
  }
}

/** Extended reasoning / chain-of-thought chunks (GLM thinking mode, OpenAI-style reasoning, etc.). */
export function extractSseThinkingDelta(line: string): string {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return "";
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return "";
  try {
    const j = JSON.parse(payload) as {
      schrodinger?: boolean;
      bbgpt_agent?: unknown;
      babygpt_agent?: unknown;
      choices?: {
        delta?: {
          reasoning_content?: string;
          thinking?: string;
        };
      }[];
    };
    if (j.schrodinger || j.bbgpt_agent || j.babygpt_agent) return "";
    const d = j.choices?.[0]?.delta;
    if (!d) return "";
    const t = d.reasoning_content ?? d.thinking ?? "";
    return typeof t === "string" ? t : "";
  } catch {
    return "";
  }
}

export type AgentStreamMeta = {
  toolCalls: ToolCall[];
  errorCorrectionLog: ErrorCorrectionLogEntry[];
  routingReason: string;
};

export function parseSseAgentMeta(line: string): AgentStreamMeta | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice(5).trim();
  if (!payload) return null;
  try {
    const j = JSON.parse(payload) as {
      bbgpt_agent?: {
        toolCalls?: ToolCall[];
        errorCorrectionLog?: ErrorCorrectionLogEntry[];
        routingReason?: string;
      };
      babygpt_agent?: {
        toolCalls?: ToolCall[];
        errorCorrectionLog?: ErrorCorrectionLogEntry[];
        routingReason?: string;
      };
    };
    const agent = j.bbgpt_agent ?? j.babygpt_agent;
    if (!agent) return null;
    return {
      toolCalls: agent.toolCalls ?? [],
      errorCorrectionLog: agent.errorCorrectionLog ?? [],
      routingReason: agent.routingReason ?? "",
    };
  } catch {
    return null;
  }
}
