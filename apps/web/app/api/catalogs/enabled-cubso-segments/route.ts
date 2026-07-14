import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";

export async function GET() {
  const result = await query(
    `
    SELECT e.*, s.nombre
    FROM mvp_enabled_cubso_segments e
    JOIN cat_cubso_segmentos s ON s.codigo = e.codigo AND s.anio = e.anio
    ORDER BY e.bucket, e.codigo
    `,
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await query(
    `
    INSERT INTO mvp_enabled_cubso_segments (codigo, anio, bucket, enabled, notes)
    VALUES ($1, $2, $3, COALESCE($4, true), $5)
    ON CONFLICT (codigo, anio, bucket)
    DO UPDATE SET enabled = EXCLUDED.enabled, notes = EXCLUDED.notes, updated_at = now()
    RETURNING *
    `,
    [body.codigo, body.anio, body.bucket, body.enabled ?? true, body.notes ?? null],
  );
  return NextResponse.json({ data: result.rows[0] }, { status: 201 });
}
