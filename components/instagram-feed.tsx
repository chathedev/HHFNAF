"use client"

import { useState, useEffect } from "react"
import { Instagram, ExternalLink, Heart, MessageCircle } from "lucide-react"
import Image from "next/image"

interface InstagramPost {
  id: string
  caption: string
  media_url: string
  media_type: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}

export function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Replace with your backend endpoint
    const fetchInstagramFeed = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Replace this URL with your actual backend endpoint
        const response = await fetch('/api/instagram-feed')
        
        if (!response.ok) {
          throw new Error('Failed to fetch Instagram feed')
        }
        
        const data = await response.json()
        setPosts(data)
      } catch (err) {
        console.error('Error fetching Instagram feed:', err)
        setError('Could not load Instagram feed')
      } finally {
        setLoading(false)
      }
    }

    fetchInstagramFeed()
  }, [])

  if (loading) {
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
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
        </div>
      </section>
    )
  }

  if (posts.length === 0) {
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
        </div>
      </section>
    )
  }

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

        {/* Instagram Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-pink-300 transition-all duration-200 hover:shadow-lg"
            >
              {/* Image */}
              <div className="relative w-full h-full">
                <Image
                  src={post.media_url}
                  alt={post.caption || 'Instagram post'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-white text-sm font-medium mb-2">
                    {post.like_count !== undefined && (
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 fill-white" />
                        <span>{post.like_count}</span>
                      </div>
                    )}
                    {post.comments_count !== undefined && (
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments_count}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Caption Preview */}
                  {post.caption && (
                    <p className="text-white text-xs line-clamp-2">
                      {post.caption}
                    </p>
                  )}
                </div>

                {/* External Link Icon */}
                <div className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <ExternalLink className="w-4 h-4 text-gray-700" />
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* View More Link */}
        <div className="text-center mt-6">
          <a
            href="https://www.instagram.com/harnosandshf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-pink-600 hover:text-pink-700 font-medium text-sm hover:underline"
          >
            Se alla inlägg på Instagram
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  )
}
