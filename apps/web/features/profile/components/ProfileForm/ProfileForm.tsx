"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api/client";
import styles from "./ProfileForm.module.css";

function split(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseContracts(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [objeto, entidad, monto, anio] = line.split("|").map((item) => item?.trim());
      return { objeto, entidad, monto: monto ? Number(monto) : null, anio: anio ? Number(anio) : null };
    });
}

export function ProfileForm({ profile }: { profile: any | null }) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [dirty, setDirty] = useState(false);

  // La experiencia económica puede venir con claves por rubro
  // (servicios_tecnologia, software_desarrollo, ...); mostrar el mejor monto.
  const econValues = Object.values(profile?.econ_experience_json ?? {})
    .map(Number)
    .filter(Number.isFinite);
  const econDefault = profile?.econ_experience_json?.servicios ?? (econValues.length ? Math.max(...econValues) : "");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const form = new FormData(event.currentTarget);

    // Merge sobre la metadata existente: el perfil puede tener campos ricos
    // (skills/grado/carrera del equipo, experiencia económica por rubro, CIIU)
    // que este formulario no edita y NO deben perderse al guardar.
    const currentTeam: any[] = Array.isArray(profile?.team_json) ? profile.team_json : [];
    const teamRoles = split(String(form.get("equipo") ?? ""));
    const teamUnchanged =
      teamRoles.join("|") === currentTeam.map((item: any) => item.role ?? item).join("|");
    const nextTeam = teamUnchanged
      ? currentTeam
      : teamRoles.map((role) => currentTeam.find((item: any) => (item.role ?? item) === role) ?? { role });

    const payload = {
      ruc: String(form.get("ruc") ?? ""),
      razon_social: String(form.get("razon_social") ?? ""),
      identity_json: {
        ...(profile?.identity_json ?? {}),
        rnp: split(String(form.get("rnp") ?? "")),
        cci: String(form.get("cci") ?? ""),
      },
      finance_json: {
        ...(profile?.finance_json ?? {}),
      },
      econ_experience_json: {
        ...(profile?.econ_experience_json ?? {}),
        servicios: Number(form.get("experiencia_economica") ?? 0),
      },
      team_json: nextTeam,
      hireable_roles_json: split(String(form.get("roles_contratables") ?? "")),
      equipment_json: split(String(form.get("equipamiento") ?? "")),
      certifications_json: split(String(form.get("certificaciones") ?? "")),
      experience_json: parseContracts(String(form.get("contratos_previos") ?? "")),
    };

    try {
      await apiFetch("/api/profile", { method: "PUT", json: payload });
      setStatus("done");
      setDirty(false);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className={styles.form} onChange={() => { setDirty(true); if (status === "done") setStatus("idle"); }} onSubmit={submit}>
      <header className={styles.header}><div><h2>Capacidad</h2><p>Datos que se comparan con los requisitos del TDR.</p></div>{dirty ? <Button disabled={status === "saving"} type="submit">{status === "saving" ? "Guardando…" : "Guardar cambios"}</Button> : null}</header>
      <section className={styles.section}>
        <h3>Identidad</h3>
        <label>RUC<Input name="ruc" defaultValue={profile?.ruc ?? ""} required /></label>
        <label>Razon social<Input name="razon_social" defaultValue={profile?.razon_social ?? ""} required /></label>
        <label>RNP<Input name="rnp" defaultValue={(profile?.identity_json?.rnp ?? []).join(", ")} placeholder="Ej. servicios, bienes…" /></label>
        <label>CCI<Input name="cci" defaultValue={profile?.identity_json?.cci ?? ""} /></label>
      </section>

      <section className={styles.section}>
        <h3>Experiencia económica</h3>
        <label>Monto acreditable en servicios<Input min="0" name="experiencia_economica" type="number" defaultValue={econDefault} /></label>
        <p className={styles.helper}>Se compara directamente con el monto de experiencia exigido en cada TDR.</p>
      </section>

      <details className={styles.details}>
        <summary>Equipo y recursos <span>{(profile?.team_json ?? []).length + (profile?.equipment_json ?? []).length} registrados</span></summary>
        <div className={styles.detailBody}>
        <label>Equipo actual<Input name="equipo" defaultValue={(profile?.team_json ?? []).map((item: any) => item.role ?? item).join(", ")} placeholder="Ej. ingeniero, contador…" /></label>
        <label>Roles contratables<Input name="roles_contratables" defaultValue={(profile?.hireable_roles_json ?? []).join(", ")} /></label>
        <label>Equipamiento<Input name="equipamiento" defaultValue={(profile?.equipment_json ?? []).join(", ")} /></label>
        <label>Certificaciones y seguros<Input name="certificaciones" defaultValue={(profile?.certifications_json ?? []).join(", ")} /></label>
        </div>
      </details>

      <details className={styles.details}>
        <summary>Contratos previos <span>{(profile?.experience_json ?? []).length} registrados</span></summary>
        <div className={styles.detailBody}>
        <label className={styles.full}>
          Historial acreditable
          <textarea
            name="contratos_previos"
            defaultValue={(profile?.experience_json ?? [])
              .map((item: any) => [item.objeto, item.entidad, item.monto, item.anio].filter((value) => value != null).join(" | "))
              .join("\n")}
            placeholder="Objeto | Entidad | Monto | Año…"
          />
        </label>
        </div>
      </details>

      <div className={styles.feedback} aria-live="polite">
        {status === "done" ? <span>Perfil guardado. El matching se recalculara.</span> : null}
        {status === "error" ? <span className={styles.error}>No se pudo guardar.</span> : null}
      </div>
    </form>
  );
}
