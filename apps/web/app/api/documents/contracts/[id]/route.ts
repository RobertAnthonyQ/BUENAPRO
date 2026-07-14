import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import {
  asJson,
  asOptionalString,
  asPositiveInteger,
  asRequiredString,
  asSmallInteger,
  jsonError,
  requireTenantContractAccess,
} from "@/server/services/crud";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  const result = await query(
    `
    SELECT *
    FROM contract_documents
    WHERE id_contrato = $1
    ORDER BY id
    `,
    [idContrato],
  );
  return NextResponse.json({ data: result.rows });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const tenantId = await requireTenantId();
  const { id } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  try {
    const body = await request.json();
    const result = await query(
      `
      INSERT INTO contract_documents (
        id_contrato, id_contrato_archivo, categoria, filename, mime, doc_class,
        has_text_layer, size_original_bytes, size_preview_bytes, sha256_original,
        sha256_preview, r2_preview_key, seace_download_url, raw_file_json
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb)
      RETURNING *
      `,
      [
        idContrato,
        asPositiveInteger(body.id_contrato_archivo, "id_contrato_archivo"),
        asSmallInteger(body.categoria, "categoria"),
        asRequiredString(body.filename, "filename"),
        asOptionalString(body.mime),
        asOptionalString(body.doc_class),
        body.has_text_layer ?? null,
        body.size_original_bytes ?? null,
        body.size_preview_bytes ?? null,
        asRequiredString(body.sha256_original, "sha256_original"),
        asOptionalString(body.sha256_preview),
        asOptionalString(body.r2_preview_key),
        asRequiredString(body.seace_download_url, "seace_download_url"),
        asJson(body.raw_file_json, {}),
      ],
    );
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}
