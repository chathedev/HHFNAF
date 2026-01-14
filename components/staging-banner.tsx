type StagingBannerProps = {
  title?: string
  message?: string
}

export function StagingBanner({
  title = "Testmiljö – Temporärt bytt tema",
  message = "Detta är staging (hhf.wby.se). Orange accent t.o.m 2026-01-18 23:00. Harnosandshf.se visar rosa tema under samma period.",
}: StagingBannerProps) {
  return (
    <div className="staging-ribbon" role="status" aria-live="polite">
      <div className="staging-ribbon__inner">
        <div className="staging-ribbon__pulse" aria-hidden />
        <div>
          <p className="staging-ribbon__title">{title}</p>
          <p className="staging-ribbon__copy">{message}</p>
        </div>
      </div>
    </div>
  )
}
