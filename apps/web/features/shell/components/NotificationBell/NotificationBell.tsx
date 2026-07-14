import { AppIcon } from "@/components/ui/AppIcon";
import styles from "./NotificationBell.module.css";

export function NotificationBell() {
  return (
    <span className={styles.bell} title="Notificaciones">
      <AppIcon name="bell" />
    </span>
  );
}
