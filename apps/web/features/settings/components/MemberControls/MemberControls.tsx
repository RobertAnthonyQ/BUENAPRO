"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/api/client";
import styles from "./MemberControls.module.css";

export function AddMemberForm() {
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("Invitando...");
    try {
      await apiFetch("/api/tenant/members", {
        method: "POST",
        json: {
          email: form.get("email")?.toString(),
          name: form.get("name")?.toString(),
          role: form.get("role")?.toString(),
        },
      });
      setStatus("Miembro agregado");
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo agregar");
    }
  }

  return (
    <form className={styles.addForm} onSubmit={submit}>
      <Input name="email" type="email" required placeholder="email@empresa.com" />
      <Input name="name" placeholder="Nombre" />
      <Select name="role" defaultValue="member">
        <option value="owner">Owner</option>
        <option value="admin">Admin</option>
        <option value="member">Member</option>
      </Select>
      <Button type="submit" variant="secondary">Agregar</Button>
      {status ? <span>{status}</span> : null}
    </form>
  );
}

export function MemberRoleSelect({ userId, role }: { userId: string; role: string }) {
  const [status, setStatus] = useState("");

  async function update(nextRole: string) {
    setStatus("Guardando...");
    try {
      await apiFetch(`/api/tenant/members/${userId}`, {
        method: "PATCH",
        json: { role: nextRole },
      });
      setStatus("Guardado");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error");
    }
  }

  return (
    <div className={styles.role}>
      <Select defaultValue={role} onChange={(event) => update(event.target.value)}>
        <option value="owner">Owner</option>
        <option value="admin">Admin</option>
        <option value="member">Member</option>
      </Select>
      {status ? <span>{status}</span> : null}
    </div>
  );
}
