import { defaultContent } from "@/lib/default-content"
import NewsCard from "@/components/news-card" // Ensure this import is correct

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || "https://api.nuredo.se"

interface NewsItem {
  id: string
  title: string
  date: string
  imageUrl: string
  link: string
  description: string
}

async function getNewsContent(): Promise<NewsItem[]> {
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/news`, {
      next: { revalidate: 3600 },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    if (!res.ok) {
      console.error(`Failed to fetch news from backend: ${res.statusText}`)
      return Array.isArray(defaultContent.news) ? defaultContent.news : []
    }
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error("Error fetching news content:", err)
    return Array.isArray(defaultContent.news) ? defaultContent.news : []
  }
}

export default async function NewsPage() {
  const news = await getNewsContent()

  return (
    <div className="min-h-screen bg-gray-100 py-12 pt-24">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Senaste Nyheterna</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {Array.isArray(news) && news.length > 0 ? (
            news.map((item) => (
              <NewsCard
                key={item.id}
                title={item.title}
                date={item.date}
                imageUrl={item.imageUrl}
                link={item.link}
                description={item.description}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-600">
              <p>Inga nyheter tillgängliga just nu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
