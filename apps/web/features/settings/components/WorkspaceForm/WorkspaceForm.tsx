"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api/client";
import styles from "./WorkspaceForm.module.css";

export function WorkspaceForm({ name, plan }: { name: string; plan: string }) {
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Guardando...");
    try {
      await apiFetch("/api/tenant", {
        method: "PATCH",
        json: { name: form.get("name")?.toString(), plan },
      });
      setStatus("Workspace actualizado");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar");
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <Input name="name" defaultValue={name} placeholder="Nombre del workspace" />
      <Button type="submit" variant="secondary">Guardar</Button>
      {status ? <span>{status}</span> : null}
    </form>
  );
}
