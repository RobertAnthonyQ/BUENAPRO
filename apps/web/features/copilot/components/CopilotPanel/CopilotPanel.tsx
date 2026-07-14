"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  decideChangeSet,
  getCopilotSession,
  openCopilotSession,
  sendCopilotMessage,
} from "../../api";
import type {
  CopilotChangeSet,
  CopilotMessage,
  CopilotSession,
} from "../../types";
import styles from "./CopilotPanel.module.css";

const STARTERS = [
  "¿Qué requisitos son críticos?",
  "¿Mi empresa puede cumplir?",
  "Ayúdame a completar el borrador",
];

function changeLabels(changes: Record<string, unknown>) {
  const labels: string[] = [];
  if (Array.isArray(changes.items) && changes.items.length)
    labels.push("Ítems y precios");
  if (Array.isArray(changes.requirements) && changes.requirements.length)
    labels.push("Respuestas RTM");
  const application =
    changes.application && typeof changes.application === "object"
      ? (changes.application as Record<string, unknown>)
      : {};
  if (application.validity_date) labels.push("Vigencia");
  if (application.contact_email || application.contact_phone)
    labels.push("Datos de contacto");
  return labels.length
    ? labels
    : Object.keys(changes).map((key) => key.replaceAll("_", " "));
}

function Message({
  message,
  working,
  onDecision,
}: {
  message: CopilotMessage;
  working: boolean;
  onDecision: (
    changeSet: CopilotChangeSet,
    decision: "confirm" | "reject",
  ) => void;
}) {
  return (
    <article className={styles.message} data-role={message.role}>
      <div className={styles.bubble}>
        <div className={styles.markdown}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        {message.citations.length ? (
          <details className={styles.sources}>
            <summary>{message.citations.length} fuentes consultadas</summary>
            <ul>
              {message.citations.map((citation, index) => (
                <li key={`${citation.label}-${index}`}>
                  <strong>{citation.label}</strong>
                  {citation.excerpt ? <span>{citation.excerpt}</span> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
      {message.changeSet ? (
        <section className={styles.changeSet} aria-label="Cambios sugeridos">
          <div>
            <strong>
              {message.changeSet.summary || "Cambios listos para revisar"}
            </strong>
            <span>La IA todavía no modificó el borrador.</span>
          </div>
          <ul>
            {changeLabels(message.changeSet.changes).map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
          {message.changeSet.status === "pending" ? (
            <div className={styles.changeActions}>
              <button
                disabled={working}
                type="button"
                onClick={() => onDecision(message.changeSet!, "confirm")}
              >
                Aplicar al borrador
              </button>
              <button
                disabled={working}
                type="button"
                onClick={() => onDecision(message.changeSet!, "reject")}
              >
                Descartar
              </button>
            </div>
          ) : (
            <span className={styles.decisionState}>
              {message.changeSet.status === "applied"
                ? "Cambios aplicados manualmente"
                : "Sugerencia descartada"}
            </span>
          )}
        </section>
      ) : null}
    </article>
  );
}

export function CopilotPanel({
  contractId,
  matchId,
  onApplied,
}: {
  contractId: number;
  matchId?: string;
  onApplied?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<CopilotSession | null>(null);
  const [draft, setDraft] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || session || working) return;
    setWorking(true);
    openCopilotSession(contractId, matchId)
      .then(setSession)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudo abrir el copiloto.",
        ),
      )
      .finally(() => setWorking(false));
  }, [contractId, matchId, open, session, working]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [session?.messages.length, working]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function submit(event?: FormEvent, preset?: string) {
    event?.preventDefault();
    const content = (preset ?? draft).trim();
    if (!content || !session || working) return;
    setDraft("");
    setError("");
    setWorking(true);
    try {
      const result = await sendCopilotMessage(session.id, content);
      setSession((current) =>
        current
          ? {
              ...current,
              messages: [
                ...current.messages,
                result.userMessage,
                result.assistantMessage,
              ],
            }
          : current,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo responder.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function decide(
    changeSet: CopilotChangeSet,
    decision: "confirm" | "reject",
  ) {
    if (!session || working) return;
    setWorking(true);
    setError("");
    try {
      await decideChangeSet(changeSet.id, decision);
      const refreshed = await getCopilotSession(session.id);
      setSession(refreshed);
      if (decision === "confirm") onApplied?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo procesar la decisión.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <button
        className={styles.launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
          <path
            d="M12 2.8 13.8 9l5.9 2.9-5.9 2.2L12 20.5l-1.8-6.4-5.9-2.2L10.2 9 12 2.8Z"
            fill="currentColor"
          />
        </svg>
        Preguntar a BuenaPro
      </button>
      {open ? (
        <div className={styles.backdrop} onClick={() => setOpen(false)} />
      ) : null}
      <aside
        className={styles.panel}
        data-open={open}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
        aria-label="Copiloto de licitación"
      >
        <header>
          <div>
            <span className={styles.status}>
              <i /> Copiloto de licitación
            </span>
            <strong>BuenaPro</strong>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar copiloto"
          >
            ×
          </button>
        </header>
        <div className={styles.contextNote}>
          Conoce el TDR, los formatos, tu perfil y el borrador. Ningún cambio se
          aplica sin tu confirmación.
        </div>
        <div className={styles.thread} aria-live="polite">
          {!session?.messages.length && !working ? (
            <div className={styles.empty}>
              <strong>¿Qué necesitas preparar?</strong>
              <p>
                Pregunta por requisitos o pídele que complete el borrador usando
                información acreditable.
              </p>
              <div>
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void submit(undefined, starter)}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {session?.messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              working={working}
              onDecision={(set, decision) => void decide(set, decision)}
            />
          ))}
          {working ? (
            <div className={styles.thinking} role="status">
              <span />
              <span />
              <span /> Analizando expediente
            </div>
          ) : null}
          {error ? (
            <div className={styles.error} role="alert">
              {error}
            </div>
          ) : null}
          <div ref={end} />
        </div>
        <form onSubmit={(event) => void submit(event)}>
          <label className={styles.srOnly} htmlFor={`copilot-${contractId}`}>
            Mensaje para el copiloto
          </label>
          <textarea
            id={`copilot-${contractId}`}
            name="copilot-message"
            autoComplete="off"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder="Pregunta o pide completar el borrador…"
            rows={3}
          />
          <div>
            <span>Enter para enviar · Shift + Enter para salto</span>
            <button
              type="submit"
              disabled={!draft.trim() || !session || working}
              aria-label="Enviar mensaje"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
              >
                <path
                  d="m5 12 7-7 7 7M12 5v14"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
