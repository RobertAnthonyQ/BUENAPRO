import { IconRail } from "../IconRail";
import { TopBar } from "../TopBar";
import styles from "./AppShell.module.css";

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className={styles.shell}>
      <IconRail />
      <div className={styles.workspace}>
        <TopBar title={title} />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
