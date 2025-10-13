"use client"

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Instagram, Search } from "lucide-react"

import Footer from "@/components/footer"
import { Header } from "@/components/header"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Individual = {
  name: string
  role?: string
  image?: string
}

type RawTeam = {
  name: string
  link?: string
  instagramLink?: string
  heroImage?: string
  heroImageAlt?: string
  description?: string
  individuals?: Individual[]
  [key: string]: unknown
}

type Team = {
  id: string
  name: string
  category: string
  link?: string
  instagramLink?: string
  heroImage?: string
  heroImageAlt?: string
  description?: string
  individuals: Individual[]
}

const PLACEHOLDER_HERO = "/placeholder.jpg"
const PLACEHOLDER_INDIVIDUAL = "/placeholder-user.jpg"

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const getTeamDescription = (team: RawTeam, categoryDescription?: string) => {
  if (typeof team.description === "string" && team.description.trim().length > 0) {
    return team.description
  }

  if (typeof categoryDescription === "string" && categoryDescription.trim().length > 0) {
    return categoryDescription
  }

  return "Laginfo uppdateras inom kort."
}

const getDefaultContent = () => ({
  pageTitle: "VÅRA LAG",
  pageDescription:
    "Härnösands HF har 23 lag från ungdom till seniorer. Klicka på ett lag för att besöka deras officiella sida.",
  teamCategories: [
    {
      name: "A-lag",
      count: 2,
      description: "2 lag i kategorin",
      teams: [
        {
          name: "Dam/utv",
          link: "https://www.laget.se/HHK-dam-utv",
          instagramLink: "https://www.instagram.com/harnosandshfdam/",
        },
        {
          name: "A-lag Herrar",
          link: "https://www.laget.se/HarnosandsHFHerr",
          instagramLink: "https://www.instagram.com/harnosandshfherr/",
        },
      ],
    },
    {
      name: "Ungdomslag",
      count: 21,
      description: "21 lag i kategorin",
      teams: [
        {
          name: "Fritids-Teknikskola",
          link: "https://www.laget.se/HarnosandsHK-Fritids-Teknikskola",
        },
        {
          name: "Flickor 16 (F08/09)",
          link: "https://www.laget.se/HHK-Flickor16",
        },
        {
          name: "F-10",
          link: "https://www.laget.se/HHK-F10",
          instagramLink: "https://www.instagram.com/harnosandhff10/",
        },
        {
          name: "F-11",
          link: "https://www.laget.se/HHK-F11",
        },
        {
          name: "F-12",
          link: "https://www.laget.se/HHK-F12",
        },
        {
          name: "F-13",
          link: "https://www.laget.se/HHF-F13",
        },
        {
          name: "F-14",
          link: "https://www.laget.se/HHK-F14",
        },
        {
          name: "F-15",
          link: "https://www.laget.se/HarnosandsHK-F-15",
        },
        {
          name: "F-16",
          link: "https://www.laget.se/HarnosandsHK-F-16",
        },
        {
          name: "F-17",
          link: "https://www.laget.se/HarnosandsHK-F-17",
        },
        {
          name: "F-18",
          link: "https://www.laget.se/HarnosandsHF-F-18",
        },
        {
          name: "Pojkar 16 (P08/09)",
          link: "https://www.laget.se/HarnosandsHFP09",
        },
        {
          name: "P16 (09/10)",
          link: "https://www.laget.se/HarnosandsHFP16",
          instagramLink: "https://www.instagram.com/harnosandshfp16",
        },
        {
          name: "P-11",
          link: "https://www.laget.se/HHFP11",
          instagramLink: "https://www.instagram.com/harnosandshf_p11/",
        },
        {
          name: "P-12",
          link: "https://www.laget.se/HarnosandsHFP2012",
        },
        {
          name: "P-13",
          link: "https://www.laget.se/HHF2013",
        },
        {
          name: "P-14",
          link: "https://www.laget.se/HarnosandsHK-P-14",
        },
        {
          name: "P-15",
          link: "https://www.laget.se/HarnosandsHFP2015",
        },
        {
          name: "P-16",
          link: "https://www.laget.se/HarnosandsHFP2016",
        },
        {
          name: "P-17",
          link: "https://www.laget.se/HarnosandsHFP2017",
        },
        {
          name: "P-18",
          link: "https://www.laget.se/HarnosandsHF-P-18",
        },
      ],
    },
  ],
  faq: [
    {
      question: "Hur börjar jag spela handboll i Härnösands HF?",
      answer:
        "Det enklaste sättet att börja är att kontakta oss! Vi hjälper dig att hitta rätt lag baserat på din ålder och erfarenhet. Du kan fylla i vårt kontaktformulär eller skicka ett mejl direkt till oss.",
    },
    {
      question: "Vilken utrustning behöver jag?",
      answer:
        "Till en början behöver du bara bekväma träningskläder, inomhusskor och en vattenflaska. Handbollar finns att låna under träningarna. När du väl bestämmer dig för att fortsätta kan du behöva klubbkläder.",
    },
    {
      question: "Finns det provträningar?",
      answer:
        "Absolut! Vi erbjuder alltid några kostnadsfria provträningar så att du kan känna efter om handboll är något för dig. Detta ger dig en chans att träffa laget och tränarna innan du bestämmer dig.",
    },
    {
      question: "Hur anmäler jag mig?",
      answer:
        "Efter dina provträningar får du information om hur du enkelt anmäler dig och blir en fullvärdig medlem i Härnösands HF. Vi ser fram emot att välkomna dig till vår handbollsfamilj!",
    },
  ],
})

