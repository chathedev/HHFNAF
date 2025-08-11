"use client"

import { useState, useEffect } from "react"

interface OptimizedLoaderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  delay?: number
}

export default function OptimizedLoader({ 
  children, 
  fallback = <div className="animate-pulse bg-gray-200 h-32 rounded" />,
  delay = 0 
}: OptimizedLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  if (!isLoaded) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
