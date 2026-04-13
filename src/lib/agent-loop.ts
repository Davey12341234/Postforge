import { randomUUID } from "crypto";
import type { ErrorCorrectionLogEntry, ModelTier, ToolCall } from "./types";
import { getToolByName, toolsPromptBlock } from "./tools";
import type { ToolContext } from "./tools/types";
import { executeToolWithRetry, tryRepairJson } from "./quantum-error-correction";
import type ZAI from "z-ai-web-dev-sdk";
import { mapTierToOpenAIModel, openaiChatCompletionJson } from "./openai-api";
import { routeWithKolmogorovDetailed } from "./kolmogorov-router";

type Zai = InstanceType<typeof ZAI>;

type AgentJson = {
  thought?: string;
  finish?: boolean;
  finalAnswer?: string;
  toolCalls?: { name?: string; arguments?: Record<string, unknown> }[];
};

const MAX_STEPS = 5;

function extractAssistantText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const o = data as { choices?: Array<{ message?: { content?: string } }> };
  return o.choices?.[0]?.message?.content ?? "";
}

function parseAgentJson(raw: string): AgentJson | null {
  const repaired = tryRepairJson(raw);
  const text = repaired ?? raw;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as AgentJson;
  } catch {
    return null;
  }
}

function synthesizeFinalFromThought(parsed: AgentJson): string {
  const t = parsed.thought?.trim();
  if (t) return t;
  return "I could not produce a structured agent plan. Please rephrase your request.";
}

export async function runReactAgentLoop(opts: {
  /** Z.AI SDK instance (GLM). Omit when using OpenAI-only path. */
  zai?: Zai;
  /** When set, planner steps use OpenAI Chat Completions (JSON steps). */
  openaiApiKey?: string;
  /** User/assistant messages only (no leading system — added here) */
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  preferredModel: ModelTier;
  kolmogorov: boolean;
  thinking: boolean;
  extraSystem?: string;
}): Promise<{
  toolCalls: ToolCall[];
  errorCorrectionLog: ErrorCorrectionLogEntry[];
  finalText: string;
  routingReason: string;
  plannerModel: ModelTier;
}> {
  if (!opts.zai && !opts.openaiApiKey) {
    throw new Error("runReactAgentLoop: provide zai or openaiApiKey");
  }

  const errorCorrectionLog: ErrorCorrectionLogEntry[] = [];
  const pushLog = (e: ErrorCorrectionLogEntry) => errorCorrectionLog.push(e);

  const uiMessages = opts.messages.filter((m) => m.role !== "system");

  const { model: plannerModel, reason: routingReason } = routeWithKolmogorovDetailed(
    opts.preferredModel,
    uiMessages as { role: "user" | "assistant"; content: string }[],
    opts.kolmogorov,
  );

  const system = [
    "You are BabyGPT in AGENT mode (ReAct).",
    "You must reply with ONE JSON object ONLY (no markdown fences). Schema:",
    `{"thought":"string","finish":boolean,"finalAnswer":"string (when finish)","toolCalls":[{"name":"tool_id","arguments":{}}]}`,
    "If finish is true, put the user-facing answer in finalAnswer.",
    "If you need tools, set finish=false and include toolCalls (can be multiple).",
    "Available tools:\n" + toolsPromptBlock(),
    opts.extraSystem ? "\nContext:\n" + opts.extraSystem : "",
  ].join("\n");

  const dialog: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: system },
    ...uiMessages,
  ];

  const toolCalls: ToolCall[] = [];
  const ctx: ToolContext = { zai: opts.zai };

  let lastFinal: string | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    const thinkingMode =
      opts.thinking ? ({ type: "enabled" as const } satisfies { type: "enabled" }) : { type: "disabled" as const };

    let res: unknown;
    if (opts.zai) {
      res = await opts.zai.chat.completions.create({
        model: plannerModel,
        messages: dialog,
        stream: false,
        thinking: thinkingMode,
      });
    } else {
      const omodel = mapTierToOpenAIModel(plannerModel);
      res = await openaiChatCompletionJson({
        apiKey: opts.openaiApiKey!,
        model: omodel,
        messages: dialog.map((m) => ({ role: m.role, content: m.content })),
      });
    }

    const text = extractAssistantText(res);
    dialog.push({ role: "assistant", content: text });

    const parsed = parseAgentJson(text);
    if (!parsed) {
      pushLog({
        at: Date.now(),
        kind: "parse_fix",
        detail: "Model output was not valid JSON — asking for a repair.",
      });
      dialog.push({
        role: "user",
        content:
          "Your last message was not valid JSON. Reply again with ONLY one JSON object following the schema.",
      });
      continue;
    }

    if (parsed.finish && typeof parsed.finalAnswer === "string" && parsed.finalAnswer.trim()) {
      lastFinal = parsed.finalAnswer.trim();
      break;
    }

    const calls = parsed.toolCalls ?? [];
    if (!calls.length) {
      lastFinal = synthesizeFinalFromThought(parsed);
      break;
    }

    for (const c of calls) {
      const name = String(c.name ?? "");
      const args = (c.arguments ?? {}) as Record<string, unknown>;
      const tool = getToolByName(name);
      if (!tool) {
        const msg = `Observation (${name}): unknown tool`;
        dialog.push({ role: "user", content: msg });
        toolCalls.push({
          id: randomUUID(),
          name,
          arguments: args,
          result: msg,
        });
        continue;
      }

      const result = await executeToolWithRetry(() => tool.execute(args, ctx), { log: pushLog });
      toolCalls.push({
        id: randomUUID(),
        name,
        arguments: args,
        result,
      });
      dialog.push({
        role: "user",
        content: `Observation (${name}):\n${result}`,
      });
    }
  }

  if (!lastFinal) {
    lastFinal =
      "Agent stopped after the maximum number of reasoning steps. Try narrowing the task or enabling Thinking.";
  }

  return {
    toolCalls,
    errorCorrectionLog,
    finalText: lastFinal,
    routingReason,
    plannerModel,
  };
}
