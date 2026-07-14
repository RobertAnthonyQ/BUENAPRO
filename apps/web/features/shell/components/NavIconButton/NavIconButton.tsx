"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppIcon, type AppIconName } from "@/components/ui/AppIcon";
import styles from "./NavIconButton.module.css";

export function NavIconButton({ href, label, icon }: { href: string; label: string; icon: AppIconName }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link className={[styles.link, active ? styles.active : ""].join(" ")} href={href} title={label}>
      <AppIcon name={icon} />
      <span>{label}</span>
    </Link>
  );
}
