import { ImageResponse } from "next/og"
import { headers } from "next/headers"
import { readFile } from "fs/promises"
import { join } from "path"

// Image metadata
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = "image/png"

// Image generation
export default async function Image() {
  // Serve Final4 hero image directly on the Final4 subdomain
  let host = ""
  try {
    const h = await headers()
    host = (h.get("x-forwarded-host") || h.get("host") || "").toLowerCase().split(":")[0]
  } catch {}

  if (host === "final4.harnosandshf.se") {
    try {
      const heroPath = join(process.cwd(), "public", "final4-hero.webp")
      const imageData = await readFile(heroPath)
      return new Response(imageData, {
        headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" },
      })
    } catch {}
  }

  return new ImageResponse(
    <div
      style={{
        fontSize: 60,
        background: "linear-gradient(to right, #15803d, #f97316)", // Green to Orange gradient
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontFamily: "sans-serif",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <img
        src={`${process.env.NEXT_PUBLIC_VERCEL_URL || "http://localhost:3000"}/shield-logo.png`}
        alt="Härnösands HF Logo"
        width="150"
        height="150"
        style={{ marginBottom: "20px" }}
      />
      <div style={{ fontSize: 80, fontWeight: "bold", lineHeight: "1.1" }}>Härnösands HF</div>
      <div style={{ fontSize: 40, marginTop: "20px", opacity: 0.9 }}>Laget Före Allt</div>
      <div style={{ fontSize: 24, marginTop: "30px", opacity: 0.7 }}>
        Handbollsklubb med stolthet, gemenskap och passion för sporten.
      </div>
    </div>,
    {
      ...size,
    },
  )
}
