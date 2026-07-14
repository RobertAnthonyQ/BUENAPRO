import { NextRequest, NextResponse } from "next/server";
import { listCatalog } from "@/server/services/crud";

export async function GET(request: NextRequest) {
  return NextResponse.json(await listCatalog("cat_seace_objects", request.nextUrl.searchParams));
}
