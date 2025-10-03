import { type NextRequest, NextResponse } from "next/server"
import { loadContent, saveContent } from "@/lib/content-loader"

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = params.filename
    const jsonFilename = filename.endsWith(".json") ? filename : `${filename}.json`

    const content = await loadContent(jsonFilename)
    return NextResponse.json(content)
  } catch (error) {
    console.error("Error loading content:", error)
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 })
  }
}

async function commitToGitHub(filename: string, content: any) {
  const githubToken = process.env.GITHUB_TOKEN
  const githubOwner = process.env.GITHUB_OWNER
  const githubRepo = process.env.GITHUB_REPO

  if (!githubToken || !githubOwner || !githubRepo) {
    throw new Error("GitHub configuration missing")
  }

  const filePath = `content/${filename}.json`
  const fileContent = JSON.stringify(content, null, 2)
  const encodedContent = Buffer.from(fileContent).toString("base64")

  try {
    // Get current file SHA (if exists)
    let sha: string | undefined
    try {
      const getFileResponse = await fetch(
        `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
        {
          headers: {
            Authorization: `token ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        },
      )

      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json()
        sha = fileData.sha
      }
    } catch (error) {
      // File doesn't exist, that's okay
    }

    // Commit the file
    const commitData = {
      message: `Update ${filename} content via editor`,
      content: encodedContent,
      ...(sha && { sha }),
    }

    const commitResponse = await fetch(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commitData),
      },
    )

    if (!commitResponse.ok) {
      const error = await commitResponse.json()
      throw new Error(`GitHub API error: ${error.message}`)
    }

    return await commitResponse.json()
  } catch (error) {
    console.error("GitHub commit error:", error)
    throw error
  }
}

export async function PUT(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const filename = params.filename
    const baseFilename = filename.replace(".json", "")
    const jsonFilename = filename.endsWith(".json") ? filename : `${filename}.json`

    const content = await request.json()

    // Try to commit to GitHub first
    try {
      const commitResult = await commitToGitHub(baseFilename, content)

      // Also save locally as backup
      await saveContent(jsonFilename, content)

      return NextResponse.json({
        message: "Content saved and committed to GitHub successfully",
        commit: commitResult.commit,
      })
    } catch (githubError) {
      console.error("GitHub commit failed:", githubError)

      // Fallback to local save only
      const success = await saveContent(jsonFilename, content)

      if (success) {
        return NextResponse.json({
          message: "Content saved locally (GitHub commit failed)",
          warning: "Changes not committed to repository",
        })
      } else {
        return NextResponse.json({ error: "Failed to save content" }, { status: 500 })
      }
    }
  } catch (error) {
    console.error("Error saving content:", error)
    return NextResponse.json({ error: "Failed to save content" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { filename: string } }) {
  return PUT(request, { params })
}
