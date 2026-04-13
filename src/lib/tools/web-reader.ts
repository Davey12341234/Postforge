import type { ToolDefinition } from "./types";

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const webReaderTool: ToolDefinition = {
  name: "web_reader",
  description: "Fetch a public URL and return readable plain text (best-effort extraction).",
  parametersSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "HTTP or HTTPS URL" },
    },
    required: ["url"],
  },
  async execute(args) {
    const url = String(args.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) return "Error: url must start with http:// or https://";
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: {
          "User-Agent": "BabyGPT-Agent/1.0 (educational)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        },
      });
      const ct = res.headers.get("content-type") ?? "";
      const buf = await res.arrayBuffer();
      const text = new TextDecoder("utf-8").decode(buf);
      if (ct.includes("text/html")) {
        const plain = stripHtml(text).slice(0, 12000);
        return plain || "(empty body)";
      }
      return text.slice(0, 12000);
    } catch (e) {
      return `web_reader failed: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      clearTimeout(t);
    }
  },
};
