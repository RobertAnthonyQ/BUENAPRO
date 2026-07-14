import { NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { createApplicationAttachment } from "@/server/services/applications";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function safeFilename(value: string) {
  return value
    .replace(/[\\/\0\r\n]/g, "_")
    .trim()
    .slice(0, 255);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const tenantId = await requireTenantId();
  const matchId = Number((await context.params).matchId);
  if (!Number.isSafeInteger(matchId)) {
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Se requiere un archivo en el campo file" },
      { status: 400 },
    );
  }
  const filename = safeFilename(file.name);
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXTENSION[extension];
  if (!filename || !mimeType) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa PDF, DOC, DOCX, XLS o XLSX" },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo debe pesar como máximo 10 MB" },
      { status: 413 },
    );
  }
  if (
    file.type &&
    file.type !== "application/octet-stream" &&
    file.type !== mimeType
  ) {
    return NextResponse.json(
      { error: "El contenido del archivo no coincide con su extensión" },
      { status: 415 },
    );
  }

  const data = await createApplicationAttachment(tenantId, matchId, {
    filename,
    mimeType,
    sizeBytes: file.size,
    content: Buffer.from(await file.arrayBuffer()),
  });
  return data
    ? NextResponse.json({ data }, { status: 201 })
    : NextResponse.json({ error: "Application not found" }, { status: 404 });
}
