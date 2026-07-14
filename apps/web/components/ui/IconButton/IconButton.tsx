import styles from "./IconButton.module.css";

export function IconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={[styles.button, className].filter(Boolean).join(" ")} {...props} />;
}
