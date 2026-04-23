import { join } from "path";

/** Server wallet + billing JSON. On Vercel/serverless cwd is read-only — use `/tmp`. */
export function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    return join("/tmp", "bbgpt-data");
  }
  return join(process.cwd(), ".data");
}
