import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { pagination } from "@/server/services/crud";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const { limit, offset, page, pageSize } = pagination(params);
  const values: unknown[] = [];
  const where: string[] = [];
  if (params.get("anio")) {
    values.push(Number(params.get("anio")));
    where.push(`anio = $${values.length}`);
  }
  if (params.get("q")) {
    values.push(`%${params.get("q")}%`);
    where.push(`(codigo ILIKE $${values.length} OR nombre ILIKE $${values.length})`);
  }
  values.push(limit, offset);
  const result = await query(
    `
    SELECT *
    FROM cat_cubso_segmentos
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY anio DESC, codigo
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
    `,
    values,
  );
  return NextResponse.json({ data: result.rows, meta: { page, page_size: pageSize, count: result.rows.length } });
}
