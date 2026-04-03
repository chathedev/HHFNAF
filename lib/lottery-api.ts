const API_BASE =
  process.env.NEXT_PUBLIC_LOTTERY_API_BASE || "https://api.harnosandshf.se/lottery"

export interface LotteryMatch {
  id: number
  match_name: string
  external_match_id?: string
  category?: string
  round?: string
  ticket_price_ore: number
  status: "upcoming" | "live" | "ended"
  pot_share_ore: number
  total_collected_ore: number
  ticket_count: number
  paid_out?: boolean
  created_at: string
}

export interface LotteryTicket {
  id: number
  ticket_number: string
  created_at: string
}

export interface BuyResult {
  client_secret: string
  payment_intent_id: string
  amount_ore: number
  ticket_count: number
}

export interface ConfirmResult {
  tickets: { id: number; ticket_number: string }[]
  pot_share_ore: number
  match_name: string
}

export interface RegisterResult {
  user_id: number
  name: string
  email: string
  has_stripe_account: boolean
  onboarding_url: string | null
}

export async function fetchMatches(status?: string): Promise<LotteryMatch[]> {
  const url = status ? `${API_BASE}/matches?status=${status}` : `${API_BASE}/matches`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch matches")
  return res.json()
}

export async function fetchMatch(id: number): Promise<LotteryMatch> {
  const res = await fetch(`${API_BASE}/matches/${id}`)
  if (!res.ok) throw new Error("Match not found")
  return res.json()
}

export async function fetchMatchByExternalId(externalId: string | number): Promise<LotteryMatch | null> {
  const res = await fetch(`${API_BASE}/by-match/${externalId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error("Failed to fetch match")
  return res.json()
}

export async function syncMatches(): Promise<{ created: number; existing: number; total: number }> {
  const res = await fetch(`${API_BASE}/sync`, { method: "POST" })
  if (!res.ok) throw new Error("Sync failed")
  return res.json()
}

export async function registerUser(name: string, email: string, phone?: string): Promise<RegisterResult> {
  const res = await fetch(`${API_BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone }),
  })
  if (!res.ok) throw new Error("Registration failed")
  return res.json()
}

export async function buyTickets(
  matchId: number,
  name: string,
  email: string,
  ticketCount: number,
  phone?: string
): Promise<BuyResult> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone, ticket_count: ticketCount }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Purchase failed")
  }
  return res.json()
}

export async function confirmPayment(matchId: number, paymentIntentId: string): Promise<ConfirmResult> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/confirm-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_intent_id: paymentIntentId }),
  })
  if (!res.ok) throw new Error("Confirmation failed")
  return res.json()
}

export async function fetchMyTickets(matchId: number, email: string): Promise<LotteryTicket[]> {
  const res = await fetch(`${API_BASE}/matches/${matchId}/my-tickets?email=${encodeURIComponent(email)}`)
  if (!res.ok) throw new Error("Failed to fetch tickets")
  return res.json()
}

// ── Admin API ──

export async function adminFetchMatches(secret: string) {
  const res = await fetch(`${API_BASE}/admin/matches`, {
    headers: { "x-admin-secret": secret },
  })
  if (!res.ok) throw new Error("Unauthorized")
  return res.json()
}

export async function adminSyncMatches(secret: string) {
  const res = await fetch(`${API_BASE}/admin/sync`, {
    method: "POST",
    headers: { "x-admin-secret": secret },
  })
  if (!res.ok) throw new Error("Sync failed")
  return res.json()
}

export async function adminCreateMatch(secret: string, matchName: string, ticketPriceOre?: number) {
  const res = await fetch(`${API_BASE}/admin/matches`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-secret": secret },
    body: JSON.stringify({ match_name: matchName, ticket_price_ore: ticketPriceOre }),
  })
  if (!res.ok) throw new Error("Failed to create match")
  return res.json()
}

export async function adminEndMatch(secret: string, matchId: number) {
  const res = await fetch(`${API_BASE}/admin/matches/${matchId}/end`, {
    method: "POST",
    headers: { "x-admin-secret": secret },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to end match")
  }
  return res.json()
}

export async function adminDeleteMatch(secret: string, matchId: number) {
  const res = await fetch(`${API_BASE}/admin/matches/${matchId}`, {
    method: "DELETE",
    headers: { "x-admin-secret": secret },
  })
  if (!res.ok) throw new Error("Failed to delete match")
  return res.json()
}
