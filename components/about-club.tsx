"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, TrendingUp, Users } from "lucide-react"
import type { AboutClubContent } from "@/lib/content-types"

interface AboutClubProps {
  content: AboutClubContent
}

export default function AboutClub({ content }: AboutClubProps) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-green-600 mb-2">{content.title}</h2>

            <p className="text-gray-700 mb-6">{content.paragraph1}</p>

            <p className="text-gray-700 mb-8">{content.paragraph2}</p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <Heart className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Passion</h4>
                <p className="text-xs text-gray-600">{content.passionText}</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Utveckling</h4>
                <p className="text-xs text-gray-600">{content.developmentText}</p>
              </div>

              <div className="border border-gray-200 rounded-lg p-4 text-center">
                <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-medium mb-1">Gemenskap</h4>
                <p className="text-xs text-gray-600">{content.communityText}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link
                href={content.button1Link}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                {content.button1Text}
              </Link>
              <Link
                href={content.button2Link}
                className="bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-2 rounded-md font-medium transition-colors"
              >
                {content.button2Text}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl">
              <Image
                src={content.imageSrc || "/placeholder.svg"}
                alt={content.imageAlt}
                fill
                loading="lazy"
                quality={80}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>

            <div className="absolute -top-4 -right-4 bg-orange-500 text-white rounded-lg p-4 shadow-lg">
              <div className="text-3xl font-bold">{content.statNumber}</div>
              <div className="text-sm">{content.statLabel}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
