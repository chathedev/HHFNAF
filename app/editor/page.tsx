"use client"

import { useState, useEffect } from "react"
import { BuilderComponent, builder, useIsPreviewing } from "@builder.io/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Initialize Builder
builder.init(process.env.NEXT_PUBLIC_BUILDER_API_KEY || "cc46ebc207de40988f71591e1bf1e1c2")

// Register custom components for Builder
builder.register("insertMenu", {
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
})

// Custom Hero component that Builder can render
const HeroSection = ({ title, subtitle, backgroundImage, primaryButtonText, primaryButtonLink, secondaryButtonText, secondaryButtonLink }: any) => (
  <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
    <img
      src={backgroundImage || "/placeholder.svg"}
      alt="Hero Background"
      className="absolute inset-0 w-full h-full object-cover z-0"
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
      <div className="flex flex-col sm:flex-row justify-center gap-6">
        <Button
          asChild
          className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
        >
          <a href={primaryButtonLink}>
            {primaryButtonText}
          </a>
        </Button>
        <Button
          asChild
          className="bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105"
        >
          <a href={secondaryButtonLink}>{secondaryButtonText}</a>
        </Button>
      </div>
    </div>
  </section>
)

// Register the Hero component with Builder
builder.registerComponent(HeroSection, {
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
})

function PasswordPrompt({ onLogin }: { onLogin: (password: string) => void }) {
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin(password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Editor Access</CardTitle>
          <CardDescription>
            Enter the editor password to access the Builder.io visual editor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter editor password"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Access Editor
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EditorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const isPreviewing = useIsPreviewing()

  useEffect(() => {
    // Check if user is already authenticated
    const auth = sessionStorage.getItem("editor-auth")
    if (auth === "true") {
      setIsAuthenticated(true)
    }
    setAuthChecked(true)
  }, [])

  useEffect(() => {
    if (isAuthenticated || isPreviewing) {
      // Load content from Builder.io
      builder
        .get("page", {
          userAttributes: {
            urlPath: "/editor"
          }
        })
        .toPromise()
        .then((content) => {
          setContent(content)
          setLoading(false)
        })
        .catch((error) => {
          console.error("Error loading content:", error)
          setLoading(false)
        })
    }
  }, [isAuthenticated, isPreviewing])

  const handleLogin = (password: string) => {
    const correctPassword = process.env.NEXT_PUBLIC_EDITOR_PASS || "editor123"
    
    if (password === correctPassword) {
      setIsAuthenticated(true)
      sessionStorage.setItem("editor-auth", "true")
    } else {
      alert("Incorrect password")
    }
  }

  // If we're in Builder's preview mode, skip auth
  if (isPreviewing) {
    return (
      <BuilderComponent 
        model="page" 
        content={content} 
        options={{ includeRefs: true }}
      />
    )
  }

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <PasswordPrompt onLogin={handleLogin} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading Builder.io editor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {content ? (
        <BuilderComponent 
          model="page" 
          content={content}
          options={{ includeRefs: true }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
          <div className="text-center max-w-2xl">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Builder.io Visual Editor
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              No content found. Create your first page in the Builder.io dashboard.
            </p>
            <div className="space-y-4 text-left">
              <h2 className="text-xl font-semibold">Next Steps:</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Go to <a href="https://builder.io" className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">builder.io</a> and log into your account</li>
                <li>Create a new "Page" model</li>
                <li>Set the URL to "/editor"</li>
                <li>Add content and publish</li>
                <li>Refresh this page to see your content</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
