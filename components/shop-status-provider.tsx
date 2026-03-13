"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export const SHOP_URL = "https://shop.harnosandshf.se"
const SHOP_STATUS_URL = "https://api.harnosandshf.se/shop/status"
const REFRESH_INTERVAL_MS = 60_000

type ShopStatusContextValue = {
  loading: boolean
  shopVisible: boolean
  maintenanceEnabled: boolean
  maintenanceMessage: string | null
  checkedAt: number | null
  refresh: () => Promise<void>
}

const ShopStatusContext = createContext<ShopStatusContextValue | null>(null)

const DEFAULT_STATE: Omit<ShopStatusContextValue, "refresh"> = {
  loading: true,
  shopVisible: false,
  maintenanceEnabled: false,
  maintenanceMessage: null,
  checkedAt: null,
}

export function ShopStatusProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(DEFAULT_STATE)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(SHOP_STATUS_URL, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, must-revalidate",
        },
      })

      if (!response.ok) {
        throw new Error(`Shop status request failed with ${response.status}`)
      }

      const payload = await response.json()
      const maintenanceEnabled = payload?.maintenance?.enabled === true
      const maintenanceMessage =
        typeof payload?.maintenance?.message === "string" ? payload.maintenance.message.trim() : null

      setState({
        loading: false,
        shopVisible: !maintenanceEnabled,
        maintenanceEnabled,
        maintenanceMessage,
        checkedAt: Date.now(),
      })
    } catch {
      setState({
        loading: false,
        shopVisible: false,
        maintenanceEnabled: false,
        maintenanceMessage: null,
        checkedAt: Date.now(),
      })
    }
  }, [])

  useEffect(() => {
    void refresh()

    const intervalId = window.setInterval(() => {
      void refresh()
    }, REFRESH_INTERVAL_MS)

    const handleFocus = () => {
      void refresh()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [refresh])

  const value = useMemo(
    () => ({
      ...state,
      refresh,
    }),
    [refresh, state],
  )

  return <ShopStatusContext.Provider value={value}>{children}</ShopStatusContext.Provider>
}

export function useShopStatus() {
  const context = useContext(ShopStatusContext)

  if (!context) {
    throw new Error("useShopStatus must be used within ShopStatusProvider")
  }

  return context
}
