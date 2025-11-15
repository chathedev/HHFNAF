/**
 * Data Freshness Monitor
 * Tracks and logs when newer data is preserved over stale data
 */

export class DataFreshnessMonitor {
  private preservationEvents: Array<{ matchId: string; reason: string; timestamp: number }> = []
  
  logPreservation(matchId: string, reason: string) {
    this.preservationEvents.push({
      matchId,
      reason,
      timestamp: Date.now()
    })
    
    // Keep only last 50 events
    if (this.preservationEvents.length > 50) {
      this.preservationEvents.shift()
    }
    
    // Dispatch event for UI components to show preservation indicator
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dataPreservation', {
        detail: { matchId, reason, timestamp: Date.now() }
      }))
    }
    
    console.log(`🛡️ Data preserved for ${matchId}: ${reason}`)
  }
  
  getRecentPreservations(matchId?: string, withinMs = 5000) {
    const cutoff = Date.now() - withinMs
    return this.preservationEvents.filter(event => 
      event.timestamp > cutoff && 
      (!matchId || event.matchId === matchId)
    )
  }
  
  hasRecentPreservation(matchId: string, withinMs = 3000): boolean {
    return this.getRecentPreservations(matchId, withinMs).length > 0
  }

  getStats() {
    const last24h = this.getRecentPreservations(undefined, 24 * 60 * 60 * 1000)
    const byReason = last24h.reduce((acc, event) => {
      acc[event.reason] = (acc[event.reason] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: last24h.length,
      byReason,
      lastHour: this.getRecentPreservations(undefined, 60 * 60 * 1000).length
    }
  }
}

// Global instance
export const dataFreshnessMonitor = new DataFreshnessMonitor()
