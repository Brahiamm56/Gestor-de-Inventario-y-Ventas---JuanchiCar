"use client"

import { useEffect } from "react"
import { useNotificationStore } from "@/store/useNotificationStore"

interface StockNotificationProviderProps {
  stockBajoCount: number
  children: React.ReactNode
}

export default function StockNotificationProvider({ stockBajoCount, children }: StockNotificationProviderProps) {
  const setStockBajoCount = useNotificationStore((s) => s.setStockBajoCount)

  useEffect(() => {
    setStockBajoCount(stockBajoCount)
  }, [stockBajoCount, setStockBajoCount])

  return <>{children}</>
}
