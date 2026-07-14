"use client";

import { signOut } from "next-auth/react";
import styles from "./UserMenu.module.css";

export function UserMenu() {
  return (
    <div className={styles.menu}>
      <span className={styles.avatar} title="VEYON SAC">VY</span>
      <button
        className={styles.signOut}
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Salir
      </button>
    </div>
  );
}
