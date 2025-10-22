"use client"

import { useEffect } from "react"
import { Instagram } from "lucide-react"

export function InstagramFeed() {
  useEffect(() => {
    // Load LightWidget script
    const script = document.createElement("script")
    script.src = "https://cdn.lightwidget.com/widgets/lightwidget.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      // Cleanup script on unmount
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Följ oss på <span className="text-pink-600">Instagram</span>
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-4">
            Håll dig uppdaterad med det senaste från Härnösands HF
          </p>
          
          {/* Instagram Button */}
          <a
            href="https://www.instagram.com/harnosandshf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
          >
            <Instagram className="w-5 h-5" />
            Följ @harnosandshf
          </a>
        </div>

        {/* LightWidget Instagram Feed */}
        <div className="max-w-5xl mx-auto">
          <iframe
            src="//lightwidget.com/widgets/8042886d86fb524b8201902c162a4f81.html"
            scrolling="no"
            allowTransparency={true}
            className="lightwidget-widget w-full border-0 overflow-hidden rounded-lg"
            style={{ width: "100%", border: 0, overflow: "hidden" }}
          />
        </div>
      </div>
    </section>
  )
}
