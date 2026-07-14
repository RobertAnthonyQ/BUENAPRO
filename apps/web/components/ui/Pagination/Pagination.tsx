import { Button } from "@/components/ui/Button";
import styles from "./Pagination.module.css";

export function Pagination({
  page = 1,
  totalPages,
  nextHref,
  prevHref,
}: {
  page?: number;
  totalPages?: number;
  nextHref?: string;
  prevHref?: string;
}) {
  return (
    <nav className={styles.pagination}>
      {prevHref ? <a href={prevHref}><Button variant="secondary">Anterior</Button></a> : <Button disabled variant="secondary">Anterior</Button>}
      <span>{totalPages ? `Pagina ${page} de ${totalPages}` : `Pagina ${page}`}</span>
      {nextHref ? <a href={nextHref}><Button variant="secondary">Siguiente</Button></a> : <Button disabled variant="secondary">Siguiente</Button>}
    </nav>
  );
}
