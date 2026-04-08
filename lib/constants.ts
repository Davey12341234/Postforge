export const MARGIN_MULTIPLIER = 1.2;

export const PLAN_LIMITS = {
  FREE: {
    brands: 1,
    credits: 5000,
    seats: 1,
    analyticsRetentionDays: 7,
    connectedAccounts: 2,
    monthlyAiRuns: 10,
    scheduledPosts: 5,
  },
  PRO: {
    brands: 5,
    credits: 50000,
    seats: 5,
    analyticsRetentionDays: 90,
    connectedAccounts: 10,
    monthlyAiRuns: 100,
    scheduledPosts: 50,
  },
  AGENCY: {
    brands: 25,
    credits: 250000,
    seats: 20,
    analyticsRetentionDays: 365,
    connectedAccounts: 50,
    monthlyAiRuns: 1000,
    scheduledPosts: 500,
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;
export type PlanLimitKey = keyof typeof PLAN_LIMITS[PlanId];

export interface CreditValidationParams {
  orgId: string;
  brandId: string;
  model: string;
  runType: string;
  estimatedTokens: number;
}

export interface DraftInput {
  caption: string;
  pillar?: string;
  visualBrief?: string;
  platform?: string;
  suggestedAt?: Date;
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient AI credits.");
    this.name = "InsufficientCreditsError";
  }
}

export class CreditReconciliationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreditReconciliationError";
  }
}

export class PlanLimitExceededError extends Error {
  public readonly limit: string;
  constructor(limit: string) {
    super(`Plan limit exceeded: ${limit}`);
    this.name = "PlanLimitExceededError";
    this.limit = limit;
  }
}

export class ActivationLockedError extends Error {
  constructor() {
    super("Organization activation required.");
    this.name = "ActivationLockedError";
  }
}