import { NextRequest, NextResponse } from "next/server";
import { adminError, badRequest, unauthorizedUnlessInternal } from "@/app/api/admin/_utils";
import { startMvpBatch } from "@/server/services/admin";

export async function POST(request: NextRequest) {
  const unauthorized = unauthorizedUnlessInternal(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => ({}));
    const year = Number(body.year ?? 2026);
    const perBucket = Number(body.per_bucket ?? 150);
    if (!Number.isInteger(year) || year < 2024) return badRequest("year invalido");
    if (!Number.isInteger(perBucket) || perBucket < 1 || perBucket > 500) {
      return badRequest("per_bucket debe estar entre 1 y 500");
    }
    const data = await startMvpBatch({ year, perBucket });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return adminError(error);
  }
}
