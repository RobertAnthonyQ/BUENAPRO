import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { asJson, asRequiredString, asSmallInteger, jsonError, pagination } from "@/server/services/crud";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { limit, offset } = pagination(searchParams);
  const values: unknown[] = [];
  const where: string[] = [];

  const anio = searchParams.get("anio");
  if (anio) {
    values.push(asSmallInteger(anio, "anio"));
    where.push(`s.anio = $${values.length}`);
  }

  const q = searchParams.get("q");
  if (q) {
    values.push(`%${q}%`);
    where.push(`(s.codigo ILIKE $${values.length} OR s.nombre ILIKE $${values.length})`);
  }

  if (searchParams.get("enabled") === "true") {
    where.push("EXISTS (SELECT 1 FROM mvp_enabled_cubso_segments e WHERE e.codigo = s.codigo AND e.anio = s.anio AND e.enabled = true)");
  }

  values.push(limit, offset);
  const result = await query(
    `
    SELECT s.codigo, s.anio, s.nombre, s.raw_json, s.synced_at
    FROM cat_cubso_segmentos s
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY s.anio DESC, s.codigo
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
    `,
    values,
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const codigo = asRequiredString(body.codigo, "codigo");
    const anio = asSmallInteger(body.anio, "anio");
    const nombre = asRequiredString(body.nombre, "nombre");
    const rawJson = asJson(body.raw_json, {});
    const result = await query(
      `
      INSERT INTO cat_cubso_segmentos (codigo, anio, nombre, raw_json, synced_at)
      VALUES ($1, $2, $3, $4::jsonb, now())
      RETURNING codigo, anio, nombre, raw_json, synced_at
      `,
      [codigo, anio, nombre, rawJson],
    );
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}
