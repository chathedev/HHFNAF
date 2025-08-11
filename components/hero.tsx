import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import type { HeroContent } from "@/lib/content-types"

interface HeroProps {
  content: HeroContent
}

export default function Hero({ content }: HeroProps) {
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <Image
        src={content.imageUrl || "/placeholder.svg"}
        alt="Härnösands HF Team"
        fill
        quality={85}
        priority
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        sizes="100vw"
        className="object-cover z-0"
      />
      {/* Enhanced overlay for better text contrast and visual depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent z-10" />
      <div className="relative z-20 text-white text-center px-4 max-w-5xl mx-auto">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-4 leading-tight tracking-tight animate-fade-in-up text-shadow-outline">
          {content.title.split(" ")[0]}{" "}
          <span className="text-orange-400">{content.title.split(" ").slice(1).join(" ")}</span>
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl mb-10 max-w-3xl mx-auto animate-fade-in-up delay-200 text-shadow-md">
          {content.description}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6 animate-fade-in-up delay-400">
          <Button
            asChild
            className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-orange-300"
          >
            <Link href={content.button1Link}>
              {content.button1Text}
              <ArrowRight className="ml-3 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            className="bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-full text-lg font-semibold shadow-lg transition-transform duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
          >
            <Link href={content.button2Link}>{content.button2Text}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
