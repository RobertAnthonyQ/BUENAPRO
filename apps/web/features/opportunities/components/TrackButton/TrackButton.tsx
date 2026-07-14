"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function TrackButton({
  idContrato,
  state = "interesada",
  children = "Seguir",
  variant = "secondary",
}: {
  idContrato: string | number;
  state?: string;
  children?: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  async function track() {
    setStatus("saving");
    const response = await fetch(`/api/contracts/${idContrato}/track`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_state: state }),
    });
    if (response.ok) {
      setStatus("done");
      return;
    }
    setStatus("error");
  }

  return (
    <Button disabled={status === "saving" || status === "done"} onClick={track} variant={status === "error" ? "danger" : variant}>
      {status === "saving" ? "Guardando" : status === "done" ? "En seguimiento" : children}
    </Button>
  );
}
