import SaveAsPdfButton from "@/components/save-as-pdf-button"

export const metadata = {
  title: "Insläpp vid match (Clubmate) | Härnösands HF",
  description: "Snabbguide för hur du släpper in och säljer biljetter via Clubmate vid match.",
}

export default function ClubmateCheckinPage() {
  return (
    <main id="clubmate-print" className="min-h-screen bg-gray-50 py-12 text-gray-900">
      <section>
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto space-y-10">
              <header className="space-y-4 text-center">
                <p className="text-sm uppercase tracking-widest text-orange-500">Matchdag</p>
                <h1 className="text-4xl font-extrabold">Insläpp vid match (Clubmate)</h1>
                <p className="text-lg text-gray-600">
                  Så här funkar det nya systemet när vi släpper in folk på match. Följ stegen.
                </p>
                <div className="flex flex-col items-center justify-center gap-2 pt-2">
                  <SaveAsPdfButton />
                  <p className="text-xs text-gray-500">Knappen öppnar utskriftsdialogen så att du kan spara som PDF.</p>
                </div>
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
                    <span className="text-3xl" aria-hidden="true">🎟️</span>
                    Biljetter
                  </h2>
                  <div className="mt-4 space-y-6 text-gray-700">
                    <div>
                      <h3 className="font-semibold text-gray-800">Förköpta biljetter och säsongskort</h3>
                      <ul className="mt-2 space-y-2">
                        <li>Klicka på Evenemang (mitten-ikonen i nedersta menyraden).</li>
                        <li>Välj rätt match (oftast första i listan, men dubbelkolla).</li>
                        <li>Klicka på Skanning och starta scannern.</li>
                        <li>Scanna biljetten → grönt innebär att personen är inne.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Köp på plats via Sälj-knappen</h3>
                      <ul className="mt-2 space-y-2">
                        <li>Klicka på Evenemang och välj matchen.</li>
                        <li>Öppna Sälj → Kassa (eller Sälj) och välj biljettkategori samt antal.</li>
                        <li>Klicka på Ta betalt och låt besökaren betala i sin Swish-app.</li>
                        <li>När betalningen är klar checkas biljetten in automatiskt. Scanna inte biljetten manuellt, även om det inte står uttryckligen i listan.</li>
                      </ul>
                    </div>
                    <p className="text-sm text-gray-600">
                      Biljetter kan även köpas i förväg via hemsidan och via Sälj-knappen på eventet. Försäljningen stängs
                      automatiskt 1 timme och 15 minuter efter matchstart.
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-3 text-xl font-semibold">
                    <span className="text-3xl" aria-hidden="true">🎉</span>
                    Lotter
                  </h2>
                  <div className="mt-4 space-y-2 text-gray-700">
                    <p>
                      Varje match har en egen lottsida. På plats finns en QR-kod som leder direkt till den sidan och
                      används endast för lotter. Samma lott kan även köpas i förväg via hemsidan.
                    </p>
                    <ul className="space-y-2">
                      <li>Alla lottköp kopplas automatiskt till rätt match och är inte återbetalningsbara.</li>
                      <li>Dragningen sker automatiskt 1 timme och 15 minuter efter matchstart. Vinnare får besked direkt och kan hämta ut sin vinst.</li>
                      <li>Sekretariatet kan ropa ut vinnande nummer om man vill, men det är helt valfritt.</li>
                      <li>All hantering sker i systemet, så inga manuella listor behövs.</li>
                    </ul>
                  </div>
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
                    <li>Ha lotternas QR-kod redo så att besökare snabbt kan köpa via sina telefoner.</li>
                  </ul>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h2 className="flex items-center gap-3 text-xl font-semibold">
                    <span className="text-3xl" aria-hidden="true">⚠️</span>
                    Viktigt att veta
                  </h2>
                  <ul className="mt-4 space-y-2 text-gray-700">
                    <li>Det finns inga QR-koder för biljetter vid entrén, men lottförsäljningen har en egen QR-kod.</li>
                    <li>Förklara att allt är automatiserat: förköpta biljetter scannas, biljetter som säljs på plats checkas in via Swish.</li>
                    <li>Skanna aldrig biljetter som sålts på plats – de är redan incheckade.</li>
                    <li>
                      Några (cirka 7 personer) har köpt säsongskort på plats – deras kort kan visas som ogiltig biljett,
                      men de ska ändå släppas in.
                    </li>
                    <li>Om något fel uppstår → vänta lite och försök igen.</li>
                    <li>Biljett- och lottsförsäljning stängs automatiskt 1 timme och 15 minuter efter matchstart.</li>
                    <li>Håll koll – vissa kan försöka smita in.</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
      </section>
    </main>
  )
}
