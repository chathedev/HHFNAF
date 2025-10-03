"use client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { Ticket, Calendar, MapPin, Clock, ExternalLink } from "lucide-react"

export default function KopBiljettPage() {
  return (
    <div className="bg-white min-h-screen">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-green-500 to-green-700 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <Ticket className="w-16 h-16 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Köp Biljetter</h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Kom och upplev spännande handbollsmatcher med Härnösands HF! Köp dina biljetter enkelt online via
              Clubmate.
            </p>
            <Button
              asChild
              className="bg-white text-green-700 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-md inline-flex items-center gap-2"
            >
              <a href="https://clubs.clubmate.se/harnosandshf/" target="_blank" rel="noopener noreferrer">
                Köp Biljetter Nu
                <ExternalLink className="w-5 h-5" />
              </a>
            </Button>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-green-700 mb-8">Enkelt & Smidigt via Clubmate</h2>
              <p className="text-lg text-gray-700 mb-12 max-w-2xl mx-auto">
                Vi har gjort det enkelt för dig att köpa biljetter till våra matcher. Genom vår partner Clubmate kan du
                nu köpa biljetter direkt online med säker betalning.
              </p>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <Card className="p-6 text-center bg-green-50 border-green-200">
                  <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3 text-gray-800">Alla Matcher</h3>
                  <p className="text-gray-600">Köp biljetter till alla våra hemmamatcher under säsongen</p>
                </Card>

                <Card className="p-6 text-center bg-orange-50 border-orange-200">
                  <MapPin className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3 text-gray-800">Säker Betalning</h3>
                  <p className="text-gray-600">Betala säkert med kort eller Swish via Clubmate</p>
                </Card>

                <Card className="p-6 text-center bg-green-50 border-green-200">
                  <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-3 text-gray-800">24/7 Tillgängligt</h3>
                  <p className="text-gray-600">Köp dina biljetter när det passar dig bäst</p>
                </Card>
              </div>

              <Button
                asChild
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-md inline-flex items-center gap-2"
              >
                <a href="https://clubs.clubmate.se/harnosandshf/overview/" target="_blank" rel="noopener noreferrer">
                  Köp Biljetter via Clubmate
                  <ExternalLink className="w-5 h-5" />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 bg-green-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-green-700 mb-8">Så här fungerar det</h2>
              <p className="text-lg text-gray-700 mb-8">
                Genom att klicka på knappen ovan kommer du till vår officiella biljettpartner Clubmate där du enkelt kan
                köpa biljetter till våra matcher. Du kan betala med kort eller Swish och få din biljett direkt på mejl.
              </p>

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button
                  asChild
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg inline-flex items-center gap-2"
                >
                  <a href="https://clubs.clubmate.se/harnosandshf/" target="_blank" rel="noopener noreferrer">
                    Köp Biljetter Nu
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
                <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg">
                  <a href="/kontakt">Kontakta Oss</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
