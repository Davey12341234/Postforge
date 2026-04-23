import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { CreditsStateV1 } from "@/lib/credits-store";
import { DEFAULT_PLAN, FIRST_VISIT_CREDIT_BONUS, PLANS, type PlanId } from "@/lib/plans";

import { getDataDir } from "@/lib/data-dir";

/** Persisted under `.data/` locally or `/tmp/bbgpt-data` on Vercel (gitignored locally). */
const DATA_DIR = getDataDir();
const WALLET_FILE = join(DATA_DIR, "wallet.json");

function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultWallet(): CreditsStateV1 {
  return {
    version: 1,
    planId: DEFAULT_PLAN,
    balance: 0,
    accrualMonth: monthKey(),
    welcomeApplied: false,
  };
}

function parseWallet(raw: string): CreditsStateV1 {
  try {
    const p = JSON.parse(raw) as CreditsStateV1;
    if (p?.version !== 1) return defaultWallet();
    return {
      ...defaultWallet(),
      ...p,
      planId: (p.planId ?? DEFAULT_PLAN) as PlanId,
      balance: typeof p.balance === "number" && p.balance >= 0 ? Math.floor(p.balance) : 0,
      accrualMonth: typeof p.accrualMonth === "string" ? p.accrualMonth : monthKey(),
      welcomeApplied: Boolean(p.welcomeApplied),
    };
  } catch {
    return defaultWallet();
  }
}

/** Monthly accrual + welcome — mirrors client `hydrateCredits`. */
export function hydrateServerWallet(state: CreditsStateV1): CreditsStateV1 {
  const next = { ...state };
  const m = monthKey();
  const monthly = PLANS[next.planId].monthlyCredits;
  if (next.accrualMonth !== m) {
    next.balance += monthly;
    next.accrualMonth = m;
  }
  if (!next.welcomeApplied) {
    next.balance += FIRST_VISIT_CREDIT_BONUS;
    next.welcomeApplied = true;
  }
  return next;
}

function ensureWalletFile(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!existsSync(WALLET_FILE)) {
    const w = hydrateServerWallet(defaultWallet());
    writeFileSync(WALLET_FILE, JSON.stringify(w, null, 2), "utf-8");
  }
}

export function readServerWallet(): CreditsStateV1 {
  ensureWalletFile();
  const raw = readFileSync(WALLET_FILE, "utf-8");
  return hydrateServerWallet(parseWallet(raw));
}

export function writeServerWallet(state: CreditsStateV1): void {
  ensureWalletFile();
  writeFileSync(WALLET_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function tryDebitServerWallet(amount: number): { ok: boolean; wallet: CreditsStateV1 } {
  const w = readServerWallet();
  if (w.balance < amount) {
    return { ok: false, wallet: w };
  }
  const next: CreditsStateV1 = { ...w, balance: Math.max(0, w.balance - amount) };
  writeServerWallet(next);
  return { ok: true, wallet: next };
}

export function setServerPlan(planId: PlanId): CreditsStateV1 {
  const w = readServerWallet();
  const next = { ...w, planId };
  writeServerWallet(next);
  return next;
}
