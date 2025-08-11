export function HeroSkeleton() {
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-gray-200 animate-pulse">
      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
        <div className="h-16 bg-gray-300 rounded-lg mb-4 animate-pulse"></div>
        <div className="h-6 bg-gray-300 rounded-lg max-w-3xl mx-auto mb-10 animate-pulse"></div>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <div className="h-12 w-48 bg-gray-300 rounded-full animate-pulse"></div>
          <div className="h-12 w-48 bg-gray-300 rounded-full animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}

export function StatsSkeleton() {
  return (
    <section className="bg-gray-300 text-white py-12 animate-pulse">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-12 h-12 bg-gray-400 rounded mb-2"></div>
              <div className="h-8 w-16 bg-gray-400 rounded mb-1"></div>
              <div className="h-4 w-20 bg-gray-400 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function UpcomingEventsSkeleton() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-2xl mx-auto animate-pulse">
          <div className="p-6 flex flex-col items-center text-center border-b border-gray-200">
            <div className="w-16 h-16 bg-gray-300 rounded mb-4"></div>
            <div className="h-8 w-64 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 w-48 bg-gray-300 rounded"></div>
          </div>
          <div className="p-6">
            <div className="space-y-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="w-6 h-6 bg-gray-300 rounded"></div>
                  <div className="flex-grow">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 w-24 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <div className="h-12 w-48 bg-gray-300 rounded-md mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function AboutClubSkeleton() {
  return (
    <section className="py-16 bg-white animate-pulse">
      <div className="container mx-auto px-4">
        <div className="h-10 w-64 bg-gray-300 rounded mb-8 mx-auto"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
          </div>
          <div className="relative h-64 bg-gray-300 rounded-lg"></div>
        </div>
      </div>
    </section>
  )
}

export function PartnersCarouselSkeleton() {
  return (
    <section className="py-16 bg-gray-50 animate-pulse">
      <div className="container mx-auto px-4">
        <div className="h-10 w-64 bg-gray-300 rounded mb-2 mx-auto"></div>
        <div className="h-4 w-96 bg-gray-300 rounded mb-12 mx-auto"></div>
        
        <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="mb-8 border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center mb-4">
                <div className="h-8 w-48 bg-gray-300 rounded"></div>
                <div className="w-6 h-6 bg-gray-300 rounded"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="h-36 bg-gray-300 rounded-lg"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LoadingSkeleton() {
  return (
    <div>
      <HeroSkeleton />
      <StatsSkeleton />
      <UpcomingEventsSkeleton />
      <AboutClubSkeleton />
      <PartnersCarouselSkeleton />
    </div>
  )
}
