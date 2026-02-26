"use client"

import { useState, useMemo, useTransition } from "react"
import { Search, Plus, Trash2, ShoppingBag, Eye, Loader2, FileText } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import CompraModal from "./CompraModal"
import { eliminarCompra, obtenerDetallesCompra } from "@/app/(dashboard)/compras/actions"
import { generarComprobanteCompraPDF } from "@/lib/pdf-generator"
import { formatARS } from "@/lib/utils"
import type { Proveedor, Producto } from "@/types/database"

interface CompraConProveedor {
  id: string
  proveedor_id: string
  fecha: string
  total: number
  notas: string | null
  created_at: string
  proveedores: { nombre: string } | null
}

interface CompraTableProps {
  compras: CompraConProveedor[]
  proveedores: Proveedor[]
  productos: Producto[]
}

interface CompraDetalle {
  id: string
  fecha: string
  total: number
  notas: string | null
  proveedores: {
    id: string
    nombre: string
    contacto: string | null
    telefono: string | null
    email: string | null
  } | null
  items: Array<{
    id: string
    cantidad: number
    precio_unitario: number
    productos: {
      id: string
      nombre: string
      codigo: string | null
    } | null
  }>
}

export default function CompraTable({ compras, proveedores, productos }: CompraTableProps) {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CompraConProveedor | null>(null)
  const [detalleData, setDetalleData] = useState<CompraDetalle | null>(null)
  const [isPending, startTransition] = useTransition()
  const [loadingDetalle, setLoadingDetalle] = useState<string | null>(null)
  const [downloadingPDF, setDownloadingPDF] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search) return compras
    const term = search.toLowerCase()
    return compras.filter(
      (c) =>
        (c.proveedores?.nombre ?? "").toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
    )
  }, [compras, search])

  function handleEliminar() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await eliminarCompra(deleteTarget.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Compra eliminada — stock ajustado")
      setDeleteTarget(null)
    })
  }

  async function handleVerDetalle(compraId: string) {
    setLoadingDetalle(compraId)
    try {
      const result = await obtenerDetallesCompra(compraId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data) {
        setDetalleData(result.data as CompraDetalle)
      }
    } catch {
      toast.error("Error al obtener detalles")
    } finally {
      setLoadingDetalle(null)
    }
  }

  async function handleDescargarPDF(compraId: string) {
    setDownloadingPDF(compraId)
    try {
      const result = await obtenerDetallesCompra(compraId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data) {
        generarComprobanteCompraPDF(result.data as CompraDetalle)
      }
    } catch {
      toast.error("Error al generar PDF")
    } finally {
      setDownloadingPDF(null)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="shrink-0 bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]"
        >
          <Plus className="size-4" />
          Nueva Compra
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="size-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No se encontraron compras
          </p>
          <p className="text-xs mt-1 text-slate-400">
            {search ? "Intentá con otro término de búsqueda" : "Registrá tu primera compra"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50">
                  <TableHead className="text-slate-500">Proveedor</TableHead>
                  <TableHead className="text-slate-500">Fecha</TableHead>
                  <TableHead className="text-right text-slate-500">Total</TableHead>
                  <TableHead className="text-slate-500">Notas</TableHead>
                  <TableHead className="text-right text-slate-500">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((compra) => (
                  <TableRow key={compra.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-medium text-slate-900">
                      {compra.proveedores?.nombre ?? "Sin proveedor"}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(compra.fecha).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900">
                      {formatARS(Number(compra.total))}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-[200px] truncate">
                      {compra.notas || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleVerDetalle(compra.id)}
                          disabled={loadingDetalle === compra.id}
                          title="Ver detalle"
                        >
                          {loadingDetalle === compra.id ? (
                            <Loader2 className="size-3.5 animate-spin text-blue-600" />
                          ) : (
                            <Eye className="size-3.5 text-blue-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDescargarPDF(compra.id)}
                          disabled={downloadingPDF === compra.id}
                          title="Descargar PDF"
                        >
                          {downloadingPDF === compra.id ? (
                            <Loader2 className="size-3.5 animate-spin text-green-600" />
                          ) : (
                            <FileText className="size-3.5 text-green-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(compra)}
                        >
                          <Trash2 className="size-3.5 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <CompraModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        proveedores={proveedores}
        productos={productos}
      />

      {/* Dialog eliminar */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar Compra</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que querés eliminar esta compra por {formatARS(Number(deleteTarget.total))}?
                Se descontará el stock de los productos incluidos.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleEliminar} disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dialog detalle */}
      {detalleData && (
        <Dialog open={!!detalleData} onOpenChange={(v) => !v && setDetalleData(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de Compra</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Proveedor</p>
                  <p className="font-medium text-slate-900">{detalleData.proveedores?.nombre ?? "—"}</p>
                </div>
                <div>
                  <p className="text-slate-500">Fecha</p>
                  <p className="font-medium text-slate-900">
                    {new Date(detalleData.fecha).toLocaleDateString("es-AR")}
                  </p>
                </div>
                {detalleData.proveedores?.telefono && (
                  <div>
                    <p className="text-slate-500">Teléfono</p>
                    <p className="font-medium text-slate-900">{detalleData.proveedores.telefono}</p>
                  </div>
                )}
                {detalleData.proveedores?.email && (
                  <div>
                    <p className="text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{detalleData.proveedores.email}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-3">
                <p className="text-sm font-medium text-slate-900 mb-2">
                  Productos ({detalleData.items.length})
                </p>
                <div className="space-y-2">
                  {detalleData.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {item.productos?.nombre ?? "Producto"}
                        </p>
                        {item.productos?.codigo && (
                          <p className="text-xs text-slate-400">{item.productos.codigo}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-900">
                          {item.cantidad} x {formatARS(item.precio_unitario)}
                        </p>
                        <p className="text-xs font-medium text-slate-900">
                          {formatARS(item.cantidad * item.precio_unitario)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                <span className="text-base font-bold text-slate-900">Total</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatARS(Number(detalleData.total))}
                </span>
              </div>

              {detalleData.notas && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-sm text-slate-500">Notas</p>
                  <p className="text-sm text-slate-700">{detalleData.notas}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
