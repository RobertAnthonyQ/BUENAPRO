import styles from "./Drawer.module.css";

export function Drawer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <aside className={styles.drawer}>
      <h2>{title}</h2>
      {children}
    </aside>
  );
}
