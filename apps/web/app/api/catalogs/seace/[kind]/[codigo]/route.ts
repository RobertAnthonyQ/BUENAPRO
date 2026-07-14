import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { asRequiredString, asSmallInteger, jsonError } from "@/server/services/crud";

const seaceCatalogs = {
  objects: "cat_seace_objects",
  states: "cat_seace_states",
} as const;

function tableFor(kind: string) {
  return seaceCatalogs[kind as keyof typeof seaceCatalogs] ?? null;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ kind: string; codigo: string }> }) {
  const { kind, codigo } = await context.params;
  const table = tableFor(kind);
  if (!table) return jsonError("Unknown SEACE catalog", 404);

  const result = await query(`SELECT codigo, nombre FROM ${table} WHERE codigo = $1`, [Number(codigo)]);
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ kind: string; codigo: string }> }) {
  const { kind, codigo } = await context.params;
  const table = tableFor(kind);
  if (!table) return jsonError("Unknown SEACE catalog", 404);

  try {
    const body = await request.json();
    const nombre = asRequiredString(body.nombre, "nombre");
    const result = await query(
      `UPDATE ${table} SET nombre = $2 WHERE codigo = $1 RETURNING codigo, nombre`,
      [asSmallInteger(codigo, "codigo"), nombre],
    );
    if (!result.rows[0]) return jsonError("Not found", 404);
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ kind: string; codigo: string }> }) {
  const { kind, codigo } = await context.params;
  const table = tableFor(kind);
  if (!table) return jsonError("Unknown SEACE catalog", 404);

  const result = await query(`DELETE FROM ${table} WHERE codigo = $1 RETURNING codigo, nombre`, [Number(codigo)]);
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}
