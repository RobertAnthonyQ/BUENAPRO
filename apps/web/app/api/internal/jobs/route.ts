import { NextRequest, NextResponse } from "next/server";
import { query } from "@/server/db/client";

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-internal-token");
  if (!process.env.INTERNAL_JOBS_TOKEN || token !== process.env.INTERNAL_JOBS_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const result = await query(
    `
    INSERT INTO worker_jobs (job_type, queue_name, payload, dedup_key, priority)
    VALUES ($1, $2, $3::jsonb, $4, $5)
    ON CONFLICT DO NOTHING
    RETURNING *
    `,
    [body.job_type, body.queue_name ?? "io", JSON.stringify(body.payload ?? {}), body.dedup_key ?? null, body.priority ?? 5],
  );
  return NextResponse.json({ data: result.rows[0] ?? null }, { status: 202 });
}
