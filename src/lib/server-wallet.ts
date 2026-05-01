import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import type { CreditsStateV1 } from "@/lib/credits-store";
import { getDataDir } from "@/lib/data-dir";
import { isPostgresPersistenceEnabled } from "@/lib/persistence-env";
import type { PlanId } from "@/lib/plans";
import {
  dbReadCreditsHydrated,
  dbSetPlan,
  dbTryDebit,
  dbWriteCreditsState,
} from "@/lib/site-wallet-store";
import { getDefaultWalletClerkId } from "@/lib/site-wallet-user";
import { getWalletClerkIdFromRequest } from "@/lib/session-server";
import { defaultWalletState, hydrateServerWallet, parseWalletJson } from "@/lib/wallet-hydrate";

import type { NextRequest } from "next/server";

/** Persisted under `.data/` locally or `/tmp/bbgpt-data` on Vercel when `POSTGRES_URL` is unset (gitignored locally). */
const DATA_DIR = getDataDir();
const WALLET_FILE = join(DATA_DIR, "wallet.json");

export { isPostgresPersistenceEnabled as isPostgresWalletPersistence };

function ensureWalletFile(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(WALLET_FILE)) {
    const w = hydrateServerWallet(defaultWalletState());
    writeFileSync(WALLET_FILE, JSON.stringify(w, null, 2), "utf-8");
  }
}

function readServerWalletFile(): CreditsStateV1 {
  ensureWalletFile();
  const raw = readFileSync(WALLET_FILE, "utf-8");
  return hydrateServerWallet(parseWalletJson(raw));
}

function writeServerWalletFile(state: CreditsStateV1): void {
  ensureWalletFile();
  writeFileSync(WALLET_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export { hydrateServerWallet };

async function clerkIdFromRequestMaybe(req?: NextRequest): Promise<string> {
  if (!req) return getDefaultWalletClerkId();
  return getWalletClerkIdFromRequest(req);
}

export async function readServerWallet(req?: NextRequest): Promise<CreditsStateV1> {
  if (isPostgresPersistenceEnabled()) {
    const clerkId = await clerkIdFromRequestMaybe(req);
    return dbReadCreditsHydrated(clerkId);
  }
  return readServerWalletFile();
}

export async function writeServerWallet(state: CreditsStateV1, req?: NextRequest): Promise<void> {
  if (isPostgresPersistenceEnabled()) {
    const clerkId = await clerkIdFromRequestMaybe(req);
    await dbWriteCreditsState(clerkId, state);
    return;
  }
  writeServerWalletFile(state);
}

export async function tryDebitServerWallet(
  amount: number,
  req?: NextRequest,
): Promise<{ ok: boolean; wallet: CreditsStateV1 }> {
  if (isPostgresPersistenceEnabled()) {
    const clerkId = await clerkIdFromRequestMaybe(req);
    return dbTryDebit(clerkId, amount);
  }
  const w = readServerWalletFile();
  if (w.balance < amount) {
    return { ok: false, wallet: w };
  }
  const next: CreditsStateV1 = { ...w, balance: Math.max(0, w.balance - amount) };
  writeServerWalletFile(next);
  return { ok: true, wallet: next };
}

export async function setServerPlan(planId: PlanId, req?: NextRequest): Promise<CreditsStateV1> {
  if (isPostgresPersistenceEnabled()) {
    const clerkId = await clerkIdFromRequestMaybe(req);
    return dbSetPlan(clerkId, planId);
  }
  const w = readServerWalletFile();
  const next = { ...w, planId };
  writeServerWalletFile(next);
  return next;
}
