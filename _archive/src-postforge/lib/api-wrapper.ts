import { NextRequest, NextResponse } from "next/server";
import { InsufficientCreditsError } from "@/lib/constants";
import { logger } from "@/lib/logger";

export function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req);
    } catch (error) {
      logger.error(
        { err: error, url: req.url, method: req.method },
        "API error",
      );

      if (error instanceof InsufficientCreditsError) {
        return NextResponse.json(
          { error: "Insufficient credits" },
          { status: 402 },
        );
      }

      const slackUrl = process.env.SLACK_WEBHOOK_URL;
      if (slackUrl && process.env.NODE_ENV === "production") {
        const msg =
          error instanceof Error ? error.message : "Unknown error";
        await fetch(slackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 API Error: ${msg}\n${req.method} ${req.url}`,
          }),
        }).catch(() => {});
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
