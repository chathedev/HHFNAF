import { NextResponse } from "next/server"

export async function GET() {
  const githubToken = process.env.GITHUB_TOKEN
  const githubOwner = process.env.GITHUB_OWNER
  const githubRepo = process.env.GITHUB_REPO

  const isConfigured = !!(githubToken && githubOwner && githubRepo)

  if (!isConfigured) {
    return NextResponse.json({
      configured: false,
      missing: {
        token: !githubToken,
        owner: !githubOwner,
        repo: !githubRepo,
      },
    })
  }

  try {
    // Test GitHub API access
    const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (response.ok) {
      const repoData = await response.json()
      return NextResponse.json({
        configured: true,
        repository: {
          name: repoData.name,
          fullName: repoData.full_name,
          private: repoData.private,
          defaultBranch: repoData.default_branch,
        },
      })
    } else {
      return NextResponse.json({
        configured: false,
        error: "GitHub API access failed",
      })
    }
  } catch (error) {
    return NextResponse.json({
      configured: false,
      error: "Failed to connect to GitHub",
    })
  }
}
