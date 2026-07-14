import styles from "./SegmentedControl.module.css";

export function SegmentedControl({ items }: { items: Array<{ label: string; href: string; active?: boolean }> }) {
  return (
    <div className={styles.control}>
      {items.map((item) => <a className={item.active ? styles.active : ""} href={item.href} key={item.href}>{item.label}</a>)}
    </div>
  );
}
