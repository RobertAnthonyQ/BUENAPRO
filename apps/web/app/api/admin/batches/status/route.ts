import { NextRequest, NextResponse } from "next/server";
import { adminError, unauthorizedUnlessInternal } from "@/app/api/admin/_utils";
import { getBatchStatus } from "@/server/services/admin";

export async function GET(request: NextRequest) {
  const unauthorized = unauthorizedUnlessInternal(request);
  if (unauthorized) return unauthorized;

  try {
    const batchId = request.nextUrl.searchParams.get("batch_id") ?? undefined;
    const data = await getBatchStatus(batchId);
    return NextResponse.json(data);
  } catch (error) {
    return adminError(error);
  }
}
