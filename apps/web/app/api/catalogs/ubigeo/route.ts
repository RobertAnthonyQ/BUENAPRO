import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { pagination } from "@/server/services/crud";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const { limit, offset, page, pageSize } = pagination(params);
  const values: unknown[] = [];
  const where: string[] = [];
  for (const key of ["departamento", "provincia", "distrito"]) {
    const value = params.get(key);
    if (value) {
      values.push(value);
      where.push(`${key} ILIKE $${values.length}`);
    }
  }
  values.push(limit, offset);
  const result = await query(
    `SELECT * FROM cat_ubigeo ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY departamento, provincia, distrito LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return NextResponse.json({ data: result.rows, meta: { page, page_size: pageSize, count: result.rows.length } });
}
