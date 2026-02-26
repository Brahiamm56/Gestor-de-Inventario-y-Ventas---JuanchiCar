import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda ARS: $27.328,50
 */
export function formatARS(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Retorna el nombre del mes en español
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ]
  return months[monthIndex]
}

/**
 * Formatea una fecha como tiempo relativo: "hace 2 horas", "hace 3 días"
 */
export function timeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return "hace un momento"
  if (diffMinutes < 60) return `hace ${diffMinutes} min`
  if (diffHours < 24) return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`
  if (diffDays < 30) return `hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`
  return date.toLocaleDateString("es-AR")
}
