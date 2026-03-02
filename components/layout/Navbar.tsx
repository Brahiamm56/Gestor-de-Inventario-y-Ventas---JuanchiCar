"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import {
  Wrench,
  LogOut,
  Menu,
  X,
  User,
  Search,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useNotificationStore } from "@/store/useNotificationStore"
import { useAppStore } from "@/store/useAppStore"
import SearchDialog from "@/components/shared/SearchDialog"

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stock", label: "Stock/Inventario" },
  { href: "/ventas", label: "Ventas" },
  { href: "/clientes", label: "Clientes" },
  { href: "/taller", label: "Taller" },
  { href: "/proveedores", label: "Proveedores" },
  { href: "/settings", label: "Configuración" },
]

function formatDateLong(): string {
  const now = new Date()
  const day = now.getDate()
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ]
  const month = months[now.getMonth()]
  const year = now.getFullYear()
  return `${day} ${month} ${year}`
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const settings = useAppStore((state) => state.settings)
  const [searchOpen, setSearchOpen] = useState(false)
  const [dateStr, setDateStr] = useState("")

  useEffect(() => {
    setDateStr(formatDateLong())
  }, [])
  const stockBajoCount = useNotificationStore((s) => s.stockBajoCount)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()

    // Limpiamos la cookie de mock si existe
    document.cookie = "mock-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"

    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-6 bg-[#1E3A5F] text-white"
      >
        {/* Logo */}
        <div className="flex items-center mr-4">
          <Image src="/images/logo1.png" alt="JuanchiCar Logo" width={160} height={50} priority className="object-contain" />
        </div>

        {/* Links de navegación — Desktop */}
        <div className="hidden md:flex items-center gap-6 h-full">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            const showBadge = link.href === "/stock" && stockBajoCount > 0
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative h-full flex items-center px-1 text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.75)",
                }}
              >
                {link.label}
                {showBadge && (
                  <span className="absolute -top-0.5 -right-3 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {stockBajoCount}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-sm" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Derecha — Búsqueda + Fecha + Avatar + Logout + Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSearchOpen(true)}
            className="text-white hover:bg-white/10 cursor-pointer hidden sm:flex"
            aria-label="Buscar"
            title="Buscar (Ctrl+K)"
          >
            <Search className="size-4" />
          </Button>

          <span className="hidden sm:inline text-xs font-medium text-white/80">
            {dateStr}
          </span>

          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
            <User className="size-4 text-white" />
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden text-white hover:bg-white/10 cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menú"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </nav>

      {/* Drawer mobile */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-[60px] right-0 z-50 w-64 h-[calc(100vh-60px)] p-4 md:hidden animate-fade-in-right bg-[#1E3A5F] text-white">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                const showBadge = link.href === "/stock" && stockBajoCount > 0
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                    style={{
                      color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.75)",
                      backgroundColor: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                    }}
                  >
                    {link.label}
                    {showBadge && (
                      <span className="flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                        {stockBajoCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
