import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { pagination } from "@/server/services/crud";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const { limit, offset, page, pageSize } = pagination(params);
  const q = params.get("q");
  const values: unknown[] = [];
  const where: string[] = [];
  if (q) {
    values.push(`%${q}%`);
    where.push(`(codigo ILIKE $${values.length} OR ruc ILIKE $${values.length} OR nombre ILIKE $${values.length})`);
  }
  values.push(limit, offset);
  const result = await query(
    `SELECT * FROM cat_entidades ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY nombre LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  );
  return NextResponse.json({ data: result.rows, meta: { page, page_size: pageSize, count: result.rows.length } });
}
