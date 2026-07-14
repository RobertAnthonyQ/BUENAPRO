import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { asRequiredString, asSmallInteger, jsonError, pagination } from "@/server/services/crud";

const seaceCatalogs = {
  objects: "cat_seace_objects",
  states: "cat_seace_states",
} as const;

function tableFor(kind: string) {
  return seaceCatalogs[kind as keyof typeof seaceCatalogs] ?? null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  const table = tableFor(kind);
  if (!table) return jsonError("Unknown SEACE catalog", 404);

  const { searchParams } = new URL(request.url);
  const { limit, offset } = pagination(searchParams);
  const q = searchParams.get("q");
  const values: unknown[] = [];
  const where: string[] = [];

  if (q) {
    values.push(`%${q}%`);
    where.push(`nombre ILIKE $${values.length}`);
  }

  values.push(limit, offset);
  const result = await query(
    `
    SELECT codigo, nombre
    FROM ${table}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY codigo
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
    `,
    values,
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  const table = tableFor(kind);
  if (!table) return jsonError("Unknown SEACE catalog", 404);

  try {
    const body = await request.json();
    const codigo = asSmallInteger(body.codigo, "codigo");
    const nombre = asRequiredString(body.nombre, "nombre");
    const result = await query(
      `
      INSERT INTO ${table} (codigo, nombre)
      VALUES ($1, $2)
      RETURNING codigo, nombre
      `,
      [codigo, nombre],
    );
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}
