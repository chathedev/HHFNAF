import homeContent from "@/content/home.json"
import lagContent from "@/content/lag.json"
import kontaktContent from "@/content/kontakt.json"
import matcherContent from "@/content/matcher.json"
import { fetchPublicMatchEvents } from "@/lib/match-events"

export type SearchDoc = {
  id: string
  title: string
  snippet: string
  url: string
  typeLabel: "Info" | "Lag" | "Match" | "Kontakt" | "Snabblänk"
  terms: string[]
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const tokenize = (value: string) => normalize(value).split(" ").filter(Boolean)

function addDoc(docs: SearchDoc[], input: Omit<SearchDoc, "terms"> & { sourceText?: string }) {
  const source = [input.title, input.snippet, input.typeLabel, input.sourceText || ""].join(" ")
  docs.push({ ...input, terms: Array.from(new Set(tokenize(source))) })
}

export async function buildSearchIndex(): Promise<SearchDoc[]> {
  const docs: SearchDoc[] = []

  addDoc(docs, {
    id: "home",
    title: "Härnösands HF - Start",
    snippet: `${homeContent.hero.title}. ${homeContent.hero.description}`,
    url: "/",
    typeLabel: "Info",
    sourceText: [homeContent.aboutClub?.title, homeContent.aboutClub?.paragraph1, homeContent.aboutClub?.paragraph2]
      .filter(Boolean)
      .join(" "),
  })
  ;(homeContent.faq ?? []).forEach((faq, index) => {
    addDoc(docs, {
      id: `home-faq-${index}`,
      title: faq.question,
      snippet: faq.answer,
      url: "/",
      typeLabel: "Info",
      sourceText: "vanliga frågor handboll härnösand",
    })
  })

  addDoc(docs, {
    id: "lag-overview",
    title: lagContent.pageTitle,
    snippet: lagContent.pageDescription,
    url: "/lag",
    typeLabel: "Lag",
    sourceText: lagContent.teamCategories.map((category) => `${category.name} ${(category.teams ?? []).map((t) => t.name).join(" ")}`).join(" "),
  })

  for (const category of lagContent.teamCategories) {
    for (const team of category.teams ?? []) {
      const rawId = typeof (team as { id?: string }).id === "string" ? (team as { id?: string }).id?.trim() : ""
      const teamId = rawId || slugify(team.name)
      addDoc(docs, {
        id: `team-${teamId}`,
        title: (team as { displayName?: string }).displayName?.trim() || team.name,
        snippet: `${category.name}. ${team.description || "Lag i Härnösands HF."}`,
        url: `/lag/${teamId}`,
        typeLabel: "Lag",
        sourceText: [team.name, category.name, team.link || "", team.instagramLink || ""].join(" "),
      })
    }
  }
  ;(lagContent.faq ?? []).forEach((faq, index) => {
    addDoc(docs, {
      id: `lag-faq-${index}`,
      title: faq.question,
      snippet: faq.answer,
      url: "/lag",
      typeLabel: "Lag",
      sourceText: "vanliga frågor börja träna lag handboll",
    })
  })

  addDoc(docs, {
    id: "matcher-overview",
    title: matcherContent.pageTitle || "Matcher",
    snippet: matcherContent.pageDescription || "Se matcher för Härnösands HF.",
    url: "/matcher",
    typeLabel: "Match",
    sourceText: JSON.stringify(matcherContent.filters || {}) + " " + (matcherContent.noMatchesText || ""),
  })
  ;(matcherContent.faq ?? []).forEach((faq, index) => {
    addDoc(docs, {
      id: `matcher-faq-${index}`,
      title: faq.question,
      snippet: faq.answer,
      url: "/matcher",
      typeLabel: "Match",
      sourceText: "frågor matcher handboll",
    })
  })

  const matches = await fetchPublicMatchEvents(30)
  matches.forEach((match) => {
    addDoc(docs, {
      id: `match-${match.id}`,
      title: match.title,
      snippet: [match.date, match.time, match.location].filter(Boolean).join(" • ") || "Match",
      url: "/matcher",
      typeLabel: "Match",
      sourceText: `${match.opponent} ${match.location} ${match.isHome ? "hemmamatch" : "bortamatch"}`,
    })
  })

  addDoc(docs, {
    id: "kontakt",
    title: kontaktContent.pageTitle,
    snippet: kontaktContent.pageDescription,
    url: "/kontakt",
    typeLabel: "Kontakt",
    sourceText: [
      kontaktContent.generalContact?.email,
      ...(kontaktContent.departments ?? []).flatMap((dept) => [dept.title, dept.description, dept.email]),
    ]
      .filter(Boolean)
      .join(" "),
  })
  ;(kontaktContent.faq?.items ?? []).forEach((faq, index) => {
    addDoc(docs, {
      id: `kontakt-faq-${index}`,
      title: faq.question,
      snippet: faq.answer,
      url: "/kontakt",
      typeLabel: "Kontakt",
      sourceText: "kontakt provträning frågor",
    })
  })

  addDoc(docs, {
    id: "tickets",
    title: "Köp biljett",
    snippet: "Biljetter till Härnösands HF:s hemmamatcher via Clubmate.",
    url: "/kop-biljett",
    typeLabel: "Snabblänk",
    sourceText: "biljetter biljetter matcher clubmate öbackahallen",
  })

  addDoc(docs, {
    id: "quick-links",
    title: "Snabblänkar",
    snippet: "Viktiga länkar till hemsida, biljetter och sociala medier.",
    url: "/links",
    typeLabel: "Snabblänk",
    sourceText: "snabblänkar instagram facebook köp biljett",
  })

  return docs
}

export function scoreSearch(doc: SearchDoc, query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return 0

  const queryTokens = normalizedQuery.split(" ").filter(Boolean)
  let score = 0

  const title = normalize(doc.title)
  const snippet = normalize(doc.snippet)
  const joinedTerms = doc.terms.join(" ")

  if (title === normalizedQuery) score += 100
  if (title.includes(normalizedQuery)) score += 50
  if (snippet.includes(normalizedQuery)) score += 20

  for (const token of queryTokens) {
    if (title.startsWith(token)) score += 20
    if (title.includes(token)) score += 10
    if (snippet.includes(token)) score += 4
    if (joinedTerms.includes(token)) score += 2
  }

  return score
}
