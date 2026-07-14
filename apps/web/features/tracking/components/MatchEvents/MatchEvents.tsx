"use client";

import { useEffect, useState } from "react";
import styles from "./MatchEvents.module.css";

export function MatchEvents({ matchId }: { matchId: string | number }) {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/events`)
      .then((response) => response.json())
      .then((json) => setEvents(json.data ?? []))
      .catch(() => setEvents([]));
  }, [matchId]);

  if (!events.length) return <span className={styles.empty}>Sin historial</span>;

  return (
    <ol className={styles.events}>
      {events.slice(0, 4).map((event) => (
        <li key={event.id}>
          <strong>{event.event_type}</strong>
          <span>{new Date(event.created_at).toLocaleString("es-PE", { timeZone: "America/Lima" })}</span>
        </li>
      ))}
    </ol>
  );
}
