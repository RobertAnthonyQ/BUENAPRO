"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/api/client";
import styles from "./NotificationPrefsForm.module.css";

export function NotificationPrefsForm() {
  const [status, setStatus] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/api/notifications/prefs", {
        method: "PUT",
        json: {
        channel: form.get("channel"),
        mode: form.get("mode"),
        max_alerts_per_day: Number(form.get("max_alerts_per_day") ?? 5),
          quiet_hours_json: {
            start: form.get("quiet_start"),
            end: form.get("quiet_end"),
          },
        },
      });
      setStatus("Preferencia guardada");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar");
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <Select name="channel" defaultValue="in_app">
        <option value="in_app">Dentro de la app</option>
        <option value="email">Email</option>
        <option value="telegram">Telegram</option>
      </Select>
      <Select name="mode" defaultValue="realtime">
        <option value="realtime">Tiempo real</option>
        <option value="digest">Digest</option>
      </Select>
      <Input name="max_alerts_per_day" type="number" defaultValue={5} />
      <Input name="quiet_start" type="time" defaultValue="22:00" />
      <Input name="quiet_end" type="time" defaultValue="07:00" />
      <Button type="submit">Guardar</Button>
      {status ? <span>{status}</span> : null}
    </form>
  );
}
