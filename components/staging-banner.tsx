type StagingBannerProps = {
  title?: string
  message?: string
}

export function StagingBanner({
  title = "Testmiljö – Rosa bandet-hyllning",
  message = "Detta är staging (hhf.wby.se). Rosa accent syns bara här och påverkar inte harnosandshf.se.",
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
