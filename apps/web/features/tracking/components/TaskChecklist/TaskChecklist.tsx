"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api/client";
import styles from "./TaskChecklist.module.css";

export function TaskChecklist({ matchId }: { matchId: string | number }) {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/tasks?ensure_defaults=true`)
      .then((response) => response.json())
      .then((json) => setTasks(json.data ?? []))
      .catch(() => setTasks([]));
  }, [matchId]);

  async function toggle(task: any) {
    const next = task.status === "done" ? "pending" : "done";
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: next } : item));
    await apiFetch(`/api/matches/${matchId}/tasks/${task.id}`, {
      method: "PATCH",
      json: { status: next },
    });
  }

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = form.get("title")?.toString().trim();
    if (!title) return;
    const result = await apiFetch<{ data: any }>(`/api/matches/${matchId}/tasks`, {
      method: "POST",
      json: { title },
    });
    setTasks((current) => [...current, result.data]);
    event.currentTarget.reset();
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.tasks}>
        {tasks.length ? tasks.slice(0, 6).map((task) => (
          <Button key={task.id} onClick={() => toggle(task)} variant={task.status === "done" ? "ghost" : "secondary"}>
            {task.status === "done" ? "✓" : "○"} {task.title}
          </Button>
        )) : <span className={styles.empty}>Sin checklist</span>}
      </div>
      <form className={styles.form} onSubmit={createTask}>
        <Input name="title" placeholder="Nueva tarea" />
        <Button type="submit" variant="ghost">Agregar</Button>
      </form>
    </div>
  );
}
