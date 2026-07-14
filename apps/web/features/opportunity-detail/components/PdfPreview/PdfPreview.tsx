"use client";

import { useRef, useState } from "react";
import styles from "./PdfPreview.module.css";

export function PdfPreview({
  src,
  title,
  downloadHref,
  previewHref,
}: {
  src: string;
  title: string;
  downloadHref: string;
  previewHref: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const viewerSrc = `${previewHref}#toolbar=1&navpanes=0&view=FitH`;

  return (
    <>
      <div className={styles.previewShell}>
        <div className={styles.toolbar}>
          <span>Primera página</span>
          <button type="button" onClick={() => dialogRef.current?.showModal()}>
            Ver documento
          </button>
        </div>
        {previewFailed ? (
          <div className={styles.previewFallback} role="status">
            <strong>Vista previa no disponible</strong>
            <span>Puedes abrir el documento completo para revisarlo.</span>
            <button type="button" onClick={() => dialogRef.current?.showModal()}>
              Abrir TDR
            </button>
          </div>
        ) : (
          <button
            aria-label={`Ampliar primera página de ${title}`}
            className={styles.pageButton}
            type="button"
            onClick={() => dialogRef.current?.showModal()}
          >
            <img
              alt={`Primera página de ${title}`}
              className={styles.pageImage}
              height="1120"
              loading="lazy"
              src={src}
              width="792"
              onError={() => setPreviewFailed(true)}
            />
          </button>
        )}
      </div>

      <dialog aria-label={`Documento ${title}`} className={styles.modal} ref={dialogRef}>
        <div className={styles.modalHeader}>
          <div>
            <span>TDR</span>
            <strong>{title}</strong>
          </div>
          <div className={styles.modalActions}>
            <a className={styles.downloadLink} href={downloadHref}>
              Descargar
            </a>
            <button type="button" onClick={() => dialogRef.current?.close()}>
              Cerrar
            </button>
          </div>
        </div>
        <iframe className={styles.modalPdf} src={viewerSrc} title={`TDR completo ${title}`} />
      </dialog>
    </>
  );
}
