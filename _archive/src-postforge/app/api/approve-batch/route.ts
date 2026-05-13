import { NextResponse } from "next/server";
import { approveBatchForScheduling } from "@/services/content-batch";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const batchId = typeof body?.batchId === "string" ? body.batchId : "";
    if (!batchId) {
      return NextResponse.json({ error: "batchId is required" }, { status: 400 });
    }
    const { scheduledCount } = await approveBatchForScheduling(batchId);
    return NextResponse.json({ success: true, scheduledCount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Approval failed" }, { status: 500 });
  }
}
