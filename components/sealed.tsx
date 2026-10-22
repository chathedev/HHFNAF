"use client"

// Client side of sealed page data (see lib/page-seal.ts). withSealed(Component) gives a
// component that takes { sealed } instead of its real props. On the server it opens the seal
// synchronously with the page key and renders normally (full HTML for the first paint and
// search engines). In the browser the server HTML stays on screen while the key arrives
// through the vault, then React hydrates with the same props.

import { Component as ReactComponent, Suspense, use, type ComponentType, type ReactNode } from "react"
import { openSealed, openSealedSync } from "@/lib/page-seal"

// A broken island must never take the page down: it renders nothing and tries again later.
class IslandBoundary extends ReactComponent<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  private timer: ReturnType<typeof setTimeout> | null = null
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.timer = setTimeout(() => this.setState({ failed: false }), 15_000)
  }
  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export function withSealed<P extends object>(Inner: ComponentType<P>, displayName?: string) {
  function Opened({ sealed }: { sealed: string }) {
    const props = typeof window === "undefined" ? openSealedSync<P>(sealed) : use(openSealed<P>(sealed))
    return <Inner {...props} />
  }
  function SealedIsland({ sealed }: { sealed: string }) {
    return (
      <IslandBoundary>
        <Suspense fallback={null}>
          <Opened sealed={sealed} />
        </Suspense>
      </IslandBoundary>
    )
  }
  SealedIsland.displayName = `Sealed(${displayName || Inner.displayName || Inner.name || "Island"})`
  return SealedIsland
}
