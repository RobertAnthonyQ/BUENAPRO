import styles from "./Switch.module.css";

export function Switch({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.label}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
