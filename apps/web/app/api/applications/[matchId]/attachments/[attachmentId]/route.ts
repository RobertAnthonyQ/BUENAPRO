import { NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import {
  deleteApplicationAttachment,
  getApplicationAttachment,
} from "@/server/services/applications";

type Params = Promise<{ matchId: string; attachmentId: string }>;

function attachmentHeaders(
  filename: string,
  mimeType: string,
  sizeBytes: number,
) {
  return {
    "Content-Type": mimeType,
    "Content-Length": String(sizeBytes),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(_request: Request, context: { params: Params }) {
  const tenantId = await requireTenantId();
  const { matchId: rawMatchId, attachmentId } = await context.params;
  const matchId = Number(rawMatchId);
  if (!Number.isSafeInteger(matchId)) {
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  }
  const attachment = await getApplicationAttachment(
    tenantId,
    matchId,
    attachmentId,
  );
  if (!attachment)
    return NextResponse.json(
      { error: "Attachment not found" },
      { status: 404 },
    );
  return new Response(new Uint8Array(attachment.content), {
    headers: attachmentHeaders(
      attachment.filename,
      attachment.mime_type,
      attachment.size_bytes,
    ),
  });
}

export async function DELETE(_request: Request, context: { params: Params }) {
  const tenantId = await requireTenantId();
  const { matchId: rawMatchId, attachmentId } = await context.params;
  const matchId = Number(rawMatchId);
  if (!Number.isSafeInteger(matchId)) {
    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  }
  const deleted = await deleteApplicationAttachment(
    tenantId,
    matchId,
    attachmentId,
  );
  return deleted
    ? NextResponse.json({ data: { id: deleted.id } })
    : NextResponse.json({ error: "Attachment not found" }, { status: 404 });
}
