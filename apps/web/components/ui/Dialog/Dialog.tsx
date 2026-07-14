import styles from "./Dialog.module.css";

export function Dialog({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.dialog} role="dialog">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
