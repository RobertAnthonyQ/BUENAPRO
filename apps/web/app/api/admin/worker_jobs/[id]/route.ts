import { NextResponse } from "next/server";
import { getWorkerJob, parsePositiveInteger } from "@/server/services/admin";
import { adminError, badRequest, notFound, unauthorizedUnlessInternal } from "@/app/api/admin/_utils";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = unauthorizedUnlessInternal(request);
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  const jobId = parsePositiveInteger(id, 0);
  if (!jobId) return badRequest("Invalid worker job id");

  try {
    const data = await getWorkerJob(jobId);
    if (!data) return notFound();
    return NextResponse.json(data);
  } catch (error) {
    return adminError(error);
  }
}
