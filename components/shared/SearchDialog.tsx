"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Package, Users, Receipt, Wrench, ShoppingBag, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { useDebounce } from "@/hooks/useDebounce"

interface SearchResult {
  id: string
  label: string
  sublabel: string
  type: "producto" | "cliente" | "venta" | "auto"
  href: string
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ICONS = {
  producto: Package,
  cliente: Users,
  venta: Receipt,
  auto: Wrench,
}

const TYPE_LABELS = {
  producto: "Producto",
  cliente: "Cliente",
  venta: "Venta",
  auto: "Vehículo",
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debouncedQuery = useDebounce(query, 250)

  // Atajo de teclado Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onOpenChange])

  // Búsqueda
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([])
      return
    }

    async function search() {
      setLoading(true)
      const supabase = createClient()
      const term = `%${debouncedQuery}%`

      const [productosRes, clientesRes, autosRes] = await Promise.all([
        supabase
          .from("productos")
          .select("id, nombre, codigo")
          .or(`nombre.ilike.${term},codigo.ilike.${term}`)
          .limit(5),
        supabase
          .from("clientes")
          .select("id, nombre, telefono")
          .or(`nombre.ilike.${term},telefono.ilike.${term}`)
          .limit(5),
        supabase
          .from("autos")
          .select("id, patente, marca, modelo, clientes(nombre)")
          .or(`patente.ilike.${term},marca.ilike.${term},modelo.ilike.${term}`)
          .limit(5),
      ])

      const items: SearchResult[] = []

      for (const p of productosRes.data ?? []) {
        items.push({
          id: p.id,
          label: p.nombre,
          sublabel: p.codigo ?? "Sin código",
          type: "producto",
          href: "/stock",
        })
      }

      for (const c of clientesRes.data ?? []) {
        items.push({
          id: c.id,
          label: c.nombre,
          sublabel: c.telefono ?? "",
          type: "cliente",
          href: "/clientes",
        })
      }

      for (const a of autosRes.data ?? []) {
        const cliente = (a as Record<string, unknown>).clientes as { nombre: string } | null
        items.push({
          id: a.id,
          label: a.patente,
          sublabel: [a.marca, a.modelo, cliente?.nombre ? `(${cliente.nombre})` : ""].filter(Boolean).join(" "),
          type: "auto",
          href: "/clientes",
        })
      }

      setResults(items)
      setLoading(false)
    }

    search()
  }, [debouncedQuery])

  const handleSelect = useCallback((result: SearchResult) => {
    onOpenChange(false)
    setQuery("")
    router.push(result.href)
  }, [onOpenChange, router])

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setQuery("")
      setResults([])
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Buscar contenido</DialogTitle>
        <div className="flex items-center border-b border-slate-200 px-4">
          <Search className="size-4 text-slate-400 shrink-0" />
          <Input
            placeholder="Buscar productos, clientes, patentes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 h-12 text-base shadow-none"
            autoFocus
          />
          {loading && <Loader2 className="size-4 animate-spin text-slate-400 shrink-0" />}
        </div>

        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.map((result) => {
              const Icon = ICONS[result.type]
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 shrink-0">
                    <Icon className="size-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{result.label}</p>
                    <p className="text-xs text-slate-400 truncate">{result.sublabel}</p>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                    {TYPE_LABELS[result.type]}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No se encontraron resultados</p>
            <p className="text-xs text-slate-400 mt-1">Intentá con otro término</p>
          </div>
        )}

        {query.length < 2 && (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-400">Escribí al menos 2 caracteres para buscar</p>
            <p className="text-[10px] text-slate-300 mt-2">Tip: Usá Ctrl+K para abrir desde cualquier lugar</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
