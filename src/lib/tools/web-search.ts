import type { ToolDefinition } from "./types";

/** DuckDuckGo lite + optional Z.AI web_search. Full browser automation (e.g. OpenClaw-style Playwright agents) is out of scope here — run as a separate service if you need it. */
async function duckDuckGoLite(query: string): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const res = await fetch(url, { headers: { "User-Agent": "BabyGPT/1.0 (tool)" } });
  const j = (await res.json()) as {
    AbstractText?: string;
    AbstractURL?: string;
    RelatedTopics?: { Text?: string }[];
  };
  const parts: string[] = [];
  if (j.AbstractText) parts.push(j.AbstractText);
  if (j.AbstractURL) parts.push(`Source: ${j.AbstractURL}`);
  if (j.RelatedTopics?.length) {
    parts.push(
      ...j.RelatedTopics.slice(0, 5).map((t) => t.Text).filter(Boolean) as string[],
    );
  }
  return parts.length
    ? parts.join("\n")
    : "No instant DuckDuckGo summary. Try a more specific query, or configure Z.AI for full web search.";
}

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  description: "Search the public web for current facts, news, documentation, or links.",
  parametersSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query" },
      num: { type: "number", description: "Max results (default 5)" },
    },
    required: ["query"],
  },
  async execute(args, ctx) {
    const query = String(args.query ?? "").trim();
    if (!query) return "Error: empty query";
    const num = Math.min(10, Math.max(1, Number(args.num ?? 5)));
    void num;
    try {
      if (ctx.zai) {
        const raw = await ctx.zai.functions.invoke("web_search", { query, num });
        if (typeof raw === "string") return raw;
        return JSON.stringify(raw, null, 2);
      }
      return await duckDuckGoLite(query);
    } catch (e) {
      return `web_search failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
};
