"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api/client";
import styles from "./SeaceConnectionPanel.module.css";

type Connection = {
  connected: boolean;
  status: string;
  usernameMasked?: string;
  lastAuthenticatedAt?: string | null;
};

export function SeaceConnectionPanel() {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setConnection(await apiFetch<Connection>("/api/integrations/seace"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar la conexión.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function connect(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    const form = new FormData(formElement);
    try {
      await apiFetch("/api/integrations/seace", {
        method: "PUT",
        json: { username: form.get("username"), password: form.get("password") },
      });
      formElement.reset();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo conectar.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("¿Desconectar SEACE? Tendrás que ingresar las credenciales nuevamente.")) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/api/integrations/seace", { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo desconectar.");
    } finally {
      setBusy(false);
    }
  }

  const connected = connection?.connected;
  return (
    <section className={styles.panel} aria-labelledby="seace-connection-title">
      <header>
        <div>
          <h2 id="seace-connection-title">Conexión SEACE</h2>
          <p>Consulta y prepara postulaciones sin volver a iniciar sesión.</p>
        </div>
        <span className={connected ? styles.online : styles.offline}>{connected ? "Conectado" : "Sin conectar"}</span>
      </header>

      {connected ? (
        <div className={styles.connected}>
          <div><span>Usuario</span><strong>{connection?.usernameMasked}</strong></div>
          <p>BuenaPro renovará la sesión automáticamente. La contraseña nunca vuelve al navegador.</p>
          <Button disabled={busy} type="button" variant="secondary" onClick={disconnect}>
            {busy ? "Desconectando…" : "Desconectar"}
          </Button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={connect}>
          <label htmlFor="seace-username">Usuario SEACE</label>
          <Input autoComplete="username" id="seace-username" inputMode="numeric" name="username" required spellCheck={false} />
          <label htmlFor="seace-password">Contraseña</label>
          <Input autoComplete="current-password" id="seace-password" name="password" required type="password" />
          <Button disabled={busy} type="submit">{busy ? "Conectando…" : "Conectar una vez"}</Button>
          <p>Se guardará cifrada para renovar sesiones automáticamente.</p>
        </form>
      )}
      <div className={styles.feedback} aria-live="polite">{error}</div>
    </section>
  );
}
