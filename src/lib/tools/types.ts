import type ZAI from "z-ai-web-dev-sdk";

export type ZaiInstance = InstanceType<typeof ZAI>;

export type ToolContext = {
  /** Present when using Z.AI backend (enables `web_search` via platform function). */
  zai?: ZaiInstance;
};

export interface ToolDefinition {
  name: string;
  description: string;
  /** JSON-schema-like object for the agent prompt */
  parametersSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}
