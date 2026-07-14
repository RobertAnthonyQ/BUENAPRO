import { query } from "@/server/db/client";
import { decryptSecret, encryptSecret } from "@/server/security/secrets";

const BASE = process.env.SEACE_BASE_URL ?? "https://prod6.seace.gob.pe/v1/s8uit-services";
const TIMEOUT_MS = 12_000;

type Session = { accessToken: string; refreshToken: string };
type Connection = {
  id: string;
  tenant_id: string;
  username_secret: string;
  password_secret: string;
  session_secret: string | null;
  status: string;
};

function context(tenantId: string, field: string) {
  return `${tenantId}:seace:${field}:v1`;
}

async function seaceFetch(path: string, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Accept-Language": "es-PE,es;q=0.9",
        "Content-Type": "application/json",
        Origin: "https://prod6.seace.gob.pe",
        Referer: "https://prod6.seace.gob.pe/",
        "User-Agent": "BuenaPro/1.0 SEACE bridge",
        ...init.headers,
      },
      redirect: "error",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonResponse(response: Response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error("SEACE request failed") as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = body?.backendMessage ?? body?.message ?? `HTTP_${response.status}`;
    throw error;
  }
  return body;
}

function tokenExpiry(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null;
  } catch {
    return null;
  }
}

async function login(username: string, password: string): Promise<Session> {
  const payload = await jsonResponse(
    await seaceFetch("/seguridadproveedor/seguridad/validausuariornp", {
      body: JSON.stringify({ username, password }),
      headers: { "client-s8uit": JSON.stringify({ terminal: "0.0.0.0" }) },
      method: "POST",
    }),
  );
  if (!payload?.respuesta || !payload?.token || !payload?.refreshToken) throw new Error("SEACE_INVALID_CREDENTIALS");
  return { accessToken: payload.token, refreshToken: payload.refreshToken };
}

async function refreshSession(username: string, session: Session): Promise<Session> {
  const payload = await jsonResponse(
    await seaceFetch("/seguridadproveedor/seguridad/tokens/refresh", {
      body: JSON.stringify({ refreshToken: session.refreshToken, username }),
      method: "POST",
    }),
  );
  if (!payload?.token) throw new Error("SEACE_REFRESH_FAILED");
  return { accessToken: payload.token, refreshToken: payload.refreshToken ?? session.refreshToken };
}

