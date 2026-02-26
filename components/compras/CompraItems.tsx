"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatARS } from "@/lib/utils"
import type { Producto } from "@/types/database"
import type { CompraItemFormData } from "@/schemas/compra"

interface CompraItemsProps {
  items: CompraItemFormData[]
  onChange: (items: CompraItemFormData[]) => void
  productos: Producto[]
}

export default function CompraItems({ items, onChange, productos }: CompraItemsProps) {
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
    const existing = items.findIndex((i) => i.producto_id === producto.id)
    if (existing !== -1) {
      const updated = [...items]
      updated[existing] = { ...updated[existing], cantidad: updated[existing].cantidad + 1 }
      onChange(updated)
    } else {
      onChange([...items, {
        producto_id: producto.id,
        cantidad: 1,
        precio_unitario: producto.precio_costo ?? 0,
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
        <span className="text-sm font-medium text-slate-900">
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

      {showSearch && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
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
                  <span className="font-medium text-slate-900">{p.nombre}</span>
                  {p.codigo && (
                    <span className="ml-2 text-xs text-slate-400">{p.codigo}</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs font-medium text-slate-900">
                    {p.precio_costo ? formatARS(p.precio_costo) : "Sin costo"}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">Stock: {p.stock}</span>
                </div>
              </button>
            ))}
            {filteredProductos.length === 0 && (
              <p className="text-xs text-center py-2 text-slate-400">
                No se encontraron productos
              </p>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => {
            const producto = productoMap.get(item.producto_id)
            return (
              <div
                key={item.producto_id}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-slate-900">
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
                <span className="text-sm font-medium w-24 text-right text-slate-900">
                  {formatARS(item.cantidad * item.precio_unitario)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="size-3.5 text-red-500" />
                </Button>
              </div>
            )
          })}

          <div className="flex justify-end pt-2 border-t border-slate-200">
            <span className="text-base font-bold text-slate-900">
              Total: {formatARS(total)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
