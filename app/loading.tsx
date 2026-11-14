import { Header } from "@/components/header"
import { RootLoadingBody } from "@/components/root-loading-body"

/**
 * Root fallback. It wraps every route, so the body depends on the path (see RootLoadingBody).
 *
 * The home hero is a full-height dark image, so the old plain slate panel read as a
 * bright flash when navigating back to the start page. A dark block of the same height
 * keeps the transition continuous, and the header stays mounted throughout.
 */
export default function Loading() {
  return (
    <>
      <Header />
      <RootLoadingBody />
    </>
  )
}
