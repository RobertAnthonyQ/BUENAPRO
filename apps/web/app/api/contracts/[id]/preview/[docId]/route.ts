import { NextResponse } from "next/server";
import { requireTenantId } from "@/server/auth/tenant";
import { tenantCanAccessContract } from "@/server/services/crud";
import { getDocumentSource } from "@/server/services/contracts";

export async function GET(request: Request, context: { params: Promise<{ id: string; docId: string }> }) {
  const tenantId = await requireTenantId();
  const { id, docId } = await context.params;
  const idContrato = Number(id);
  const documentId = Number(docId);

  if (!(await tenantCanAccessContract(tenantId, idContrato))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await getDocumentSource(idContrato, documentId);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isPdf = document.mime === "application/pdf" || document.filename.toLowerCase().endsWith(".pdf");
  if (!isPdf) return NextResponse.json({ error: "Preview is only available for PDF documents" }, { status: 415 });

  const range = request.headers.get("range");
  const response = await fetch(document.seace_download_url, {
    headers: {
      Accept: "application/pdf,*/*",
      ...(range ? { Range: range } : {}),
      "User-Agent": "BuenaPro/1.0 PDF Preview",
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Could not fetch document" }, { status: 502 });
  }

  const headers = new Headers({
    "Accept-Ranges": response.headers.get("accept-ranges") ?? "bytes",
    "Cache-Control": "private, max-age=300",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
    "Content-Type": "application/pdf",
  });
  for (const name of ["content-length", "content-range"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      ...Object.fromEntries(headers.entries()),
    },
  });
}
