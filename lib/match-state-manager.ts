/**
 * Enhanced Match State Manager
 * Handles smooth transitions between match states to eliminate lag
 */

export class MatchStateManager {
  private matchStates = new Map<string, any>()
  private updateQueue: Array<{ matchId: string; newState: any }> = []
  private isProcessing = false

  /**
   * Queue a match state update
   */
  queueUpdate(matchId: string, newState: any) {
    this.updateQueue.push({ matchId, newState })
    this.processQueue()
  }

  /**
   * Process queued updates in batches for smooth performance
   */
  private async processQueue() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    while (this.updateQueue.length > 0) {
      const batch = this.updateQueue.splice(0, 5) // Process 5 at a time
      
      batch.forEach(({ matchId, newState }) => {
        const currentState = this.matchStates.get(matchId)
        
        // Only update if state actually changed
        if (!this.deepEqual(currentState, newState)) {
          this.matchStates.set(matchId, newState)
          this.notifyUpdate(matchId, newState)
        }
      })
      
      // Small delay between batches for smooth UI
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    
    this.isProcessing = false
  }

  /**
   * Get current match state
   */
  getState(matchId: string) {
    return this.matchStates.get(matchId)
  }

  /**
   * Deep equality check for match states
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true
    if (!a || !b) return false
    
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    for (let key of keysA) {
      if (!keysB.includes(key)) return false
      if (typeof a[key] === 'object' && typeof b[key] === 'object') {
        if (!this.deepEqual(a[key], b[key])) return false
      } else if (a[key] !== b[key]) {
        return false
      }
    }
    
    return true
  }

  /**
   * Notify components of state updates
   */
  private notifyUpdate(matchId: string, newState: any) {
    // Dispatch custom event for components to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('matchStateUpdate', {
        detail: { matchId, newState }
      }))
    }
  }

  /**
   * Clear old match states to prevent memory leaks
   */
  cleanup() {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes
    
    this.matchStates.forEach((state, matchId) => {
      if (state.lastUpdated && now - state.lastUpdated > maxAge) {
        this.matchStates.delete(matchId)
      }
    })
  }
}

// Global instance
export const matchStateManager = new MatchStateManager()

// Cleanup old states every minute
if (typeof window !== 'undefined') {
  setInterval(() => matchStateManager.cleanup(), 60000)
}
