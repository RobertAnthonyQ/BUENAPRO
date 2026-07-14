"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import styles from "./AssigneeControl.module.css";

type Member = { id: string; name: string | null; email: string };

export function AssigneeControl({
  matchId,
  initialResponsibleId,
}: {
  matchId: string;
  initialResponsibleId?: string;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [responsibleId, setResponsibleId] = useState(
    initialResponsibleId ?? "",
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    apiFetch<{ data: Member[] }>("/api/tenant/members")
      .then((response) => setMembers(response.data))
      .catch(() => setStatus("error"));
  }, []);

  async function assign(value: string) {
    const previous = responsibleId;
    setResponsibleId(value);
    setStatus("saving");
    try {
      await apiFetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        json: { responsable_id: value || null },
      });
      setStatus("saved");
    } catch {
      setResponsibleId(previous);
      setStatus("error");
    }
  }

  return (
    <div className={styles.control}>
      <div>
        <label htmlFor={`responsible-${matchId}`}>Responsable</label>
        <span>
          {status === "saving"
            ? "Guardando…"
            : status === "saved"
              ? "Asignación guardada"
              : status === "error"
                ? "No se pudo guardar"
                : "Coordina quién prepara la propuesta"}
        </span>
      </div>
      <select
        id={`responsible-${matchId}`}
        name="responsible"
        value={responsibleId}
        disabled={status === "saving"}
        onChange={(event) => void assign(event.target.value)}
      >
        <option value="">Sin asignar</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name || member.email}
          </option>
        ))}
      </select>
    </div>
  );
}
