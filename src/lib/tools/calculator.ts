import type { ToolDefinition } from "./types";

const SAFE = /^[0-9+\-*/().\s]+$/;

export const calculatorTool: ToolDefinition = {
  name: "calculator",
  description: "Evaluate a numeric arithmetic expression safely (+ - * / parentheses).",
  parametersSchema: {
    type: "object",
    properties: {
      expression: { type: "string", description: 'Expression like "2*(3+4)"' },
    },
    required: ["expression"],
  },
  async execute(args) {
    const expr = String(args.expression ?? "").trim();
    if (!expr) return "Error: empty expression";
    if (!SAFE.test(expr)) return "Error: only digits, + - * / ( ) and spaces allowed";
    try {
      const fn = new Function(`"use strict"; return (${expr});`);
      const v = fn();
      if (typeof v !== "number" || !Number.isFinite(v)) return "Error: invalid result";
      return String(v);
    } catch (e) {
      return `calculator error: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
