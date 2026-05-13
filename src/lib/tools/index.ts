import { calculatorTool } from "./calculator";
import { codeExecutorTool } from "./code-executor";
import type { ToolDefinition } from "./types";
import { webReaderTool } from "./web-reader";
import { webSearchTool } from "./web-search";

export const ALL_TOOLS: ToolDefinition[] = [
  webSearchTool,
  webReaderTool,
  calculatorTool,
  codeExecutorTool,
];

export function getToolByName(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}

export function toolsPromptBlock(): string {
  return ALL_TOOLS.map(
    (t) =>
      `- ${t.name}: ${t.description}\n  Parameters JSON schema: ${JSON.stringify(t.parametersSchema)}`,
  ).join("\n");
}
