"use client"

import { useEffect } from "react"

export function InstagramFeed() {
  useEffect(() => {
    // Load EmbedSocial script
    const scriptId = "EmbedSocialHashtagScript"
    
    // Check if script already exists
    if (document.getElementById(scriptId)) {
      return
    }

    const script = document.createElement("script")
    script.id = scriptId
    script.src = "https://embedsocial.com/cdn/ht.js"
    script.async = true
    document.getElementsByTagName("head")[0].appendChild(script)

    return () => {
      // Cleanup script on unmount
      const existingScript = document.getElementById(scriptId)
      if (existingScript && document.head.contains(existingScript)) {
        document.head.removeChild(existingScript)
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
        </div>

        {/* EmbedSocial Instagram Feed */}
        <div className="max-w-5xl mx-auto">
          <div
            className="embedsocial-hashtag"
            data-ref="82ce9aea0e3486c020abad8f40d096962fb8ec59"
          >
            <a
              className="feed-powered-by-es feed-powered-by-es-feed-img es-widget-branding"
              href="https://embedsocial.com/social-media-aggregator/"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram widget"
            >
              <img
                src="https://embedsocial.com/cdn/icon/embedsocial-logo.webp"
                alt="EmbedSocial"
              />
              <div className="es-widget-branding-text">Instagram widget</div>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
