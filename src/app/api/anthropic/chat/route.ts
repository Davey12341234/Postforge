import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Secure proxy for Anthropic Messages API (API key stays server-side).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const body = (await req.json()) as {
      messages?: Array<{ role: string; content: string }>;
      system?: string;
      max_tokens?: number;
      model?: string;
    };

    const {
      messages,
      system,
      max_tokens = 1000,
      model = "claude-sonnet-4-20250514",
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens,
        ...(system && { system }),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errJson = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      console.error("Anthropic API error:", errJson);
      return NextResponse.json(
        { error: errJson.error?.message ?? "AI service unavailable" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as unknown;
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Anthropic proxy error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
