import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface User {
    id: string
    email: string
    name?: string
    role?: string
}

export interface WorkshopSettings {
    name: string
    address: string
    cuit: string
    phone: string
    logoUrl: string
}

interface AppState {
    user: User | null
    settings: WorkshopSettings
    setUser: (user: User | null) => void
    setSettings: (settings: Partial<WorkshopSettings>) => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            user: null,
            settings: {
                name: "Juanchi Car",
                address: "Av. Falsa 123",
                cuit: "20-12345678-9",
                phone: "11-1234-5678",
                logoUrl: "",
            },
            setUser: (user) => set({ user }),
            setSettings: (settings) =>
                set((state) => ({ settings: { ...state.settings, ...settings } })),
        }),
        {
            name: "gestor-stock-app-state",
        }
    )
)
