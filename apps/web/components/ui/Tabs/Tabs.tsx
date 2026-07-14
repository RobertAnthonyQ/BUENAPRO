import styles from "./Tabs.module.css";

export function Tabs({ items }: { items: Array<{ key: string; label: string; href: string; active?: boolean }> }) {
  return (
    <nav className={styles.tabs} aria-label="Secciones">
      {items.map((item) => (
        <a className={item.active ? styles.active : undefined} href={item.href} key={item.key}>
          {item.label}
        </a>
      ))}
    </nav>
  );
}
