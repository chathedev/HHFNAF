import type { Metadata } from "next"
import Link from "@/components/quiet-link"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import { EmptyNote, Figures, OutcomeChip, PageHeader, Section } from "@/components/scout/ui"
import { guessPair, guessVerdict, matchDate, pct, prob, realVenueLabel, scoutFetch, seasonLabel, updatedLabel, VERDICT_CLASS, type RegisterPayload } from "@/lib/scout"

export const revalidate = 60

export const metadata: Metadata = {
  title: "HHF Scout – register: gissning mot resultat",
  description: "Varje spelad HHF-match med vad HHF Scout gissade före matchen och vad det blev.",
  alternates: { canonical: "https://www.harnosandshf.se/scout/register" },
}

const OUTCOME_WORD = { W: "vinst", D: "oavgjort", L: "förlust" } as const

export default async function ScoutRegisterPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { season } = await searchParams
  const previous = season === "previous"
  let data: RegisterPayload | null = null
  let failed = false
  try {
    data = await scoutFetch<RegisterPayload>(previous ? "/register?season=previous" : "/register")
  } catch {
    failed = true
  }
  const s = data?.summary
  // How many guesses were within 3 goals of the real goal difference (with the right outcome).
  const close = data ? data.matches.filter((m) => guessVerdict(guessPair(m.register.expUs, m.register.expThem, m.register.guessed), m.register.guessed, m.register.us, m.register.them).tone === "good").length : 0

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="h-24" />
        <div className="container mx-auto max-w-4xl px-4 pb-14 pt-4">
          <PageHeader
            back={{ href: "/scout", label: "HHF Scout" }}
            title="Register"
            sub="Varje spelad HHF-match: vad vi gissade före matchen och vad det blev. Gissningen är det ungefärliga resultatet och vinstchansen som visades innan avkast."
          />

          {failed && <EmptyNote>Registret kunde inte hämtas just nu. Försök igen om en stund.</EmptyNote>}
          {!failed && !data && <EmptyNote>Registret byggs – kom tillbaka om en stund.</EmptyNote>}

          {data && s && (
            <div className="space-y-10">
              <div className="flex gap-4 text-sm">
                <Link href="/scout/register" className={previous ? "text-slate-500 hover:text-slate-900" : "font-semibold text-slate-950"}>
                  {seasonLabel(data.currentSeason)}
                </Link>
                {data.previousSeason && (
                  <Link href="/scout/register?season=previous" className={previous ? "font-semibold text-slate-950" : "text-slate-500 hover:text-slate-900"}>
                    {seasonLabel(data.previousSeason)}
                  </Link>
                )}
              </div>

              <Figures
                items={[
                  { label: "Matcher", value: s.n },
                  { label: "Rätt vinnare", value: pct(s.accuracy), sub: `${s.hits} av ${s.n}` },
                  { label: "Miss i målskillnad", value: s.meanMarginError != null ? `${String(s.meanMarginError).replace(".", ",")} mål` : "–", sub: `i snitt · ${close} av ${s.n} rätt och inom 3 mål` },
                  { label: "Sparade före avkast", value: s.saved, sub: s.saved < s.n ? "resten räknade i efterhand" : "alla" },
                ]}
              />

              {data.byTeam.length > 1 && (
                <Section title="Per lag">
                  <ul>
                    {data.byTeam.map((t) => (
                      <li key={t.label} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-sm">
                        <span className="font-semibold text-slate-950">{t.label}</span>
                        <span className="tabular-nums text-slate-600">
                          {t.hits} av {t.n} rätt vinnare · {pct(t.accuracy)}
                          {t.meanMarginError != null ? ` · miss ${String(t.meanMarginError).replace(".", ",")} mål` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              <Section title="Match för match" note="Siffrorna är sedda från HHF:s håll. Rätt betyder att den utgång vi trodde mest på (vinst, oavgjort eller förlust) blev verklighet och att målskillnaden var högst 3 mål fel. Rätt vinnare betyder att utgången stämde men målskillnaden var längre ifrån.">
                {data.matches.length ? (
                  <ul>
                    {data.matches.map((m) => {
                      const r = m.register
                      const side = m.hhfSide === "away" ? "away" : "home"
                      const opp = side === "away" ? m.home : m.away
                      const guessP = r.guessed === "W" ? r.pWin : r.guessed === "L" ? r.pLoss : r.pDraw
                      const guess = guessPair(r.expUs, r.expThem, r.guessed)
                      const verdict = guessVerdict(guess, r.guessed, r.us, r.them)
                      const where = m.home.isHhf && m.away.isHhf ? "mot " : realVenueLabel(m, side) === "borta" ? "borta mot " : "mot "
                      return (
                        <li key={m.id}>
                          <Link href={`/scout/match/${m.id}`} className="flex items-center gap-3 border-b border-slate-200 py-3 transition hover:bg-slate-50 sm:gap-4">
                            <div className="min-w-0 flex-1">
                              {m.teamType ? <p className="truncate text-[11px] font-medium text-slate-400">{m.teamType}</p> : null}
                              <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-950 sm:text-[15px]">
                                <span className="font-normal text-slate-400">{where}</span>
                                {opp.name}
                              </p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 sm:truncate">
                                {matchDate(m)}
                                {m.time ? ` ${m.time}` : ""}
                                {m.category ? ` · ${m.category.name}` : ""}
                                {r.source === "backtest" ? " · räknad i efterhand" : ""}
                              </p>
                            </div>
                            <div className="w-[4.5rem] shrink-0 text-right sm:w-32">
                              <p className="text-[11px] text-slate-400">Gissning</p>
                              <p className="text-sm font-semibold tabular-nums text-slate-700">
                                {guess.join("–")}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {OUTCOME_WORD[r.guessed]} {prob(guessP)}
                              </p>
                            </div>
                            <div className="w-[5.5rem] shrink-0 text-right sm:w-28">
                              <p className="text-[11px] text-slate-400">Resultat</p>
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-lg font-black tabular-nums text-slate-900">
                                  {r.us}–{r.them}
                                </span>
                                <OutcomeChip outcome={r.actual} />
                              </div>
                              <p className="text-[11px] leading-tight text-slate-500">
                                <span className={VERDICT_CLASS[verdict.tone]}>{verdict.label}</span>
                                <span className="block">{verdict.detail}</span>
                              </p>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="py-4 text-sm text-slate-500">Inga spelade matcher med gissning än.</p>
                )}
              </Section>

              <p className="text-xs text-slate-400">
                Från och med 24 oktober 2026 sparas gissningen som den såg ut före avkast. Äldre matcher är räknade i efterhand med samma modell, där den bara fick se matcher
                spelade innan. Data från Profixio · uppdaterad {updatedLabel(data.generatedAt)} · <Link href="/scout#uppgifter" className="underline underline-offset-2 hover:text-slate-600">Om uppgifterna</Link>
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
