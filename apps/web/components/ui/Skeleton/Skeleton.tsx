import styles from "./Skeleton.module.css";

export function Skeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className={styles.wrap}>
      {Array.from({ length: lines }).map((_, index) => <span key={index} />)}
    </div>
  );
}
