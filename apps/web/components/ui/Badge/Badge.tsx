import styles from "./Badge.module.css";

type Tone = "green" | "amber" | "red" | "neutral" | "brand" | "sage";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={[styles.badge, styles[tone]].join(" ")}>{children}</span>;
}
