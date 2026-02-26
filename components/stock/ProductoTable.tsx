"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Plus, Pencil, Trash2, Package, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ProductoModal from "./ProductoModal"
import DeleteProductoDialog from "./DeleteProductoDialog"
import Pagination from "@/components/shared/Pagination"
import { usePagination } from "@/hooks/usePagination"
import { useDebounce } from "@/hooks/useDebounce"
import { formatARS } from "@/lib/utils"
import { exportarCSV } from "@/lib/exportCSV"
import type { Producto, Proveedor } from "@/types/database"

interface ProductoTableProps {
  productos: Producto[]
  proveedores: Proveedor[]
}

function getStockBadge(stock: number, minimo: number) {
  if (stock <= Math.floor(minimo * 0.4)) {
    return { label: "CRÍTICO", bg: "#FEE2E2", color: "#DC2626" }
  }
  if (stock <= minimo) {
    return { label: "BAJO", bg: "#FEF3C7", color: "#D97706" }
  }
  return { label: "OK", bg: "#DCFCE7", color: "#16A34A" }
}

export default function ProductoTable({ productos, proveedores }: ProductoTableProps) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search)
  const [categoriaFilter, setCategoriaFilter] = useState("todas")
  const [stockFilter, setStockFilter] = useState("todos")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Producto | null>(null)

  const categorias = useMemo(() => {
    const cats = new Set(productos.map((p) => p.categoria).filter(Boolean))
    return Array.from(cats) as string[]
  }, [productos])

  const proveedorMap = useMemo(() => {
    const map = new Map<string, string>()
    proveedores.forEach((p) => map.set(p.id, p.nombre))
    return map
  }, [proveedores])

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      const searchLower = debouncedSearch.toLowerCase()
      const matchesSearch =
        !debouncedSearch ||
        p.nombre.toLowerCase().includes(searchLower) ||
        (p.codigo && p.codigo.toLowerCase().includes(searchLower))

      const matchesCategoria =
        categoriaFilter === "todas" || p.categoria === categoriaFilter

      const badge = getStockBadge(p.stock, p.stock_minimo)
      const matchesStock =
        stockFilter === "todos" ||
        (stockFilter === "critico" && badge.label === "CRÍTICO") ||
        (stockFilter === "bajo" && (badge.label === "BAJO" || badge.label === "CRÍTICO")) ||
        (stockFilter === "ok" && badge.label === "OK")

      return matchesSearch && matchesCategoria && matchesStock
    })
  }, [productos, debouncedSearch, categoriaFilter, stockFilter])

  const pagination = usePagination(filtered, { pageSize: 20 })

  // Resetear página cuando cambian los filtros
  useEffect(() => { pagination.resetPage() }, [debouncedSearch, categoriaFilter, stockFilter])

  function handleExportCSV() {
    exportarCSV(filtered as unknown as Record<string, unknown>[], [
      { key: "nombre" as keyof Record<string, unknown>, label: "Producto" },
      { key: "codigo" as keyof Record<string, unknown>, label: "Código", format: (v) => String(v ?? "") },
      { key: "categoria" as keyof Record<string, unknown>, label: "Categoría", format: (v) => String(v ?? "") },
      { key: "precio_venta" as keyof Record<string, unknown>, label: "Precio Venta", format: (v) => String(v) },
      { key: "precio_costo" as keyof Record<string, unknown>, label: "Precio Costo", format: (v) => String(v ?? "") },
      { key: "stock" as keyof Record<string, unknown>, label: "Stock" },
      { key: "stock_minimo" as keyof Record<string, unknown>, label: "Stock Mínimo" },
    ], "stock")
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Estado stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="bajo">Bajo</SelectItem>
            <SelectItem value="critico">Crítico</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExportCSV} className="shrink-0" title="Exportar CSV">
          <Download className="size-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
        <Button
          onClick={() => { setEditingProducto(null); setModalOpen(true) }}
          className="shrink-0 bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]"
        >
          <Plus className="size-4" />
          Nuevo Producto
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Package className="size-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No se encontraron productos
          </p>
          <p className="text-xs mt-1 text-slate-400">
            {search ? "Intentá con otro término de búsqueda" : "Agregá tu primer producto"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50">
                    <TableHead className="min-w-[140px] text-slate-500">Producto</TableHead>
                    <TableHead className="min-w-[90px] text-slate-500">Código</TableHead>
                    <TableHead className="min-w-[100px] text-slate-500">Categoría</TableHead>
                    <TableHead className="text-right min-w-[100px] text-slate-500">P. Venta</TableHead>
                    <TableHead className="text-right min-w-[100px] text-slate-500">P. Costo</TableHead>
                    <TableHead className="text-right min-w-[100px] text-slate-500">Ganancia</TableHead>
                    <TableHead className="text-center min-w-[70px] text-slate-500">Stock</TableHead>
                    <TableHead className="min-w-[80px] text-slate-500">Estado</TableHead>
                    <TableHead className="min-w-[120px] text-slate-500">Proveedor</TableHead>
                    <TableHead className="text-right min-w-[80px] text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((producto) => {
                    const badge = getStockBadge(producto.stock, producto.stock_minimo)
                    const ganancia = producto.precio_venta - (producto.precio_costo ?? 0)

                    return (
                      <TableRow key={producto.id} className="group hover:bg-slate-50/80 transition-colors">
                        <TableCell className="font-medium py-4 text-slate-900">
                          {producto.nombre}
                        </TableCell>
                        <TableCell className="py-4 text-slate-500">
                          {producto.codigo || "—"}
                        </TableCell>
                        <TableCell className="py-4 text-slate-500">
                          {producto.categoria || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium py-4 text-slate-900">
                          {formatARS(producto.precio_venta)}
                        </TableCell>
                        <TableCell className="text-right py-4 text-slate-500">
                          {producto.precio_costo ? formatARS(producto.precio_costo) : "—"}
                        </TableCell>
                        <TableCell className="text-right py-4 font-medium text-emerald-600">
                          {formatARS(ganancia)}
                        </TableCell>
                        <TableCell className="text-center font-medium py-4 text-slate-900">
                          {producto.stock}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            className="text-xs font-medium px-2 py-0.5 border-none"
                            style={{ backgroundColor: badge.bg, color: badge.color }}
                          >
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-slate-500">
                          {producto.proveedor_id ? (
                            proveedorMap.get(producto.proveedor_id) ?? "—"
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 font-normal border-none">
                              Sin proveedor
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => { setEditingProducto(producto); setModalOpen(true) }}
                            >
                              <Pencil className="size-3.5 text-slate-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setDeleteTarget(producto)}
                            >
                              <Trash2 className="size-3.5 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
          />
        </>
      )}

      <ProductoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProducto(null) }}
        producto={editingProducto}
        proveedores={proveedores}
      />

      {deleteTarget && (
        <DeleteProductoDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          productoId={deleteTarget.id}
          productoNombre={deleteTarget.nombre}
        />
      )}
    </>
  )
}