async function checkTwoFactor(accessToken: string) {
  const payload = await jsonResponse(
    await seaceFetch("/seguridadproveedor/seguridad/twofactor/config/check/2005/ROL_GENERAL_2FA", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  return Boolean(payload?.respuesta && (payload?.data?.tipoPrimario === 1 || payload?.data?.tipoSecundario === 1));
}

export async function connectSeace(tenantId: string, userId: string, username: string, password: string) {
  const session = await login(username, password);
  const requires2fa = await checkTwoFactor(session.accessToken).catch(() => false);
  const expiry = tokenExpiry(session.accessToken);
  const result = await query<{ id: string }>(
    `
    INSERT INTO seace_connections (
      tenant_id, created_by_user_id, username_secret, password_secret, session_secret,
      status, session_expires_at, last_authenticated_at, last_error_code
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,now(),NULL)
    ON CONFLICT (tenant_id) DO UPDATE SET
      created_by_user_id=EXCLUDED.created_by_user_id,
      username_secret=EXCLUDED.username_secret,
      password_secret=EXCLUDED.password_secret,
      session_secret=EXCLUDED.session_secret,
      status=EXCLUDED.status,
      session_expires_at=EXCLUDED.session_expires_at,
      last_authenticated_at=now(), last_error_code=NULL, updated_at=now()
    RETURNING id
    `,
    [
      tenantId,
      userId,
      encryptSecret(username, context(tenantId, "username")),
      encryptSecret(password, context(tenantId, "password")),
      encryptSecret(JSON.stringify(session), context(tenantId, "session")),
      requires2fa ? "requires_2fa" : "connected",
      expiry,
    ],
  );
  await query(
    `INSERT INTO seace_connection_events (connection_id, actor_user_id, event_type, success) VALUES ($1,$2,'connected',$3)`,
    [result.rows[0].id, userId, !requires2fa],
  );
  return { connected: !requires2fa, requires2fa };
}

export async function disconnectSeace(tenantId: string, userId: string) {
  const existing = await query<{ id: string }>("SELECT id FROM seace_connections WHERE tenant_id=$1", [tenantId]);
  if (existing.rows[0]) {
    await query(
      `INSERT INTO seace_connection_events (connection_id, actor_user_id, event_type, success) VALUES ($1,$2,'disconnected',true)`,
      [existing.rows[0].id, userId],
    );
  }
  await query("DELETE FROM seace_connections WHERE tenant_id=$1", [tenantId]);
}

export async function seaceConnectionStatus(tenantId: string) {
  const result = await query<Connection & { last_authenticated_at: string | null; last_used_at: string | null }>(
    `SELECT * FROM seace_connections WHERE tenant_id=$1`,
    [tenantId],
  );
  const row = result.rows[0];
  if (!row) return { connected: false, status: "disconnected" };
  const username = decryptSecret(row.username_secret, context(tenantId, "username"));
  return {
    connected: row.status === "connected",
    status: row.status,
    usernameMasked: username.length > 4 ? `${username.slice(0, 2)}••••${username.slice(-2)}` : "••••",
    lastAuthenticatedAt: row.last_authenticated_at,
    lastUsedAt: row.last_used_at,
  };
}

async function activeSession(tenantId: string) {
  const result = await query<Connection>("SELECT * FROM seace_connections WHERE tenant_id=$1", [tenantId]);
  const row = result.rows[0];
  if (!row) throw new Error("SEACE_NOT_CONNECTED");
  if (row.status === "requires_2fa") throw new Error("SEACE_REQUIRES_2FA");
  let session: Session | null = null;
  if (row.session_secret) {
    try {
      session = JSON.parse(decryptSecret(row.session_secret, context(tenantId, "session")));
    } catch {
      session = null;
    }
  }
  const expiry = session ? tokenExpiry(session.accessToken) : null;
  if (!session || !expiry || expiry.getTime() < Date.now() + 60_000) {
    const username = decryptSecret(row.username_secret, context(tenantId, "username"));
    const password = decryptSecret(row.password_secret, context(tenantId, "password"));
    try {
      session = session
        ? await refreshSession(username, session).catch(() => login(username, password))
        : await login(username, password);
      const nextExpiry = tokenExpiry(session.accessToken);
      await query(
        `UPDATE seace_connections SET session_secret=$2,status='connected',session_expires_at=$3,last_authenticated_at=now(),last_error_code=NULL,updated_at=now() WHERE tenant_id=$1`,
        [tenantId, encryptSecret(JSON.stringify(session), context(tenantId, "session")), nextExpiry],
      );
    } catch (error) {
      await query(
        `UPDATE seace_connections SET status='invalid',session_secret=NULL,last_error_code='AUTH_FAILED',updated_at=now() WHERE tenant_id=$1`,
        [tenantId],
      );
      throw error;
    }
  }
  if (!session) throw new Error("SEACE_SESSION_UNAVAILABLE");
  return session;
}

export async function authenticatedSeaceJson(tenantId: string, path: string) {
  if (!path.startsWith("/")) throw new Error("Invalid SEACE path");
  const session = await activeSession(tenantId);
  const response = await seaceFetch(path, { headers: { Authorization: `Bearer ${session.accessToken}` } });
  if (response.status === 401 || response.status === 403) {
    await query(`UPDATE seace_connections SET session_secret=NULL,status='expired',updated_at=now() WHERE tenant_id=$1`, [tenantId]);
    const renewed = await activeSession(tenantId);
    const retry = await seaceFetch(path, { headers: { Authorization: `Bearer ${renewed.accessToken}` } });
    const data = await jsonResponse(retry);
    await query("UPDATE seace_connections SET last_used_at=now() WHERE tenant_id=$1", [tenantId]);
    return data;
  }
  const data = await jsonResponse(response);
  await query("UPDATE seace_connections SET last_used_at=now() WHERE tenant_id=$1", [tenantId]);
  return data;
}
