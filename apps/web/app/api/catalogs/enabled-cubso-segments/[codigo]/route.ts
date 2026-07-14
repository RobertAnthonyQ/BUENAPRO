import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";

export async function PATCH(request: NextRequest, context: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await context.params;
  const body = await request.json();
  const result = await query(
    `
    UPDATE mvp_enabled_cubso_segments
    SET enabled = COALESCE($3, enabled), notes = COALESCE($4, notes), updated_at = now()
    WHERE codigo = $1 AND bucket = $2
    RETURNING *
    `,
    [codigo, body.bucket, body.enabled ?? null, body.notes ?? null],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: result.rows[0] });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await context.params;
  const bucket = request.nextUrl.searchParams.get("bucket");
  const result = await query(
    "DELETE FROM mvp_enabled_cubso_segments WHERE codigo = $1 AND bucket = $2 RETURNING *",
    [codigo, bucket],
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: result.rows[0] });
}
