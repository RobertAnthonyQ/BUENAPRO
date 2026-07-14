"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/api/client";
import styles from "./SeaceWorkspace.module.css";

type Tab = "consultations" | "quote";
type LoadState = { loading: boolean; error: string; data: any };
const emptyState: LoadState = { loading: false, error: "", data: null };

function listFrom(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["content", "data", "items", "lista", "registros", "rows"]) {
    if (Array.isArray(value[key])) return value[key];
    const nested = listFrom(value[key]);
    if (nested.length) return nested;
  }
  return [];
}

function pick(row: any, keys: string[]) {
  for (const key of keys) if (row?.[key] != null && row[key] !== "") return String(row[key]);
  return "";
}

function usefulFields(value: any, prefix = "", depth = 0): Array<[string, string]> {
  if (!value || typeof value !== "object" || depth > 2) return [];
  const result: Array<[string, string]> = [];
  for (const [key, item] of Object.entries(value)) {
    if (item == null || item === "" || /token|password|clave/i.test(key)) continue;
    const label = prefix ? `${prefix} · ${key}` : key;
    if (["string", "number", "boolean"].includes(typeof item)) result.push([label, String(item)]);
    else if (!Array.isArray(item)) result.push(...usefulFields(item, label, depth + 1));
    if (result.length >= 12) break;
  }
  return result.slice(0, 12);
}

export function SeaceWorkspace({ idContrato, canQuote }: { idContrato: number; canQuote: boolean }) {
  const [active, setActive] = useState<Tab>("consultations");
  const [consultations, setConsultations] = useState<LoadState>(emptyState);
  const [quote, setQuote] = useState<LoadState>(emptyState);

  async function load(tab: Tab, force = false) {
    const state = tab === "consultations" ? consultations : quote;
    if (state.data && !force) return;
    const setState = tab === "consultations" ? setConsultations : setQuote;
    setState({ loading: true, error: "", data: state.data });
    try {
      const url = tab === "consultations"
        ? `/api/contracts/${idContrato}/seace/consultations?estado=0&page=1&page_size=10`
        : `/api/contracts/${idContrato}/seace/quote-context`;
      setState({ loading: false, error: "", data: await apiFetch(url) });
    } catch (cause) {
      setState({ loading: false, error: cause instanceof Error ? cause.message : "SEACE no respondió.", data: null });
    }
  }

  function activate(tab: Tab) {
    setActive(tab);
    void load(tab);
  }

  const current = active === "consultations" ? consultations : quote;
  const consultationItems = listFrom(consultations.data?.consultations);
  const quoteDocuments = (quote.data?.documents ?? []).filter((doc: any) => Number(doc.categoria) === 2);
  const fields = quote.data ? usefulFields(quote.data.quotation).concat(usefulFields(quote.data.contract)).slice(0, 12) : [];

  return (
    <section className={styles.workspace} id="seace-workspace" aria-labelledby="seace-workspace-title">
      <header className={styles.header}>
        <div><span>SEACE conectado</span><h2 id="seace-workspace-title">Consultas oficiales</h2></div>
        {current.data ? <button type="button" onClick={() => load(active, true)}>Actualizar</button> : null}
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Trabajo en SEACE">
        <button aria-selected={active === "consultations"} role="tab" type="button" onClick={() => activate("consultations")}>Consultas oficiales</button>
      </div>

      {!current.data && !current.loading && !current.error ? (
        <div className={styles.invitation}>
          <strong>{active === "consultations" ? "Revisa las preguntas del proceso" : "Carga los campos oficiales de cotización"}</strong>
          <p>La información privada se solicita a SEACE solo cuando tú la necesitas.</p>
          <Button type="button" onClick={() => load(active)}>Consultar SEACE</Button>
        </div>
      ) : null}
      {current.loading ? <div className={styles.loading} role="status">Consultando SEACE…</div> : null}
      {current.error ? <div className={styles.error} role="alert"><strong>No se pudo cargar</strong><span>{current.error}</span><Button variant="secondary" type="button" onClick={() => load(active, true)}>Reintentar</Button></div> : null}

      {active === "consultations" && consultations.data ? (
        consultationItems.length ? (
          <div className={styles.consultations}>
            {consultationItems.map((item, index) => {
              const question = pick(item, ["desConsulta", "consulta", "textoConsulta", "descripcion", "pregunta"]);
              const answer = pick(item, ["desRespuesta", "respuesta", "textoRespuesta"]);
              const status = pick(item, ["nomEstadoConsulta", "estadoConsulta", "estado", "abrEstado"]);
              const date = pick(item, ["fecConsulta", "fechaConsulta", "fecha"]);
              return <article key={item.idConsulta ?? item.id ?? index}><div><span>{status || "Consulta oficial"}</span>{date ? <time>{date}</time> : null}</div><h3>{question || `Consulta ${index + 1}`}</h3>{answer ? <details><summary>Ver respuesta de la entidad</summary><p>{answer}</p></details> : <p className={styles.pending}>Pendiente de respuesta</p>}</article>;
            })}
          </div>
        ) : <div className={styles.empty}>No hay consultas registradas para esta licitación.</div>
      ) : null}

      {active === "quote" && quote.data ? (
        <div className={styles.quote}>
          <div className={styles.readiness}><div><span>Estado</span><strong>{canQuote ? "Lista para preparar" : "Cotización no disponible"}</strong></div><p>Vista de lectura. El envío oficial se habilitará después de validar el flujo completo.</p></div>
          {fields.length ? <dl className={styles.fields}>{fields.map(([label, value]) => <div key={`${label}-${value}`}><dt>{label.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl> : null}
          <div className={styles.quoteDocs}><h3>Formatos y anexos</h3>{quoteDocuments.length ? quoteDocuments.map((doc: any) => <div key={doc.id}><div><strong>{doc.filename}</strong><span>{doc.mime?.includes("word") ? "Documento editable" : doc.mime ?? "Archivo SEACE"}</span></div><a href={`/api/contracts/${idContrato}/original/${doc.id}`}>Descargar</a></div>) : <p>No se encontraron formatos adicionales.</p>}</div>
        </div>
      ) : null}
    </section>
  );
}
