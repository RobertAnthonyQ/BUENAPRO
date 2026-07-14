import { query } from "@/server/db/client";

export const TRACKING_STATES = [
  "inbox",
  "en_evaluacion",
  "interesada",
  "en_preparacion",
  "postulada",
  "ganada",
  "perdida",
  "desierta",
  "en_ejecucion",
  "cobrada",
  "descartada",
] as const;

export type TrackingState = (typeof TRACKING_STATES)[number];

export function isTrackingState(value: unknown): value is TrackingState {
  return typeof value === "string" && TRACKING_STATES.includes(value as TrackingState);
}

export async function getDefaultProfileId(tenantId: string) {
  const result = await query<{ id: string }>(
    `
    SELECT id
    FROM company_profiles
    WHERE tenant_id = $1 AND is_active = true
    ORDER BY created_at
    LIMIT 1
    `,
    [tenantId],
  );
  return result.rows[0]?.id ?? null;
}

export async function ensureMatchForContract(tenantId: string, idContrato: number, profileId?: string) {
  const selectedProfileId = profileId ?? (await getDefaultProfileId(tenantId));
  if (!selectedProfileId) {
    return { error: "Profile required", status: 409 as const };
  }

  const profile = await query(
    "SELECT id FROM company_profiles WHERE tenant_id = $1 AND id = $2 AND is_active = true",
    [tenantId, selectedProfileId],
  );
  if (!profile.rows[0]) return { error: "Profile not found", status: 404 as const };

  const contract = await query("SELECT id_contrato FROM seace_contracts WHERE id_contrato = $1", [idContrato]);
  if (!contract.rows[0]) return { error: "Contract not found", status: 404 as const };

  const result = await query(
    `
    INSERT INTO matches (
      profile_id, id_contrato, score, verdict, breakdown_json, missing_actions_json
    )
    VALUES (
      $1,
      $2,
      0,
      'gris',
      '[]'::jsonb,
      '[{"estado":"requiere_revision","accion":"Match pendiente de procesamiento"}]'::jsonb
    )
    ON CONFLICT (profile_id, id_contrato)
    DO UPDATE SET updated_at = now()
    RETURNING *
    `,
    [selectedProfileId, idContrato],
  );

  await query(
    `
    INSERT INTO worker_jobs (job_type, queue_name, payload, dedup_key, priority)
    VALUES ('match_contract', 'match', $1::jsonb, $2, 3)
    ON CONFLICT DO NOTHING
    `,
    [JSON.stringify({ id_contrato: idContrato }), `match_contract:${idContrato}`],
  );

  return { data: result.rows[0], status: 200 as const };
}

export async function trackContractForTenant(
  tenantId: string,
  idContrato: number,
  body: {
    profile_id?: string;
    user_state?: unknown;
    responsable_id?: string | null;
    monto_ofertado?: number | string | null;
    notas?: string | null;
  },
  actorId?: string | null,
) {
  const ensured = await ensureMatchForContract(tenantId, idContrato, body.profile_id);
  if ("error" in ensured) return ensured;

  const nextState = body.user_state ?? "interesada";
  if (!isTrackingState(nextState)) return { error: "Invalid user_state", status: 400 as const };

  const result = await query(
    `
    UPDATE matches
    SET user_state = $2,
        responsable_id = COALESCE($3, responsable_id),
        monto_ofertado = COALESCE($4, monto_ofertado),
        notas = COALESCE($5, notas),
        updated_at = now()
    WHERE id = $1
    RETURNING *
    `,
    [
      ensured.data.id,
      nextState,
      body.responsable_id ?? null,
      body.monto_ofertado ?? null,
      body.notas ?? null,
    ],
  );

  await query(
    `
    INSERT INTO match_events (match_id, event_type, payload, actor_id)
    VALUES ($1, 'state_change', $2::jsonb, $3)
    `,
    [
      ensured.data.id,
      JSON.stringify({
        user_state: nextState,
        responsable_id: body.responsable_id ?? null,
        monto_ofertado: body.monto_ofertado ?? null,
        notas: body.notas ?? null,
      }),
      actorId ?? null,
    ],
  );

  if (nextState === "en_preparacion" || nextState === "postulada") {
    await ensureDefaultTasks(Number(ensured.data.id));
  }

  return { data: result.rows[0], status: 200 as const };
}

export async function ensureDefaultTasks(matchId: number) {
  const defaults = [
    "Revisar requisitos obligatorios del TDR",
    "Validar documentos administrativos",
    "Confirmar experiencia economica acreditable",
    "Definir monto ofertado",
    "Registrar evidencia de envio de cotizacion",
  ];

  for (const title of defaults) {
    await query(
      `
      INSERT INTO match_tasks (match_id, title, source)
      SELECT $1, $2, 'system'
      WHERE NOT EXISTS (
        SELECT 1 FROM match_tasks WHERE match_id = $1 AND title = $2
      )
      `,
      [matchId, title],
    );
  }
}

export async function matchBelongsToTenant(tenantId: string, matchId: number) {
  const result = await query(
    `
    SELECT 1
    FROM matches m
    JOIN company_profiles cp ON cp.id = m.profile_id
    WHERE cp.tenant_id = $1 AND m.id = $2
    LIMIT 1
    `,
    [tenantId, matchId],
  );
  return Boolean(result.rows[0]);
}
