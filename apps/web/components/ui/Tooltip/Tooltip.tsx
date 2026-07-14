import styles from "./Tooltip.module.css";

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return <span className={styles.tooltip} data-label={label}>{children}</span>;
}
