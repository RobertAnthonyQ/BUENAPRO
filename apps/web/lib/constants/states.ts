export const trackingStates = [
  "inbox",
  "en_evaluacion",
  "interesada",
  "en_preparacion",
  "postulada",
  "ganada",
  "perdida",
  "desierta",
  "en_ejecucion",
  "cobrada",
  "descartada",
] as const;

export const trackingLabels: Record<(typeof trackingStates)[number], string> = {
  inbox: "Inbox",
  en_evaluacion: "En evaluacion",
  interesada: "Interesada",
  en_preparacion: "En preparacion",
  postulada: "Postulada",
  ganada: "Ganada",
  perdida: "Perdida",
  desierta: "Desierta",
  en_ejecucion: "En ejecucion",
  cobrada: "Cobrada",
  descartada: "Descartada",
};

export const verdictLabels: Record<string, string> = {
  verde: "Verde",
  ambar: "Ambar",
  rojo: "Rojo",
  gris: "Revision",
};
