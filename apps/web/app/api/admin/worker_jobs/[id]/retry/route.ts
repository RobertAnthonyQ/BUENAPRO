import { NextResponse } from "next/server";
import { parsePositiveInteger, retryWorkerJob } from "@/server/services/admin";
import { adminError, badRequest, notFound, unauthorizedUnlessInternal } from "@/app/api/admin/_utils";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = unauthorizedUnlessInternal(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const jobId = parsePositiveInteger(id, 0);
  if (!jobId) return badRequest("Invalid worker job id");

  try {
    const data = await retryWorkerJob(jobId);
    if (!data) return notFound("Retryable worker job not found");
    return NextResponse.json({ data });
  } catch (error) {
    return adminError(error);
  }
}
