// Venue ID to name mapping
export const VENUE_MAPPINGS: Record<string, string> = {
  "32": "Öbacka SC",
  "33": "Öbackahallen",
  "34": "Sundsvalls Sporthall",
  "35": "Timrå Sporthall", 
  "36": "Kramfors Sporthall",
  "37": "Sollefteå Sporthall",
  "38": "Hudiksvalls Sporthall",
  "39": "Bollnäs Sporthall",
  "40": "Sandvikens Sporthall",
  "41": "Gävle Sporthall",
  "42": "Uppsala Sporthall",
  "43": "Stockholm Sporthall",
  "44": "Göteborg Sporthall",
  "45": "Malmö Sporthall",
  // Add more venue mappings as needed
}

/**
 * Maps venue ID to a proper venue name, or returns the original value if not a known ID
 */
export function mapVenueIdToName(venue?: string | null): string | undefined {
  if (!venue) return undefined
  
  // If venue is a number (ID), map it to name
  const trimmedVenue = venue.trim()
  if (VENUE_MAPPINGS[trimmedVenue]) {
    return VENUE_MAPPINGS[trimmedVenue]
  }
  
  // If it's already a proper name, return as-is
  return venue
}

/**
 * Check if a venue value appears to be an ID (just numbers)
 */
export function isVenueId(venue?: string | null): boolean {
  if (!venue) return false
  return /^\d+$/.test(venue.trim())
}
