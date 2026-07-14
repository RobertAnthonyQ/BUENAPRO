import styles from "./Checkbox.module.css";

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.label}>
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}
