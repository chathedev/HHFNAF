import { NextResponse } from "next/server"

export async function POST() {
  const builderApiKey = process.env.NEXT_PUBLIC_BUILDER_API_KEY
  
  if (!builderApiKey || builderApiKey === "pub-your-builder-api-key-here") {
    return NextResponse.json(
      { error: "Builder.io API key not configured" },
      { status: 400 }
    )
  }

  // Sample content data for Builder.io
  const sampleContent = {
    name: "Sample Hero Page",
    data: {
      blocks: [
        {
          "@type": "@builder.io/sdk:Element",
          "@version": 2,
          id: "builder-hero-section",
          component: {
            name: "Hero Section",
            options: {
              title: "Härnösands Handbollsförening",
              subtitle: "Passion för handboll sedan 1964 - Välkommen till vår familj!",
              backgroundImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80",
              primaryButtonText: "Bli Medlem",
              primaryButtonLink: "/lag",
              secondaryButtonText: "Se Matcher",
              secondaryButtonLink: "/matcher",
            },
          },
        },
      ],
    },
    published: "published",
    meta: {
      urlPath: "/editor",
      lastUpdated: Date.now(),
    },
    query: [
      {
        "@type": "@builder.io/core:Query",
        property: "urlPath",
        operator: "is",
        value: "/editor",
      },
    ],
  }

  try {
    // Note: This would require a private API key to actually create content
    // For demo purposes, we'll just return the sample structure
    return NextResponse.json({
      message: "Sample content structure generated",
      content: sampleContent,
      instructions: [
        "1. Go to builder.io and create an account",
        "2. Get your Public API Key from Space Settings",
        "3. Replace NEXT_PUBLIC_BUILDER_API_KEY in .env.local",
        "4. Create a new Page model in Builder",
        "5. Set the URL pattern to '/editor'",
        "6. Use the visual editor to create content",
      ],
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create sample content" },
      { status: 500 }
    )
  }
}
