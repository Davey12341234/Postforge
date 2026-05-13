import { existsSync, readFileSync } from "fs";
import path from "path";
import ZAI from "z-ai-web-dev-sdk";

/** GLM / Z.AI Open Platform (BigModel) compatible base; see https://open.bigmodel.cn/ */
export const DEFAULT_Z_AI_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";

type ZaiFileConfig = { baseUrl?: string; apiKey?: string };

function readProjectZAiConfig(): ZaiFileConfig | null {
  try {
    const p = path.join(process.cwd(), ".z-ai-config");
    if (!existsSync(p)) return null;
    const raw = readFileSync(p, "utf-8");
    const j = JSON.parse(raw) as ZaiFileConfig;
    return j && typeof j === "object" ? j : null;
  } catch {
    return null;
  }
}

function trim(s: string | undefined): string {
  return (s ?? "").trim();
}

/**
 * Resolves Z.AI credentials from (highest priority first):
 * - `Z_AI_BASE_URL` + `Z_AI_API_KEY`
 * - `BIGMODEL_BASE_URL` + `BIGMODEL_API_KEY` / `GLM_API_KEY` / `ZHIPUAI_API_KEY`
 * - Project root `.z-ai-config` JSON (`baseUrl`, `apiKey`)
 * If `apiKey` is set but base URL is missing, uses {@link DEFAULT_Z_AI_BASE_URL}.
 */
export function getZaiConfig(): { baseUrl: string; apiKey: string } {
  const file = readProjectZAiConfig();

  const apiKey =
    trim(process.env.Z_AI_API_KEY) ||
    trim(process.env.BIGMODEL_API_KEY) ||
    trim(process.env.GLM_API_KEY) ||
    trim(process.env.ZHIPUAI_API_KEY) ||
    trim(file?.apiKey);

  let baseUrl =
    trim(process.env.Z_AI_BASE_URL) ||
    trim(process.env.BIGMODEL_BASE_URL) ||
    trim(file?.baseUrl);

  if (apiKey && !baseUrl) {
    baseUrl = DEFAULT_Z_AI_BASE_URL;
  }

  if (!apiKey || !baseUrl) {
    throw new Error(
      [
        "Missing Z.AI API credentials.",
        "Do one of the following:",
        `1) Add Z_AI_API_KEY to .env.local (optional: Z_AI_BASE_URL, defaults to ${DEFAULT_Z_AI_BASE_URL})`,
        "2) Or set BIGMODEL_API_KEY / GLM_API_KEY",
        "3) Or create .z-ai-config in the project root: {\"baseUrl\":\"...\",\"apiKey\":\"...\"}",
        "Get a key: https://open.bigmodel.cn/",
      ].join(" "),
    );
  }

  return { baseUrl, apiKey };
}

export function createZai(): InstanceType<typeof ZAI> {
  return new ZAI(getZaiConfig());
}
