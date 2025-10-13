"use client"

type SaveAsPdfButtonProps = {
  className?: string
}

export default function SaveAsPdfButton({ className = "" }: SaveAsPdfButtonProps) {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      const { body } = document
      if (!body) {
        window.print()
        return
      }

      body.dataset.printTarget = "clubmate"

      const cleanup = () => {
        delete body.dataset.printTarget
        window.removeEventListener("afterprint", cleanup)
      }

      window.addEventListener("afterprint", cleanup)
      window.print()

      // Fallback if afterprint doesn't fire (some browsers)
      setTimeout(() => {
        if (body.dataset.printTarget === "clubmate") {
          cleanup()
        }
      }, 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${className}`}
    >
      <span aria-hidden="true">🖨️</span>
      Spara som PDF
    </button>
  )
}
