import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { asJson, asRequiredString, asSmallInteger, buildPatch, jsonError } from "@/server/services/crud";

export async function GET(_request: NextRequest, context: { params: Promise<{ codigo: string; anio: string }> }) {
  const { codigo, anio } = await context.params;
  const result = await query(
    `
    SELECT codigo, anio, nombre, raw_json, synced_at
    FROM cat_cubso_segmentos
    WHERE codigo = $1 AND anio = $2
    `,
    [codigo, asSmallInteger(anio, "anio")],
  );
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ codigo: string; anio: string }> }) {
  const { codigo, anio } = await context.params;

  try {
    const body = await request.json();
    const patch = buildPatch(
      body,
      [
        { column: "nombre", transform: (value) => asRequiredString(value, "nombre") },
        { column: "raw_json", cast: "::jsonb", transform: (value) => asJson(value, {}) },
      ],
      3,
    );
    if (!patch.sets.length) return jsonError("No patch fields provided");

    const result = await query(
      `
      UPDATE cat_cubso_segmentos
      SET ${patch.sets.join(", ")}, synced_at = now()
      WHERE codigo = $1 AND anio = $2
      RETURNING codigo, anio, nombre, raw_json, synced_at
      `,
      [codigo, asSmallInteger(anio, "anio"), ...patch.values],
    );
    if (!result.rows[0]) return jsonError("Not found", 404);
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ codigo: string; anio: string }> }) {
  const { codigo, anio } = await context.params;
  const result = await query(
    `
    DELETE FROM cat_cubso_segmentos
    WHERE codigo = $1 AND anio = $2
    RETURNING codigo, anio, nombre, raw_json, synced_at
    `,
    [codigo, asSmallInteger(anio, "anio")],
  );
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}
