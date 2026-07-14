import { AppShell } from "@/features/shell/components/AppShell";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";
import { query } from "@/server/db/client";
import { AddMemberForm, MemberRoleSelect } from "./components/MemberControls";
import { NotificationPrefsForm } from "./components/NotificationPrefsForm";
import { WorkspaceForm } from "./components/WorkspaceForm";
import styles from "./SettingsPage.module.css";

export async function SettingsPage({ tenantId }: { tenantId: string }) {
  const tenant = await query("SELECT * FROM tenants WHERE id = $1", [tenantId]);
  const members = await query(
    `
    SELECT u.id, u.email, u.name, tm.role, tm.created_at
    FROM tenant_members tm
    JOIN users u ON u.id = tm.user_id
    WHERE tm.tenant_id = $1
    ORDER BY tm.created_at
    `,
    [tenantId],
  );
  const prefs = await query(
    `
    SELECT p.*
    FROM notification_preferences p
    WHERE p.tenant_id = $1
    ORDER BY p.channel
    `,
    [tenantId],
  );
  const tenantRow = tenant.rows[0];

  return (
    <AppShell title="Configuracion">
      <header className={styles.header}>
        <p>Workspace</p>
        <h1>Configuracion</h1>
        <span>{tenantRow?.name ?? "BuenaPro"} · plan {tenantRow?.plan ?? "starter"}</span>
      </header>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Workspace</h2>
          <Badge>{tenantRow?.plan ?? "starter"}</Badge>
        </div>
        <WorkspaceForm name={tenantRow?.name ?? "BuenaPro"} plan={tenantRow?.plan ?? "starter"} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Miembros</h2>
          <Badge tone="sage">{members.rowCount} usuarios</Badge>
        </div>
        <AddMemberForm />
        <Table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
          <tbody>
            {members.rows.map((member: any) => (
              <tr key={member.email}>
                <td>{member.name}</td>
                <td>{member.email}</td>
                <td><MemberRoleSelect userId={member.id} role={member.role} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Notificaciones</h2>
          <Badge>{prefs.rowCount} reglas</Badge>
        </div>
        <NotificationPrefsForm />
      </section>
    </AppShell>
  );
}
