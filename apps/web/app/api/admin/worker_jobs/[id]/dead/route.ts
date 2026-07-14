import { NextResponse } from "next/server";
import { markWorkerJobDead, parsePositiveInteger } from "@/server/services/admin";
import { adminError, badRequest, notFound, unauthorizedUnlessInternal } from "@/app/api/admin/_utils";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = unauthorizedUnlessInternal(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const jobId = parsePositiveInteger(id, 0);
  if (!jobId) return badRequest("Invalid worker job id");

  try {
    const body = await request.json().catch(() => ({}));
    const reason = typeof body.reason === "string" ? body.reason : undefined;
    const data = await markWorkerJobDead(jobId, reason);
    if (!data) return notFound("Markable worker job not found");
    return NextResponse.json({ data });
  } catch (error) {
    return adminError(error);
  }
}
