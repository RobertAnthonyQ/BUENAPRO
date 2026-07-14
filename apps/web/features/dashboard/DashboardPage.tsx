import Link from "next/link";
import { AppShell } from "@/features/shell/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { formatDeadline } from "@/lib/format/date";
import { query } from "@/server/db/client";
import { listContractsForTenant } from "@/server/services/contracts";
import styles from "./DashboardPage.module.css";

export async function DashboardPage({ tenantId }: { tenantId: string }) {
  const profile = await query("SELECT * FROM company_profiles WHERE tenant_id = $1 ORDER BY created_at LIMIT 1", [tenantId]);
  const tracking = await query(
    `
    SELECT m.user_state, count(*)::int AS total
    FROM matches m
    JOIN company_profiles cp ON cp.id = m.profile_id
    WHERE cp.tenant_id = $1
    GROUP BY m.user_state
    `,
    [tenantId],
  );
  const params = new URLSearchParams({ page_size: "5", has_extraction: "true" });
  const contracts = await listContractsForTenant(tenantId, params);

  return (
    <AppShell title="Inicio">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Panel diario</p>
          <h1>Decide que revisar primero</h1>
        </div>
        <Link href="/feed">
          <Button>Ver oportunidades</Button>
        </Link>
      </header>

      {!profile.rows[0] ? (
        <EmptyState title="Completa tu perfil para activar el semaforo" action={{ label: "Ir a perfil", href: "/perfil" }}>
          Mientras tanto puedes explorar los contratos cargados, pero BuenaPro necesita tu capacidad real para decirte que puedes ganar.
        </EmptyState>
      ) : null}

      <section className={styles.metrics}>
        <div>
          <span>Contratos analizados</span>
          <strong>{contracts.meta.total}</strong>
        </div>
        <div>
          <span>En preparacion</span>
          <strong>{tracking.rows.find((row) => row.user_state === "en_preparacion")?.total ?? 0}</strong>
        </div>
        <div>
          <span>Postuladas</span>
          <strong>{tracking.rows.find((row) => row.user_state === "postulada")?.total ?? 0}</strong>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Recientes con analisis</h2>
          <Badge tone="sage">SEACE</Badge>
        </div>
        <Table>
          <thead>
            <tr>
              <th>Codigo</th>
              <th>Objeto</th>
              <th>Entidad</th>
              <th>Cierre</th>
            </tr>
          </thead>
          <tbody>
            {contracts.data.map((row: any) => (
              <tr key={row.id_contrato}>
                <td><Link className={styles.link} href={`/oportunidad/${row.id_contrato}`}>{row.codigo}</Link></td>
                <td>{row.descripcion}</td>
                <td>{row.entidad_nombre}</td>
                <td>{formatDeadline(row.fec_fin_cotizacion)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>
    </AppShell>
  );
}
