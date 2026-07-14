import { Button } from "@/components/ui/Button";
import styles from "./EmptyState.module.css";

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: { label: string; href?: string };
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.mark} aria-hidden="true" />
      <h2>{title}</h2>
      {children ? <p>{children}</p> : null}
      {action?.href ? (
        <a className={styles.link} href={action.href}>
          <Button>{action.label}</Button>
        </a>
      ) : null}
    </div>
  );
}
