const limaFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "Por confirmar";
  return limaFormatter.format(new Date(value)).replace(/[\u00a0\u202f]/g, " ");
}

const limaShortFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Formato compacto para celdas de tabla: "10/07, 13:00". */
export function formatShortDateTime(value: string | Date | null | undefined) {
  if (!value) return "Por confirmar";
  return limaShortFormatter.format(new Date(value)).replace(/[  ]/g, " ");
}

export function formatDeadline(value: string | Date | null | undefined) {
  if (!value) return "Sin cierre";
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.ceil(diffMs / 36e5);
  if (diffHours < 0) return `Cerro ${formatDateTime(date)}`;
  if (diffHours <= 24) return `Cierra en ${diffHours} h`;
  const days = Math.ceil(diffHours / 24);
  return `Cierra en ${days} dias`;
}
