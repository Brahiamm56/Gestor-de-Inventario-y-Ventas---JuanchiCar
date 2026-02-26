import { create } from "zustand"

interface NotificationState {
  stockBajoCount: number
  setStockBajoCount: (count: number) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  stockBajoCount: 0,
  setStockBajoCount: (count) => set({ stockBajoCount: count }),
}))
