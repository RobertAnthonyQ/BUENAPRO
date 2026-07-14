import { NextResponse } from "next/server";
import { query } from "@/server/db/client";

type PatchField = {
  column: string;
  key?: string;
  cast?: string;
  transform?: (value: unknown) => unknown;
};

export function pagination(params: URLSearchParams) {
  const page = Math.max(Number(params.get("page") ?? "1"), 1);
  const pageSize = Math.min(Math.max(Number(params.get("page_size") ?? "50"), 1), 200);
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function asPositiveInteger(value: string | number | undefined | null, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${field} must be a positive integer`);
  }
  return parsed;
}

export function asSmallInteger(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < -32768 || parsed > 32767) {
    throw new Error(`${field} must be a small integer`);
  }
  return parsed;
}

export function asRequiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

export function asOptionalString(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Expected string value");
  return value.trim();
}

export function asStringArray(value: unknown, field: string) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be an array of strings`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

export function asNullableNumber(value: unknown, field: string) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a number`);
  return parsed;
}

export function asJson(value: unknown, fallback: unknown) {
  return JSON.stringify(value ?? fallback);
}

export function buildPatch(body: Record<string, unknown>, fields: PatchField[], firstParamIndex = 1) {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    const key = field.key ?? field.column;
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    const value = field.transform ? field.transform(body[key]) : body[key];
    values.push(value);
    sets.push(`${field.column} = $${firstParamIndex + values.length - 1}${field.cast ?? ""}`);
  }

  return { sets, values };
}

export async function listCatalog(table: string, params: URLSearchParams, allowedSort = "codigo") {
  const { limit, offset, page, pageSize } = pagination(params);
  const q = params.get("q");
  const values: unknown[] = [];
  const where: string[] = [];
  if (q) {
    values.push(`%${q}%`);
    where.push(`(codigo::text ILIKE $${values.length} OR nombre ILIKE $${values.length})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  values.push(limit, offset);
  const result = await query(
    `
    SELECT *
    FROM ${table}
    ${whereSql}
    ORDER BY ${allowedSort}
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
    `,
    values,
  );
  return { data: result.rows, meta: { page, page_size: pageSize, count: result.rows.length } };
}

export async function tenantCanAccessContract(tenantId: string, idContrato: number) {
  if (!tenantId) return false;
  const result = await query(
    `
    SELECT 1
    FROM seace_contracts
    WHERE id_contrato = $1
    LIMIT 1
    `,
    [idContrato],
  );
  return Boolean(result.rows[0]);
}

export async function requireTenantContractAccess(tenantId: string, idContrato: number) {
  if (!(await tenantCanAccessContract(tenantId, idContrato))) {
    return jsonError("Not found", 404);
  }
  return null;
}

export async function getTenantProfileId(tenantId: string, profileId?: string) {
  const values: unknown[] = [tenantId];
  const where = ["tenant_id = $1"];

  if (profileId) {
    values.push(profileId);
    where.push(`id = $${values.length}`);
  }

  const result = await query<{ id: string }>(
    `
    SELECT id
    FROM company_profiles
    WHERE ${where.join(" AND ")}
    ORDER BY created_at
    LIMIT 1
    `,
    values,
  );
  return result.rows[0]?.id ?? null;
}
