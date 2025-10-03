import { Header } from "@/components/header"
import Footer from "@/components/footer"

export const metadata = {
  title: "Insläpp vid match (Clubmate) | Härnösands HF",
  description: "Snabbguide för hur du släpper in och säljer biljetter via Clubmate vid match.",
}

export default function ClubmateCheckinPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-gray-50 text-gray-900">
        <div className="h-24" />
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-10">
              <header className="space-y-4 text-center">
                <p className="text-sm uppercase tracking-widest text-orange-500">Matchdag</p>
                <h1 className="text-4xl font-extrabold">Insläpp vid match (Clubmate)</h1>
                <p className="text-lg text-gray-600">
                  Så här funkar det nya systemet när vi släpper in folk på match. Följ stegen.
                </p>
              </header>

              <div className="grid gap-6">
                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-3 text-xl font-semibold">
                    <span className="text-3xl" aria-hidden="true">🔑</span>
                    Logga in först
                  </h2>
                  <p className="mt-4 text-gray-700">
                    Gå in på admin.clubmate.se eller öppna Clubmate-appen. Logga in med uppgifterna nedan.
                  </p>
                  <div className="mt-6 rounded-xl bg-gray-50 p-5 text-sm">
                    <p className="font-semibold text-gray-800">Inloggning</p>
                    <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr]">
                      <span className="text-gray-500">E-post:</span>
                      <span className="font-medium">salj.harnosandshf</span>
                      <span className="text-gray-500">Lösenord:</span>
                      <span className="font-medium">Tru8Keza</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-3 text-xl font-semibold">
                    <span className="text-3xl" aria-hidden="true">✅</span>
                    Om personen redan har biljett eller säsongskort
                  </h2>
                  <ul className="mt-4 space-y-2 text-gray-700">
                    <li>Klicka på Evenemang (mitten-ikonen i nedersta menyraden).</li>
                    <li>Välj rätt match (oftast första i listan, men dubbelkolla).</li>
                    <li>Klicka på Skanning.</li>
                    <li>Starta scannern och scanna biljetten → grönt = personen är inne.</li>
                  </ul>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-3 text-xl font-semibold">
                    <span className="text-3xl" aria-hidden="true">💳</span>
                    Om personen vill köpa biljett på plats
                  </h2>
                  <ul className="mt-4 space-y-2 text-gray-700">
                    <li>Klicka på Evenemang (mitten-ikonen längst ner).</li>
                    <li>Välj rätt match.</li>
                    <li>Klicka på Sälj – Kassa (eller Sälj).</li>
                    <li>Välj biljettkategori (vuxen, ungdom osv.) och antal.</li>
                    <li>Klicka på Ta betalt.</li>
                    <li>
                      Personen öppnar sin Swish-app och betalar (inte via mobilkameran). När betalningen är klar blir
                      personen automatiskt incheckad och kan gå in.
                    </li>
                  </ul>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-3 text-xl font-semibold">
                    <span className="text-3xl" aria-hidden="true">👥</span>
                    Tips för smidigare insläpp
                  </h2>
                  <p className="mt-4 text-gray-700">
                    Det går med en person, men snabbast om man är två:
                  </p>
                  <ul className="mt-2 space-y-2 text-gray-700">
                    <li>En skannar biljetter.</li>
                    <li>En säljer via Swish.</li>
                  </ul>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-3 text-xl font-semibold">
                    <span className="text-3xl" aria-hidden="true">⚠️</span>
                    Viktigt att veta
                  </h2>
                  <ul className="mt-4 space-y-2 text-gray-700">
                    <li>Det finns inga QR-koder vid entrén längre.</li>
                    <li>
                      Förklara att det nya systemet är: Förköpta biljetter = scannas. På plats = köps via Swish direkt i
                      systemet.
                    </li>
                    <li>Om något fel uppstår → vänta lite och försök igen.</li>
                    <li>Håll koll – vissa kan försöka smita in.</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
