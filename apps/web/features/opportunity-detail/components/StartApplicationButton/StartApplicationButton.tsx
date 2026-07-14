"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";

export function StartApplicationButton({
  idContrato,
  existing,
  disabled,
}: {
  idContrato: number;
  existing?: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function start() {
    setState("saving");
    try {
      const result = await apiFetch<{ data: { url: string } }>(`/api/contracts/${idContrato}/applications`, { method: "POST" });
      router.push(result.data.url);
    } catch {
      setState("error");
    }
  }

  return (
    <Button disabled={disabled || state === "saving"} onClick={start} variant={state === "error" ? "danger" : "primary"}>
      {state === "saving" ? "Creando postulación…" : state === "error" ? "Reintentar" : existing ? "Continuar postulación" : "Comenzar postulación"}
    </Button>
  );
}
