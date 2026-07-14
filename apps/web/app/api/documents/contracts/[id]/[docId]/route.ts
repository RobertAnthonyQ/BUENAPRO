import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";
import { requireTenantId } from "@/server/auth/tenant";
import {
  asJson,
  asOptionalString,
  asPositiveInteger,
  asRequiredString,
  asSmallInteger,
  buildPatch,
  jsonError,
  requireTenantContractAccess,
} from "@/server/services/crud";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string; docId: string }> }) {
  const tenantId = await requireTenantId();
  const { id, docId } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  const result = await query("SELECT * FROM contract_documents WHERE id_contrato = $1 AND id = $2", [
    idContrato,
    asPositiveInteger(docId, "docId"),
  ]);
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string; docId: string }> }) {
  const tenantId = await requireTenantId();
  const { id, docId } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  try {
    const body = await request.json();
    const patch = buildPatch(
      body,
      [
        { column: "id_contrato_archivo", transform: (value) => asPositiveInteger(value as string, "id_contrato_archivo") },
        { column: "categoria", transform: (value) => asSmallInteger(value, "categoria") },
        { column: "filename", transform: (value) => asRequiredString(value, "filename") },
        { column: "mime", transform: asOptionalString },
        { column: "doc_class", transform: asOptionalString },
        { column: "has_text_layer" },
        { column: "size_original_bytes" },
        { column: "size_preview_bytes" },
        { column: "sha256_original", transform: (value) => asRequiredString(value, "sha256_original") },
        { column: "sha256_preview", transform: asOptionalString },
        { column: "r2_preview_key", transform: asOptionalString },
        { column: "seace_download_url", transform: (value) => asRequiredString(value, "seace_download_url") },
        { column: "raw_file_json", cast: "::jsonb", transform: (value) => asJson(value, {}) },
      ],
      3,
    );
    if (!patch.sets.length) return jsonError("No patch fields provided");

    const result = await query(
      `
      UPDATE contract_documents
      SET ${patch.sets.join(", ")}, updated_at = now()
      WHERE id_contrato = $1 AND id = $2
      RETURNING *
      `,
      [idContrato, asPositiveInteger(docId, "docId"), ...patch.values],
    );
    if (!result.rows[0]) return jsonError("Not found", 404);
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Invalid request");
  }
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string; docId: string }> }) {
  const tenantId = await requireTenantId();
  const { id, docId } = await context.params;
  const idContrato = asPositiveInteger(id, "id");
  const denied = await requireTenantContractAccess(tenantId, idContrato);
  if (denied) return denied;

  const result = await query("DELETE FROM contract_documents WHERE id_contrato = $1 AND id = $2 RETURNING *", [
    idContrato,
    asPositiveInteger(docId, "docId"),
  ]);
  if (!result.rows[0]) return jsonError("Not found", 404);
  return NextResponse.json({ data: result.rows[0] });
}
