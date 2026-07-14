"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { trackingLabels, trackingStates } from "@/lib/constants/states";

export function MatchStateSelect({ matchId, value }: { matchId: string | number; value: string }) {
  const [state, setState] = useState(value);

  async function update(next: string) {
    setState(next);
    await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_state: next }),
    });
  }

  return (
    <Select value={state} onChange={(event) => update(event.target.value)}>
      {trackingStates.map((item) => (
        <option key={item} value={item}>{trackingLabels[item]}</option>
      ))}
    </Select>
  );
}
