import { NotificationBell } from "../NotificationBell";
import { UserMenu } from "../UserMenu";
import styles from "./TopBar.module.css";

export function TopBar({ title = "Contratos menores" }: { title?: string }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.contextText}>
        <strong>{title}</strong>
        <span>Contratos menores</span>
      </div>
      <div className={styles.actions}>
        <span className={styles.context}>SEACE</span>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