export default function LagPage() {
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await fetch("/content/lag.json", { cache: "no-store" })
        if (response.ok) {
          const data = await response.json()
          setContent(data)
        } else {
          setContent(getDefaultContent())
        }
      } catch (error) {
        console.error("Failed to load content:", error)
        setContent(getDefaultContent())
      } finally {
        setLoading(false)
      }
    }

    loadContent()

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const categoryStats = useMemo(() => {
    if (!content?.teamCategories) {
      return []
    }

    return content.teamCategories.map((category: any) => ({
      name: category.name,
      count:
        typeof category.count === "number"
          ? category.count
          : Array.isArray(category.teams)
            ? category.teams.length
            : 0,
      description: category.description,
    }))
  }, [content])

  const totalTeams = useMemo(
    () => categoryStats.reduce((sum, stat) => sum + (stat.count ?? 0), 0),
    [categoryStats],
  )

  const teams = useMemo(() => {
    if (!content?.teamCategories) {
      return [] as Team[]
    }

    return content.teamCategories.flatMap((category: any) => {
      const categoryDescription = category.description as string | undefined

      return (category.teams ?? []).map((team: RawTeam) => ({
        id: typeof team.id === "string" && team.id.trim().length > 0 ? team.id : slugify(team.name),
        name: team.name,
        category: category.name,
        link: team.link,
        instagramLink: team.instagramLink,
        heroImage: team.heroImage,
        heroImageAlt: team.heroImageAlt,
        description: getTeamDescription(team, categoryDescription),
        individuals: Array.isArray(team.individuals) ? team.individuals : [],
      }))
    })
  }, [content])

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id)
    }
  }, [teams, selectedTeamId])

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId),
    [teams, selectedTeamId],
  )

  const filteredTeams = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return teams
    }

    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(normalized) ||
        team.category.toLowerCase().includes(normalized),
    )
  }, [teams, searchTerm])

  const dropdownTeams = filteredTeams.slice(0, 8)
  const showDropdown = dropdownOpen && (filteredTeams.length > 0 || searchTerm.trim().length > 0)

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId)
    setDropdownOpen(false)
    setSearchTerm("")
  }

  const handleSearchFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }

    setDropdownOpen(true)
  }

  const handleSearchBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setDropdownOpen(false), 120)
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && filteredTeams.length > 0) {
      event.preventDefault()
      handleTeamSelect(filteredTeams[0].id)
    }

    if (event.key === "Escape") {
      setDropdownOpen(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-white">
          <div className="h-24" />
          <div className="container px-4 md:px-6 py-16">
            <div className="flex items-center justify-center py-16">
              <p className="text-gray-600">Laddar lag...</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  if (!content) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-white">
          <div className="h-24" />
          <div className="container px-4 md:px-6 py-16">
            <div className="flex items-center justify-center py-16">
              <p className="text-red-600">Kunde inte ladda lag. Försök igen senare.</p>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <div className="h-24" />
        <div className="container px-4 md:px-6 py-8 md:py-12 lg:py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold text-green-700 mb-4">{content.pageTitle}</h1>
            <p className="text-lg text-gray-700">{content.pageDescription}</p>
          </div>

          <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categoryStats.map((stat) => (
              <Card
                key={stat.name}
                className="rounded-2xl border border-green-100 bg-white p-6 text-center shadow-sm"
              >
                <p className="text-3xl font-bold text-green-700">{stat.count}</p>
                <p className="mt-2 text-base font-semibold text-gray-900">{stat.name}</p>
              </Card>
            ))}
            <Card className="rounded-2xl border border-green-100 bg-white p-6 text-center shadow-sm">
              <p className="text-3xl font-bold text-orange-500">{totalTeams}</p>
              <p className="mt-2 text-base font-semibold text-gray-900">Totalt antal lag</p>
            </Card>
          </section>

          <section className="mt-12 space-y-6">
            <div className="mx-auto w-full max-w-3xl">
              <label
                htmlFor="team-search"
                className="text-sm font-semibold uppercase tracking-wide text-gray-600"
              >
                Hitta ditt lag
              </label>
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="team-search"
                  type="search"
                  placeholder="Sök efter lag..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyDown={handleSearchKeyDown}
                  className="h-12 rounded-2xl border border-gray-200 bg-white pl-11 text-base shadow-sm transition focus:border-green-500 focus:ring-0"
                  autoComplete="off"
                />
                {showDropdown && (
                  <div className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                    {filteredTeams.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto py-2">
                        {dropdownTeams.map((team) => (
                          <button
                            key={team.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleTeamSelect(team.id)}
                            className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-green-50"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700">
                              {team.name.charAt(0)}
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-gray-900">
                                {team.name}
                              </span>
                              <span className="text-xs uppercase tracking-wide text-gray-500">
                                {team.category}
                              </span>
                            </span>
                          </button>
                        ))}
                        {filteredTeams.length > dropdownTeams.length && (
                          <p className="px-4 py-2 text-xs text-gray-400">
                            Visar {dropdownTeams.length} av {filteredTeams.length} lag
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Inga lag matchade sökningen.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {selectedTeam ? (
            <>
              <section className="mt-16">
                <div className="relative min-h-[320px] overflow-hidden rounded-3xl bg-gray-900 shadow-xl">
                  <Image
                    src={selectedTeam.heroImage || PLACEHOLDER_HERO}
                    alt={selectedTeam.heroImageAlt || `Lagbild ${selectedTeam.name}`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(min-width: 1024px) 1200px, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/60" />
                  <div className="relative z-10 p-8 md:p-12 lg:p-16">
                    <span className="inline-flex items-center rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white/80 backdrop-blur">
                      {selectedTeam.category}
                    </span>
                    <h2 className="mt-5 text-4xl font-bold text-white md:text-5xl">
                      {selectedTeam.name}
                    </h2>
                    <p className="mt-5 max-w-2xl text-base text-white/85 md:text-lg">
                      {selectedTeam.description}
                    </p>
                    <span className="mt-6 inline-flex items-center rounded-full bg-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white/80">
                      Matchtrupp uppdateras snart
                    </span>
                  </div>
                </div>
              </section>

              <section className="mt-10">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card className="rounded-2xl border border-green-100 bg-white p-6">
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                      Laget.se
                    </p>
                    {selectedTeam.link ? (
                      <Link
                        href={selectedTeam.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-green-700"
                      >
                        Öppna laget.se
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">Länk kommer snart.</p>
                    )}
                  </Card>
                  <Card className="rounded-2xl border border-green-100 bg-white p-6">
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                      Instagram
                    </p>
                    {selectedTeam.instagramLink ? (
                      <Link
                        href={selectedTeam.instagramLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-gray-900 hover:text-green-700"
                      >
                        Följ laget
                        <Instagram className="h-4 w-4" />
                      </Link>
                    ) : (
                      <p className="mt-3 text-sm text-gray-500">Instagram uppdateras snart.</p>
                    )}
                  </Card>
                  <Card className="rounded-2xl border border-green-100 bg-white p-6">
                    <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">
                      Matchtrupp
                    </p>
                    <p className="mt-3 text-sm text-gray-500">Matchtruppen publiceras inom kort.</p>
                  </Card>
                </div>
              </section>

              <section className="mt-16">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900">Spelartrupp</h3>
                  </div>
                  {(!selectedTeam.individuals || selectedTeam.individuals.length === 0) && (
                    <span className="inline-flex items-center rounded-full bg-orange-100 px-4 py-1 text-sm font-semibold text-orange-600">
                      Kommer snart
                    </span>
                  )}
                </div>

                {selectedTeam.individuals && selectedTeam.individuals.length > 0 ? (
                  <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {selectedTeam.individuals.map((person) => (
                      <Card
                        key={person.name}
                        className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative h-48 w-full bg-gray-100">
                          <Image
                            src={person.image || PLACEHOLDER_INDIVIDUAL}
                            alt={person.image ? `${person.name}` : `Bild på ${person.name} kommer snart`}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1280px) 300px, (min-width: 768px) 240px, 100vw"
                          />
                        </div>
                        <div className="p-5">
                          <p className="text-base font-semibold text-gray-900">{person.name}</p>
                          {person.role && (
                            <p className="mt-1 text-sm uppercase tracking-wide text-gray-500">
                              {person.role}
                            </p>
                          )}
                          {!person.image && (
                            <p className="mt-3 text-xs text-gray-500">Bild publiceras snart.</p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="mt-8 border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center text-gray-600">
                    Spelartruppen kommer snart.
                  </Card>
                )}
              </section>
            </>
          ) : (
            <section className="mt-16">
              <Card className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center text-gray-600">
                Sök efter ett lag för att visa information.
              </Card>
            </section>
          )}

          <section className="mt-20">
            <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-lg shadow-green-50">
              <h2 className="text-3xl font-bold text-green-700 text-center mb-8">
                Vanliga frågor om att börja träna
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {content.faq.map((faqItem: any, index: number) => (
                  <AccordionItem key={faqItem.question} value={`item-${index + 1}`}>
                    <AccordionTrigger className="text-lg font-semibold text-gray-800 hover:no-underline">
                      {faqItem.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-gray-700 text-base">
                      {faqItem.answer}
                      {faqItem.question.includes("anmäler") && (
                        <Link href="/kontakt" className="text-orange-500 hover:underline ml-2">
                          Anmäl dig via kontaktformuläret.
                        </Link>
                      )}
                      {faqItem.question.includes("börjar") && (
                        <Link href="/kontakt" className="text-orange-500 hover:underline ml-2">
                          Kontakta oss här.
                        </Link>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              <div className="text-center mt-8">
                <Button
                  asChild
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors"
                >
                  <Link href="/kontakt">Kontakta oss för mer information</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
