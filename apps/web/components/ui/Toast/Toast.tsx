import styles from "./Toast.module.css";

export function Toast({ children }: { children: React.ReactNode }) {
  return <div className={styles.toast} role="status">{children}</div>;
}
