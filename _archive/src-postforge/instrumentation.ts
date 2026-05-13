import { logProductionEnvWarnings } from "@/lib/env-production-warnings";

/**
 * Runs once when the Node server starts (production deploy).
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  logProductionEnvWarnings();
}
