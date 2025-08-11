"use client"

import { useRef, useEffect, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FastLazyWrapperProps {
  children: ReactNode
  className?: string
  priority?: boolean // For above-fold content
  threshold?: number
  rootMargin?: string
}

export default function FastLazyWrapper({ 
  children, 
  className, 
  priority = false,
  threshold = 0.1,
  rootMargin = "50px"
}: FastLazyWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(priority) // Priority content starts visible
  const [hasLoaded, setHasLoaded] = useState(priority)

  useEffect(() => {
    if (priority) return // Skip observer for priority content
    
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setHasLoaded(true)
          // Immediate visibility for fast loading
          requestAnimationFrame(() => {
            setIsVisible(true)
          })
          observer.unobserve(element)
        }
      },
      {
        threshold,
        rootMargin,
      }
    )

    observer.observe(element)
    
    return () => observer.disconnect()
  }, [priority, hasLoaded, threshold, rootMargin])

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-500 ease-out",
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-8",
        className
      )}
      style={{
        minHeight: hasLoaded ? 'auto' : '200px', // Reserve space to prevent layout shift
      }}
    >
      {hasLoaded ? children : null}
    </div>
  )
}
