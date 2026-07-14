"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AppIcon } from "@/components/ui/AppIcon";
import { Input } from "@/components/ui/Input";
import styles from "./AuthPage.module.css";

const errorLabels: Record<string, string> = {
  CredentialsSignin: "No pudimos iniciar sesion con esos datos.",
  Configuration: "Falta configuracion de autenticacion.",
};

export function AuthPage({ error, mode = "login" }: { error?: string | null; mode?: "login" | "register" }) {
  const [formError, setFormError] = useState(error ?? null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFormError(null);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      redirect: false,
      callbackUrl: mode === "register" ? "/onboarding" : "/feed",
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      name: String(form.get("name") ?? ""),
      tenant_name: String(form.get("tenant_name") ?? ""),
    });
    setLoading(false);
    if (result?.ok) {
      window.location.href = result.url ?? (mode === "register" ? "/onboarding" : "/feed");
      return;
    }
    setFormError("CredentialsSignin");
  }

  return (
    <main className={styles.page}>
      <section className={styles.canvas}>
        <div className={styles.brandPane}>
          <div className={styles.logo}>
            <AppIcon name="mark" />
            <span>BuenaPro</span>
          </div>
          <div>
            <h1>Decide rapido. Postula mejor.</h1>
            <p>Contratos menores priorizados por tu capacidad real.</p>
          </div>
        </div>
        <div className={styles.panel}>
          <div className={styles.formHeader}>
            <p>{mode === "register" ? "Nueva cuenta" : "Acceso"}</p>
            <h2>{mode === "register" ? "Crea tu espacio de trabajo" : "Ingresa a tu cuenta"}</h2>
          </div>
          {formError ? <p className={styles.error}>{errorLabels[formError] ?? "No se pudo iniciar sesion."}</p> : null}
          <form className={styles.form} onSubmit={submit}>
            {mode === "register" ? (
              <>
                <label>Tu nombre<Input autoComplete="name" name="name" required /></label>
                <label>Empresa<Input autoComplete="organization" name="tenant_name" required /></label>
              </>
            ) : null}
            <label>Email<Input autoComplete="email" name="email" required type="email" /></label>
            <label>Contraseña<Input autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} name="password" required type="password" /></label>
            <Button disabled={loading} type="submit">
              {loading ? "Procesando…" : mode === "register" ? "Crear cuenta" : "Entrar"}
            </Button>
          </form>
          <p className={styles.demo}>
            {mode === "register" ? <>¿Ya tienes una cuenta? <Link href="/login">Ingresar</Link></> : <>¿Primera vez en BuenaPro? <Link href="/registro">Crear cuenta</Link></>}
          </p>
        </div>
      </section>
    </main>
  );
}
