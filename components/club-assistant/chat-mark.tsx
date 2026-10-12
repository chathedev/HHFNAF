import styles from "./club-assistant.module.css"

type ChatMarkProps = {
  size?: number
  /** Periodic "dribble": the dots bounce one after another, like a ball. */
  animated?: boolean
  className?: string
}

// HHF-assistentens mark: a soft speech bubble whose three dots now and then dribble.
export function ChatMark({ size = 30, animated = true, className }: ChatMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={[animated ? styles.markBreath : "", className].filter(Boolean).join(" ")}
    >
      <path
        d="M16 5.5c6.35 0 11 4.06 11 9.45 0 5.4-4.65 9.46-11 9.46-1.12 0-2.2-.13-3.2-.37l-4.7 2.55c-.66.36-1.4-.27-1.15-.97l1.18-3.32C6.44 20.62 5 18.02 5 14.95 5 9.56 9.65 5.5 16 5.5z"
        fill="currentColor"
      />
      <g fill="#15803d">
        <circle cx="11.6" cy="15" r="1.75" className={animated ? styles.dribble : undefined} />
        <circle cx="16" cy="15" r="1.75" className={animated ? styles.dribble : undefined} />
        <circle cx="20.4" cy="15" r="1.75" className={animated ? styles.dribble : undefined} />
      </g>
    </svg>
  )
}
