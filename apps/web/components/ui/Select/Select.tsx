import styles from "./Select.module.css";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={styles.select} {...props} />;
}
