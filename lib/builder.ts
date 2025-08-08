import { builder } from '@builder.io/react'

// Initialize Builder.io with server-side API key
const apiKey = process.env.BUILDER_PUBLIC_KEY || process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY

if (apiKey && apiKey !== 'your-builder-public-key') {
  builder.init(apiKey)
}

export { builder }
