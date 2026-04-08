import { prisma } from "@/lib/prisma";
import { MARGIN_MULTIPLIER, InsufficientCreditsError, CreditReconciliationError, type CreditValidationParams } from "@/lib/constants";
export async function withCreditValidation<T>(params: CreditValidationParams, fn: (runId: string) => Promise<{ inputTokens: number; outputTokens: number; result: T }>): Promise<T> {
  const runId = await reserveCredits(params);
  try { const { inputTokens, outputTokens, result } = await fn(runId); await reconcileCredits(runId, inputTokens, outputTokens); return result; }
  catch (error) { await failAndRefundRun(runId, error instanceof Error ? error.message : "Unknown error"); throw error; }
}
async function reserveCredits({ orgId, brandId, model, runType, estimatedTokens }: CreditValidationParams): Promise<string> {
  const charge = Math.ceil(estimatedTokens * MARGIN_MULTIPLIER);
  return await prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUniqueOrThrow({ where: { id: orgId }, select: { aiCredits: true } });
    if (org.aiCredits < charge) throw new InsufficientCreditsError();
    const run = await tx.aiRun.create({ data: { organizationId: orgId, brandId, model, runType, estimatedTokens, reservedCredits: charge, status: "PROCESSING" } });
    await tx.organization.update({ where: { id: orgId }, data: { aiCredits: { decrement: charge } } });
    await tx.aiUsageLedger.create({ data: { organizationId: orgId, amount: -charge, type: "RESERVATION", description: `Run ${run.id}` } });
    return run.id;
  });
}
async function reconcileCredits(runId: string, input: number, output: number): Promise<void> {
  const total = input + output; const charge = Math.ceil(total * MARGIN_MULTIPLIER);
  await prisma.$transaction(async (tx) => {
    const run = await tx.aiRun.findUniqueOrThrow({ where: { id: runId } }); const diff = run.reservedCredits - charge;
    if (diff > 0) { await tx.organization.update({ where: { id: run.organizationId }, data: { aiCredits: { increment: diff } } }); await tx.aiUsageLedger.create({ data: { organizationId: run.organizationId, amount: diff, type: "REFUND" } }); }
    else if (diff < 0) { const extra = Math.abs(diff); const org = await tx.organization.findUniqueOrThrow({ where: { id: run.organizationId }, select: { aiCredits: true } }); if (org.aiCredits < extra) throw new CreditReconciliationError("Overage"); await tx.organization.update({ where: { id: run.organizationId }, data: { aiCredits: { decrement: extra } } }); await tx.aiUsageLedger.create({ data: { organizationId: run.organizationId, amount: -extra, type: "ADJUSTMENT" } }); }
    await tx.aiRun.update({ where: { id: runId }, data: { actualInputTokens: input, actualOutputTokens: output, actualTotalTokens: total, chargedCredits: charge, status: "COMPLETED", completedAt: new Date() } });
  });
}
async function failAndRefundRun(runId: string, error: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const run = await tx.aiRun.findUniqueOrThrow({ where: { id: runId } });
    await tx.organization.update({ where: { id: run.organizationId }, data: { aiCredits: { increment: run.reservedCredits } } });
    await tx.aiUsageLedger.create({ data: { organizationId: run.organizationId, amount: run.reservedCredits, type: "REFUND" } });
    await tx.aiRun.update({ where: { id: runId }, data: { status: "FAILED", failedAt: new Date(), errorMessage: error } });
  });
}
