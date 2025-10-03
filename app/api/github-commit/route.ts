import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { filename, content, message } = await request.json()

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN
    const GITHUB_OWNER = process.env.GITHUB_OWNER
    const GITHUB_REPO = process.env.GITHUB_REPO

    if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
      return NextResponse.json({ error: "GitHub configuration missing" }, { status: 500 })
    }

    // Get current file SHA (required for updates)
    const getFileResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    )

    let sha = undefined
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json()
      sha = fileData.sha
    }

    // Commit the file
    const commitResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filename}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message || `Update ${filename}`,
          content: Buffer.from(content).toString("base64"),
          sha: sha, // Include SHA if file exists
        }),
      },
    )

    if (!commitResponse.ok) {
      const errorData = await commitResponse.json()
      console.error("GitHub API error:", errorData)
      return NextResponse.json(
        { error: "Failed to commit to GitHub", details: errorData },
        { status: commitResponse.status },
      )
    }

    const result = await commitResponse.json()
    return NextResponse.json({
      success: true,
      commit: result.commit,
      message: `Successfully committed ${filename} to GitHub`,
    })
  } catch (error) {
    console.error("GitHub commit error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
