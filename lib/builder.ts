import { builder } from "@builder.io/react"

// Initialize Builder with your API key
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY || "cc46ebc207de40988f71591e1bf1e1c2")

// Custom components for Builder.io
export const builderComponents = {
  HeroSection: {
    name: "Hero Section",
    inputs: [
      {
        name: "title",
        type: "string",
        defaultValue: "Härnösands Handbollsförening",
      },
      {
        name: "subtitle",
        type: "string",
        defaultValue: "Passion för handboll sedan 1964",
      },
      {
        name: "backgroundImage",
        type: "file",
        allowedFileTypes: ["jpeg", "jpg", "png", "svg"],
        defaultValue: "https://cdn.builder.io/api/v1/image/assets%2Fpub-01234567890abcdef%2F1920x1080_hero_placeholder",
      },
      {
        name: "primaryButtonText",
        type: "string",
        defaultValue: "Bli Medlem",
      },
      {
        name: "primaryButtonLink",
        type: "string",
        defaultValue: "/lag",
      },
      {
        name: "secondaryButtonText",
        type: "string",
        defaultValue: "Se Matcher",
      },
      {
        name: "secondaryButtonLink",
        type: "string",
        defaultValue: "/matcher",
      },
    ],
  },
}

export { builder }
