import styles from "./club-assistant.module.css"

type RobotIconProps = {
  size?: number
  /** Idle animation: float, blink, antenna glow and a happy wiggle now and then. */
  animated?: boolean
  className?: string
}

// A small, friendly robot head. Eyes are LEDs on a dark visor; during the periodic
// wiggle they switch to smiling arcs.
export function RobotIcon({ size = 34, animated = true, className }: RobotIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={[animated ? styles.robotFloat : "", className].filter(Boolean).join(" ")}
    >
      <g className={animated ? styles.robotWiggle : undefined}>
        <line x1="24" y1="8.5" x2="24" y2="13" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="24" cy="7" r="2.6" className={animated ? styles.antennaGlow : undefined} fill="#bbf7d0" />
        <rect x="6.5" y="21" width="3.5" height="9" rx="1.75" fill="currentColor" opacity="0.85" />
        <rect x="38" y="21" width="3.5" height="9" rx="1.75" fill="currentColor" opacity="0.85" />
        <rect x="9.5" y="13" width="29" height="24" rx="9" fill="currentColor" />
        <rect x="13.5" y="18" width="21" height="13.5" rx="6.5" fill="#052e16" />
        <g className={animated ? styles.eyesOpen : undefined}>
          <g className={animated ? styles.blink : undefined}>
            <circle cx="20" cy="24.5" r="2.4" fill="#4ade80" />
            <circle cx="28" cy="24.5" r="2.4" fill="#4ade80" />
          </g>
        </g>
        {animated ? (
          <g className={styles.eyesHappy}>
            <path d="M17.6 25.6c.8-1.9 4-1.9 4.8 0" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
            <path d="M25.6 25.6c.8-1.9 4-1.9 4.8 0" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
          </g>
        ) : null}
        <path d="M21 33.2c1.9 1.3 4.1 1.3 6 0" stroke="#052e16" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />
      </g>
    </svg>
  )
}
