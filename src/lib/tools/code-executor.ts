import type { ToolDefinition } from "./types";

const MAX_LEN = 4000;

export const codeExecutorTool: ToolDefinition = {
  name: "code_executor",
  description:
    "Run a short JavaScript expression in a restricted sandbox (Math/JSON/console.log only; no imports).",
  parametersSchema: {
    type: "object",
    properties: {
      code: { type: "string", description: "Single expression returning a printable value" },
    },
    required: ["code"],
  },
  async execute(args) {
    let code = String(args.code ?? "");
    if (code.length > MAX_LEN) code = code.slice(0, MAX_LEN);
    if (!code.trim()) return "Error: empty code";
    const logs: string[] = [];
    const consoleStub = {
      log: (...items: unknown[]) => {
        logs.push(items.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
      },
    };
    try {
      const fn = new Function(
        "Math",
        "JSON",
        "console",
        `"use strict"; return (${code});`,
      );
      const out = fn(Math, JSON, consoleStub);
      const printed = logs.length ? `${logs.join("\n")}\n` : "";
      if (typeof out === "string") return printed + out.slice(0, 8000);
      try {
        return printed + JSON.stringify(out, null, 2).slice(0, 8000);
      } catch {
        return printed + String(out).slice(0, 8000);
      }
    } catch (e) {
      return `code_executor error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
