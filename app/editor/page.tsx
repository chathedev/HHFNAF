"use client"

import { Builder, builder, BuilderComponent } from "@builder.io/react"
import { useState, useEffect } from "react"

// Configure Builder.io
if (typeof window !== 'undefined') {
  builder.init(process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || '')
}

// Sample Hero Component for Builder.io
const SampleHero = ({ title, subtitle, buttonText, buttonLink, backgroundImage }: {
  title?: string
  subtitle?: string  
  buttonText?: string
  buttonLink?: string
  backgroundImage?: string
}) => (
  <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
    <div 
      className="absolute inset-0 bg-cover bg-center z-0"
      style={{
        backgroundImage: `url(${backgroundImage || '/placeholder.svg'})`
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10" />
    <div className="relative z-20 text-white text-center px-4 max-w-5xl mx-auto">
      <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-4 leading-tight tracking-tight">
        {title?.split(" ")[0]}{" "}
        <span className="text-orange-400">{title?.split(" ").slice(1).join(" ")}</span>
      </h1>
      <p className="text-lg sm:text-xl md:text-2xl mb-10 max-w-3xl mx-auto">
        {subtitle}
      </p>
      {buttonText && (
        <a
          href={buttonLink || '/'}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
        >
          {buttonText}
        </a>
      )}
    </div>
  </section>
)

// Register the component with Builder.io
Builder.registerComponent(SampleHero, {
  name: 'Hero',
  inputs: [
    {
      name: 'title',
      type: 'string',
      defaultValue: 'Härnösands HF'
    },
    {
      name: 'subtitle', 
      type: 'string',
      defaultValue: 'Passion för handboll sedan 1934'
    },
    {
      name: 'buttonText',
      type: 'string', 
      defaultValue: 'Läs mer'
    },
    {
      name: 'buttonLink',
      type: 'string',
      defaultValue: '/lag'
    },
    {
      name: 'backgroundImage',
      type: 'file',
      allowedFileTypes: ['jpeg', 'jpg', 'png', 'svg'],
      defaultValue: '/placeholder.svg'
    }
  ]
})

export default function EditorPage() {
  const [builderContent, setBuilderContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBuilderContent() {
      try {
        // Initialize builder if not already done
        if (!builder.apiKey) {
          builder.init(process.env.NEXT_PUBLIC_BUILDER_PUBLIC_KEY || '')
        }

        // Fetch content from Builder.io "page" model
        const content = await builder
          .get('page', {
            // Use a sample page or create default content
            url: '/editor',
          })
          .toPromise()

        if (content) {
          setBuilderContent(content)
        } else {
          // Create sample content if none exists
          setBuilderContent({
            data: {
              blocks: [
                {
                  '@type': '@builder.io/sdk:Element',
                  component: {
                    name: 'Hero',
                    options: {
                      title: 'Härnösands HF',
                      subtitle: 'Passion för handboll sedan 1934',
                      buttonText: 'Läs mer',
                      buttonLink: '/lag',
                      backgroundImage: '/placeholder.svg'
                    }
                  }
                }
              ]
            }
          })
        }
      } catch (err) {
        console.error('Error loading Builder.io content:', err)
        setError('Failed to load content from Builder.io. Please check your BUILDER_PUBLIC_KEY.')
      } finally {
        setLoading(false)
      }
    }

    loadBuilderContent()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading Builder.io content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <div className="text-sm text-gray-500">
            Make sure BUILDER_PUBLIC_KEY environment variable is set correctly.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        {builderContent ? (
          <BuilderComponent 
            model="page" 
            content={builderContent}
          />
        ) : (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              No content found
            </h2>
            <p className="text-gray-600">
              Create content in Builder.io or check your configuration.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
