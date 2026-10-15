import { readFileSync } from "fs"
import path from "path"

// The build this server process serves. Read once per process: during a release the new
// build is swapped in on disk before the process restarts, and a per-request read would let
// the old process announce a build it is not serving.
let buildId: string | null = null

export function getServerBuildId(): string {
  if (buildId === null) {
    try {
      buildId = readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim() || "unknown"
    } catch {
      buildId = "unknown"
    }
  }
  return buildId
}
