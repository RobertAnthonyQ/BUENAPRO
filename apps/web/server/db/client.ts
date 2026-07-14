import pg from "pg";
import { ensureServerEnv } from "@/server/env";

const { Pool } = pg;
type QueryResultRow = pg.QueryResultRow;

ensureServerEnv();

declare global {
  // eslint-disable-next-line no-var
  var buenaproPool: pg.Pool | undefined;
}

export const pool =
  globalThis.buenaproPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.buenaproPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
) {
  return pool.query<T>(text, values);
}
