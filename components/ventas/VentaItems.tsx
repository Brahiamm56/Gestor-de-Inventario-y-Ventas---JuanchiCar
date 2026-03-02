"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatARS } from "@/lib/utils"
import type { Producto } from "@/types/database"
import type { VentaItemFormData } from "@/schemas/venta"

interface VentaItemsProps {
  items: VentaItemFormData[]
  onChange: (items: VentaItemFormData[]) => void
  productos: Producto[]
}

export default function VentaItems({ items, onChange, productos }: VentaItemsProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [showSearch, setShowSearch] = useState(false)

  const filteredProductos = useMemo(() => {
    if (!searchTerm) return productos.slice(0, 10)
    const term = searchTerm.toLowerCase()
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        (p.codigo && p.codigo.toLowerCase().includes(term))
    ).slice(0, 10)
  }, [productos, searchTerm])

  const productoMap = useMemo(() => {
    const map = new Map<string, Producto>()
    productos.forEach((p) => map.set(p.id, p))
    return map
  }, [productos])

  function addItem(producto: Producto) {
    // Si ya existe, incrementar cantidad
    const existing = items.findIndex((i) => i.producto_id === producto.id)
    if (existing !== -1) {
      const updated = [...items]
      updated[existing] = { ...updated[existing], cantidad: updated[existing].cantidad + 1 }
      onChange(updated)
    } else {
      onChange([...items, {
        producto_id: producto.id,
        cantidad: 1,
        precio_unitario: producto.precio_venta,
      }])
    }
    setShowSearch(false)
    setSearchTerm("")
  }

  function updateQuantity(index: number, cantidad: number) {
    if (cantidad < 1) return
    const updated = [...items]
    updated[index] = { ...updated[index], cantidad }
    onChange(updated)
  }

  function updatePrice(index: number, precio_unitario: number) {
    const updated = [...items]
    updated[index] = { ...updated[index], precio_unitario }
    onChange(updated)
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  const total = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "#0F172A" }}>
          Productos ({items.length})
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
        >
          <Plus className="size-3.5" />
          Agregar
        </Button>
      </div>

      {/* Buscador de productos */}
      {showSearch && (
        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: "#E2E8F0" }}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#94A3B8" }} />
            <Input
              placeholder="Escanear código o buscar nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  const scannedCode = searchTerm.trim().toLowerCase()
                  if (!scannedCode) return

                  // Buscar coincidencia exacta de código
                  const match = productos.find(
                    (p) => p.codigo && p.codigo.toLowerCase() === scannedCode
                  )

                  if (match) {
                    addItem(match)
                  }
                  // Si no hay match exacto con código, la lista de abajo muestra resultados
                  // de búsqueda parcial, así que no borramos el campo caso contrario.
                }
              }}
              className="pl-8 h-8 text-sm focus-visible:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 bg-slate-100 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
              Escáner rápido activo
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {filteredProductos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addItem(p)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-gray-50 transition-colors text-left"
              >
                <div>
                  <span className="font-medium" style={{ color: "#0F172A" }}>{p.nombre}</span>
                  {p.codigo && (
                    <span className="ml-2 text-xs" style={{ color: "#94A3B8" }}>{p.codigo}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium" style={{ color: "#0F172A" }}>{formatARS(p.precio_venta)}</span>
                  <span className="ml-2 text-xs" style={{ color: "#94A3B8" }}>Stock: {p.stock}</span>
                </div>
              </button>
            ))}
            {filteredProductos.length === 0 && (
              <p className="text-xs text-center py-2" style={{ color: "#94A3B8" }}>
                No se encontraron productos
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lista de items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const producto = productoMap.get(item.producto_id)
            return (
              <div
                key={item.producto_id}
                className="flex items-center gap-2 p-2 rounded-lg border"
                style={{ borderColor: "#E2E8F0" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#0F172A" }}>
                    {producto?.nombre ?? "Producto"}
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                  className="w-16 h-7 text-sm text-center"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={item.precio_unitario}
                  onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                  className="w-24 h-7 text-sm text-right"
                />
                <span className="text-sm font-medium w-24 text-right" style={{ color: "#0F172A" }}>
                  {formatARS(item.cantidad * item.precio_unitario)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="size-3.5" style={{ color: "#EF4444" }} />
                </Button>
              </div>
            )
          })}

          {/* Total */}
          <div className="flex justify-end pt-2 border-t" style={{ borderColor: "#E2E8F0" }}>
            <span className="text-base font-bold" style={{ color: "#0F172A" }}>
              Total: {formatARS(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
