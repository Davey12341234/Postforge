import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerWallet, tryDebitServerWallet } from "@/lib/server-wallet";
import { PLANS } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";
import {
  COMMUNITY_DEBATE_COST,
  estimateSendCredits,
  planPermitsSend,
  type SendMode,
} from "@/lib/usage-cost";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Auth + optional server wallet debit for chat-style routes.
 * When gate is disabled, returns `null` (caller continues, no server debit).
 */
export async function guardChatSend(
  request: NextRequest,
  input: { model: ModelTier; thinking: boolean; mode: SendMode },
): Promise<NextResponse | null> {
  const denied = await assertAuthorized(request);
  if (denied) {
    return denied;
  }
  if (!isGateEnabled()) {
    return null;
  }

  const wallet = readServerWallet();
  const plan = PLANS[wallet.planId];
  if (!planPermitsSend(plan, input)) {
    return NextResponse.json(
      { error: "Your plan does not include this model or mode. Change plan or settings." },
      { status: 403 },
    );
  }

  const cost = estimateSendCredits(input);
  const { ok } = tryDebitServerWallet(cost);
  if (!ok) {
    return NextResponse.json(
      { error: `Insufficient credits (this send needs ${cost}).` },
      { status: 402 },
    );
  }
  return null;
}

export async function guardDebate(request: NextRequest): Promise<NextResponse | null> {
  const denied = await assertAuthorized(request);
  if (denied) {
    return denied;
  }
  if (!isGateEnabled()) {
    return null;
  }

  const wallet = readServerWallet();
  const plan = PLANS[wallet.planId];
  if (!plan.features.communityDebate) {
    return NextResponse.json({ error: "Debate not included on your plan." }, { status: 403 });
  }

  const { ok } = tryDebitServerWallet(COMMUNITY_DEBATE_COST);
  if (!ok) {
    return NextResponse.json(
      { error: `Insufficient credits (debate costs ${COMMUNITY_DEBATE_COST}).` },
      { status: 402 },
    );
  }
  return null;
}

/** Gate-only (no debit) for community CRUD. */
export async function guardApi(request: NextRequest): Promise<NextResponse | null> {
  return assertAuthorized(request);
}
