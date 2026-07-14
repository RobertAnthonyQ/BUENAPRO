import { NextRequest, NextResponse } from "next/server";
import { listTdrExtractionsRequiringReview } from "@/server/services/admin";
import { adminError, unauthorizedUnlessInternal } from "@/app/api/admin/_utils";

export async function GET(request: NextRequest) {
  const unauthorized = unauthorizedUnlessInternal(request);
  if (unauthorized) return unauthorized;

  try {
    const data = await listTdrExtractionsRequiringReview(request.nextUrl.searchParams);
    return NextResponse.json(data);
  } catch (error) {
    return adminError(error);
  }
}
