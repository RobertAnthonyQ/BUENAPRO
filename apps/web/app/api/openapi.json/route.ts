import { NextResponse } from "next/server";
import { openApiSpec } from "@/server/openapi/spec";

export async function GET() {
  return NextResponse.json(openApiSpec);
}
