"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/api/client";
import styles from "./MatchInlineEditor.module.css";

type Member = {
  id: string;
  name: string | null;
  email: string;
};

export function MatchInlineEditor({
  matchId,
  amount,
  notes,
  responsableId,
  members,
}: {
  matchId: string | number;
  amount?: string | number | null;
  notes?: string | null;
  responsableId?: string | null;
  members: Member[];
}) {
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Guardando...");
    try {
      await apiFetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        json: {
          monto_ofertado: form.get("monto_ofertado") ? Number(form.get("monto_ofertado")) : null,
          notas: form.get("notas")?.toString() ?? "",
          responsable_id: form.get("responsable_id") || null,
        },
      });
      setStatus("Guardado");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar");
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <Input name="monto_ofertado" type="number" step="0.01" min="0" defaultValue={amount ?? ""} placeholder="Monto" />
      <Select name="responsable_id" defaultValue={responsableId ?? ""}>
        <option value="">Sin responsable</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name || member.email}
          </option>
        ))}
      </Select>
      <Input name="notas" defaultValue={notes ?? ""} placeholder="Notas internas" />
      <Button type="submit" variant="secondary">Guardar</Button>
      {status ? <span>{status}</span> : null}
    </form>
  );
}
