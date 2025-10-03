"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Save, Monitor, Tablet, Smartphone, Loader2, RefreshCw, ChevronDown, ChevronRight, LogOut } from "lucide-react"

const HOME_PAGE = { name: "home", displayName: "Hem", path: "/" }

const VIEWPORTS = {
  desktop: { width: "100%", height: "100%", icon: Monitor },
  tablet: { width: "768px", height: "1024px", icon: Tablet },
  mobile: { width: "375px", height: "667px", icon: Smartphone },
}

export default function EditorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [currentPage] = useState(HOME_PAGE)
  const [viewport, setViewport] = useState<keyof typeof VIEWPORTS>("desktop")
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [content, setContent] = useState<any>({})
  const [originalContent, setOriginalContent] = useState<any>({})
  const [iframeSrc, setIframeSrc] = useState("")
  const [expandedSections, setExpandedSections] = useState<string[]>(["hero"])
  const [hasChanges, setHasChanges] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Check if already authenticated
    checkAuthStatus()
  }, [])

  useEffect(() => {
    if (isAuthenticated && typeof window !== "undefined") {
      setIframeSrc(`${window.location.origin}${currentPage.path}?editor=true&t=${Date.now()}`)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      loadContent()
    }
  }, [isAuthenticated])

  useEffect(() => {
    const currentContent = content[currentPage.name]
    const originalContentForPage = originalContent[currentPage.name]

    if (currentContent && originalContentForPage) {
      const hasContentChanged = JSON.stringify(currentContent) !== JSON.stringify(originalContentForPage)
      setHasChanges(hasContentChanged)
    } else {
      setHasChanges(false)
    }
  }, [content, originalContent, currentPage.name])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/check", {
        credentials: "include",
      })
      if (response.ok) {
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.log("Not authenticated")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      })

      if (response.ok) {
        setIsAuthenticated(true)
        toast({
          title: "✅ Login Successful",
          description: "Welcome to the editor!",
          className: "bg-green-500 text-white",
        })
      } else {
        const error = await response.json()
        toast({
          title: "❌ Login Failed",
          description: error.error || "Invalid credentials",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Login Error",
        description: "Failed to authenticate",
        variant: "destructive",
      })
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      setIsAuthenticated(false)
      setEmail("")
      setPassword("")
      toast({
        title: "✅ Logged Out",
        description: "You have been logged out successfully",
        className: "bg-blue-500 text-white",
      })
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const loadContent = async () => {
    try {
      const response = await fetch(`/content/${currentPage.name}.json`)
      if (response.ok) {
        const data = await response.json()
        setContent((prev) => ({ ...prev, [currentPage.name]: data }))
        setOriginalContent((prev) => ({ ...prev, [currentPage.name]: JSON.parse(JSON.stringify(data)) }))
      }
    } catch (error) {
      console.error("Failed to load content:", error)
    }
  }

  const saveContent = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/github-commit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: `public/content/${currentPage.name}.json`,
          content: JSON.stringify(content[currentPage.name], null, 2),
          message: `Update ${currentPage.displayName} content via editor`,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to save ${currentPage.name}`)
      }

      setOriginalContent((prev) => ({
        ...prev,
        [currentPage.name]: JSON.parse(JSON.stringify(content[currentPage.name])),
      }))

      toast({
        title: "✅ Changes Committed to GitHub",
        description: `${currentPage.displayName} updated and pushed to repository`,
        className: "bg-green-500 text-white",
      })

      refreshPreview()
    } catch (error) {
      console.error("Save error:", error)
      toast({
        title: "❌ GitHub Commit Failed",
        description: "Failed to commit changes to repository",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const refreshPreview = () => {
    setIsRefreshing(true)
    if (iframeRef.current && typeof window !== "undefined") {
      const newSrc = `${window.location.origin}${currentPage.path}?editor=true&t=${Date.now()}`
      setIframeSrc(newSrc)
      setTimeout(() => setIsRefreshing(false), 1000)
    }
  }

  const updateContentField = (fieldPath: string, value: string) => {
    const keys = fieldPath.split(".")
    const pageKey = keys[0]
    const fieldKeys = keys.slice(1)

    const newContent = JSON.parse(JSON.stringify(content))

    if (!newContent[pageKey]) newContent[pageKey] = {}
    let current = newContent[pageKey]

    for (let i = 0; i < fieldKeys.length - 1; i++) {
      if (!current[fieldKeys[i]]) current[fieldKeys[i]] = {}
      current = current[fieldKeys[i]]
    }

    current[fieldKeys[fieldKeys.length - 1]] = value
    setContent(newContent)
  }

  const getFieldValue = (fieldPath: string): string => {
    const keys = fieldPath.split(".")
    const pageKey = keys[0]
    const fieldKeys = keys.slice(1)

    let current = content[pageKey]
    if (!current) return ""

    for (const key of fieldKeys) {
      current = current[key]
      if (current === undefined) return ""
    }

    return current || ""
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  const renderEditingFields = () => {
    const pageContent = content[currentPage.name]
    if (!pageContent) return null

    const sections = [
      {
        key: "hero",
        title: "Hero Section",
        fields: [
          { key: "title", label: "Title", type: "input" },
          { key: "description", label: "Description", type: "textarea" },
          { key: "imageUrl", label: "Hero Image URL", type: "input" },
          { key: "button1Text", label: "Primary Button Text", type: "input" },
          { key: "button1Link", label: "Primary Button Link", type: "input" },
          { key: "button2Text", label: "Secondary Button Text", type: "input" },
          { key: "button2Link", label: "Secondary Button Link", type: "input" },
        ],
      },
      {
        key: "stats",
        title: "Statistics",
        fields: [
          { key: "totalTeams", label: "Total Teams", type: "input" },
          { key: "aTeams", label: "A Teams", type: "input" },
          { key: "youthTeams", label: "Youth Teams", type: "input" },
          { key: "yearsHistory", label: "Years of History", type: "input" },
        ],
      },
      {
        key: "aboutClub",
        title: "About Club Section",
        fields: [
          { key: "title", label: "About Title", type: "input" },
          { key: "paragraph1", label: "First Paragraph", type: "textarea" },
          { key: "paragraph2", label: "Second Paragraph", type: "textarea" },
          { key: "passionText", label: "Passion Text", type: "input" },
          { key: "developmentText", label: "Development Text", type: "input" },
          { key: "communityText", label: "Community Text", type: "input" },
          { key: "imageSrc", label: "About Image URL", type: "input" },
          { key: "imageAlt", label: "Image Alt Text", type: "input" },
          { key: "button1Text", label: "First Button Text", type: "input" },
          { key: "button1Link", label: "First Button Link", type: "input" },
          { key: "button2Text", label: "Second Button Text", type: "input" },
          { key: "button2Link", label: "Second Button Link", type: "input" },
          { key: "statNumber", label: "Stat Number", type: "input" },
          { key: "statLabel", label: "Stat Label", type: "input" },
        ],
      },
      {
        key: "faq",
        title: "FAQ Section",
        fields: [],
      },
    ]

    return (
      <>
        {sections.map((section) => {
          const isExpanded = expandedSections.includes(section.key)
          const sectionData = pageContent[section.key]

          if (!sectionData && section.key !== "page" && section.key !== "api") return null

          return (
            <div key={section.key} className="border border-gray-200 rounded-lg mb-4">
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-t-lg"
              >
                <h3 className="font-semibold text-gray-800">{section.title}</h3>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isExpanded && (
                <div className="p-4 space-y-4">
                  {section.key === "faq" ? (
                    <div className="space-y-4">
                      {/* FAQ items array for home page */}
                      {Array.isArray(sectionData) &&
                        sectionData.map((faqItem: any, index: number) => (
                          <div key={index} className="border border-gray-100 rounded p-3">
                            <h4 className="font-medium text-gray-700 mb-2">FAQ Item {index + 1}</h4>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Question</label>
                                <Input
                                  value={faqItem.question || ""}
                                  onChange={(e) => {
                                    const newFaq = [...sectionData]
                                    newFaq[index] = { ...newFaq[index], question: e.target.value }
                                    setContent({ ...content, [currentPage.name]: { ...pageContent, faq: newFaq } })
                                  }}
                                  className="w-full text-black bg-white border border-gray-300"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Answer</label>
                                <Textarea
                                  value={faqItem.answer || ""}
                                  onChange={(e) => {
                                    const newFaq = [...sectionData]
                                    newFaq[index] = { ...newFaq[index], answer: e.target.value }
                                    setContent({ ...content, [currentPage.name]: { ...pageContent, faq: newFaq } })
                                  }}
                                  className="w-full text-black bg-white border border-gray-300"
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    section.fields.map((field) => {
                      const fieldPath =
                        section.key === "page"
                          ? `${currentPage.name}.${field.key}`
                          : `${currentPage.name}.${section.key}.${field.key}`
                      const value = getFieldValue(fieldPath)

                      return (
                        <div key={field.key}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                          {field.type === "textarea" ? (
                            <Textarea
                              value={value}
                              onChange={(e) => updateContentField(fieldPath, e.target.value)}
                              className="w-full text-black bg-white border border-gray-300"
                              rows={3}
                            />
                          ) : (
                            <Input
                              value={value}
                              onChange={(e) => updateContentField(fieldPath, e.target.value)}
                              className="w-full text-black bg-white border border-gray-300"
                              placeholder={
                                field.key.includes("Url") || field.key.includes("Src") ? "Enter image URL" : ""
                              }
                            />
                          )}
                          {(field.key.includes("Url") || field.key.includes("Src")) && value && (
                            <div className="mt-2">
                              <img
                                src={value || "/placeholder.svg"}
                                alt="Preview"
                                className="w-full max-w-xs h-auto rounded border"
                                onError={(e) => {
                                  console.error("Failed to load image:", value)
                                  ;(e.target as HTMLImageElement).src =
                                    "/placeholder.svg?height=200&width=300&text=Image+Not+Found"
                                }}
                                onLoad={() => {
                                  console.log("Successfully loaded image:", value)
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )
        })}
      </>
    )
  }

  // Login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Home Page Editor</h1>
            <p className="text-gray-600 mt-2">Enter your credentials to edit the home page</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-black bg-white border border-gray-300"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-black bg-white border border-gray-300"
                placeholder="Enter your password"
                required
              />
            </div>

            <Button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </div>
        <Toaster />
      </div>
    )
  }

  if (!iframeSrc) {
    return (
      <div className="h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading editor...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-800">Home Page Editor</h1>

          <div className="flex gap-1">
            {Object.entries(VIEWPORTS).map(([size, config]) => {
              const IconComponent = config.icon
              return (
                <Button
                  key={size}
                  size="sm"
                  variant={viewport === size ? "default" : "outline"}
                  onClick={() => setViewport(size as keyof typeof VIEWPORTS)}
                >
                  <IconComponent className="w-4 h-4" />
                </Button>
              )
            })}
          </div>

          <Button onClick={refreshPreview} disabled={isRefreshing} size="sm" variant="outline">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={saveContent}
            disabled={isSaving || !hasChanges}
            className={hasChanges ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isSaving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
          </Button>

          <Button onClick={handleLogout} size="sm" variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content - Two Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview Column */}
        <div className="flex-1 p-4 flex items-center justify-center bg-gray-50">
          <div
            className="bg-white rounded-lg shadow-xl overflow-hidden relative"
            style={{
              width: VIEWPORTS[viewport].width,
              height: VIEWPORTS[viewport].height,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            {isRefreshing && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Refreshing preview...</span>
                </div>
              </div>
            )}

            <iframe
              ref={iframeRef}
              src={iframeSrc}
              className="w-full h-full border-0"
              title={`Preview of ${currentPage.displayName}`}
              onLoad={() => setIsRefreshing(false)}
            />
          </div>
        </div>

        {/* Editing Panel */}
        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Edit Home Page</h2>

            {content[currentPage.name] ? (
              <div className="space-y-4">{renderEditingFields()}</div>
            ) : (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading content...
              </div>
            )}
          </div>
        </div>
      </div>

      <Toaster />
    </div>
  )
}
