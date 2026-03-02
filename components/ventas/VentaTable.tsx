"use client"

import { useState, useMemo, useTransition } from "react"
import { Search, Plus, Trash2, Receipt, ArrowRightLeft, FileDown, Pencil, Eye, Loader2, Download } from "lucide-react"
import { toast } from "sonner"

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import VentaModal from "./VentaModal"
import Pagination from "@/components/shared/Pagination"
import { usePagination } from "@/hooks/usePagination"
import { cambiarEstadoVenta, eliminarVenta, obtenerDetallesVenta } from "@/app/(dashboard)/ventas/actions"
import { formatARS } from "@/lib/utils"
import { generarComprobantePDF } from "@/lib/pdf-generator"
import { exportarCSV } from "@/lib/exportCSV"
import type { Cliente, Auto, Producto, Venta, VentaConCliente } from "@/types/database"
import type { VentaItemFormData } from "@/schemas/venta"

interface VentaTableProps {
  ventas: VentaConCliente[]
  clientes: Cliente[]
  autos: Auto[]
  productos: Producto[]
}

interface VentaEditData {
  id: string
  cliente_id: string | null
  auto_id: string | null
  estado: "presupuesto" | "confirmada" | "cancelada"
  metodo_pago: "efectivo" | "transferencia" | "tarjeta" | null
  notas: string | null
  items: VentaItemFormData[]
}

interface VentaDetalle {
  id: string
  fecha: string
  total: number
  estado: string
  metodo_pago: string | null
  notas: string | null
  clientes: { id: string; nombre: string; telefono: string | null; email: string | null } | null
  autos: { id: string; patente: string; marca: string | null; modelo: string | null; anio: number | null } | null
  items: Array<{
    id: string
    cantidad: number
    precio_unitario: number
    productos: { id: string; nombre: string; codigo: string | null } | null
  }>
}

const estadoBadgeStyles: Record<string, { className: string; label: string }> = {
  confirmada: { className: "bg-green-100 text-green-700  ", label: "Confirmada" },
  presupuesto: { className: "bg-blue-100 text-blue-700  ", label: "Presupuesto" },
  cancelada: { className: "bg-red-100 text-red-700  ", label: "Cancelada" },
}

const metodoPagoLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
}

export default function VentaTable({ ventas, clientes, autos, productos }: VentaTableProps) {
  const [search, setSearch] = useState("")
  const [estadoFilter, setEstadoFilter] = useState("todos")
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<VentaConCliente | null>(null)
  const [isPending, startTransition] = useTransition()
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  const [ventaEdit, setVentaEdit] = useState<VentaEditData | null>(null)
  const [detalleData, setDetalleData] = useState<VentaDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return ventas.filter((v) => {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        !search ||
        (v.clientes?.nombre ?? "").toLowerCase().includes(searchLower) ||
        v.id.toLowerCase().includes(searchLower)

      const matchesEstado = estadoFilter === "todos" || v.estado === estadoFilter

      return matchesSearch && matchesEstado
    })
  }, [ventas, search, estadoFilter])

  const pagination = usePagination(filtered, { pageSize: 20 })

  function handleCambiarEstado(ventaId: string, nuevoEstado: "presupuesto" | "confirmada" | "cancelada") {
    startTransition(async () => {
      const result = await cambiarEstadoVenta(ventaId, nuevoEstado)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Estado cambiado a ${estadoBadgeStyles[nuevoEstado].label.toLowerCase()}`)
    })
  }

  function handleEliminar() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await eliminarVenta(deleteTarget.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Venta eliminada")
      setDeleteTarget(null)
    })
  }

  async function handleDescargarPDF(ventaId: string) {
    setDownloadingPdf(ventaId)
    try {
      const result = await obtenerDetallesVenta(ventaId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data) {
        generarComprobantePDF(result.data as Parameters<typeof generarComprobantePDF>[0])
        toast.success("Comprobante descargado")
      }
    } catch {
      toast.error("Error al generar el PDF")
    } finally {
      setDownloadingPdf(null)
    }
  }

  async function handleEditar(ventaId: string) {
    setLoadingDetalle(ventaId)
    try {
      const result = await obtenerDetallesVenta(ventaId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data) {
        const data = result.data as VentaDetalle
        setVentaEdit({
          id: data.id,
          cliente_id: data.clientes?.id ?? null,
          auto_id: data.autos?.id ?? null,
          estado: data.estado as "presupuesto" | "confirmada" | "cancelada",
          metodo_pago: data.metodo_pago as "efectivo" | "transferencia" | "tarjeta" | null,
          notas: data.notas,
          items: data.items.map((item) => ({
            producto_id: item.productos?.id ?? "",
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          })),
        })
        setModalOpen(true)
      }
    } catch {
      toast.error("Error al cargar la venta")
    } finally {
      setLoadingDetalle(null)
    }
  }

  async function handleVerDetalle(ventaId: string) {
    setLoadingDetalle(ventaId)
    try {
      const result = await obtenerDetallesVenta(ventaId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.data) {
        setDetalleData(result.data as VentaDetalle)
      }
    } catch {
      toast.error("Error al obtener detalles")
    } finally {
      setLoadingDetalle(null)
    }
  }

  function handleCloseModal() {
    setModalOpen(false)
    setVentaEdit(null)
  }

  function handleNuevaVenta() {
    setVentaEdit(null)
    setModalOpen(true)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="presupuesto">Presupuesto</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            exportarCSV(
              filtered as unknown as Record<string, unknown>[],
              [
                { key: "id" as keyof Record<string, unknown>, label: "ID", format: (v) => String(v).substring(0, 8).toUpperCase() },
                { key: "clientes" as keyof Record<string, unknown>, label: "Cliente", format: (v) => (v as { nombre: string } | null)?.nombre ?? "Sin cliente" },
                { key: "fecha" as keyof Record<string, unknown>, label: "Fecha", format: (v) => new Date(String(v)).toLocaleDateString("es-AR") },
                { key: "total" as keyof Record<string, unknown>, label: "Total", format: (v) => String(v) },
                { key: "estado" as keyof Record<string, unknown>, label: "Estado" },
                { key: "metodo_pago" as keyof Record<string, unknown>, label: "Método de Pago", format: (v) => metodoPagoLabels[String(v)] ?? "—" },
              ],
              "ventas"
            )
            toast.success("CSV exportado")
          }}
          className="shrink-0"
        >
          <Download className="size-4" />
          Exportar
        </Button>
        <Button
          onClick={handleNuevaVenta}
          className="shrink-0 bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]"
        >
          <Plus className="size-4" />
          Nueva Venta
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="size-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            No se encontraron ventas
          </p>
          <p className="text-xs mt-1 text-slate-400">
            {search ? "Intentá con otro término de búsqueda" : "Registrá tu primera venta"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50">
                  <TableHead className="text-slate-500">Cliente</TableHead>
                  <TableHead className="text-slate-500">Vehículo</TableHead>
                  <TableHead className="text-slate-500">Fecha</TableHead>
                  <TableHead className="text-right text-slate-500">Total</TableHead>
                  <TableHead className="text-slate-500">Estado</TableHead>
                  <TableHead className="text-slate-500">Pago</TableHead>
                  <TableHead className="text-right text-slate-500">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((venta) => {
                  const badge = estadoBadgeStyles[venta.estado] ?? estadoBadgeStyles.presupuesto
                  return (
                    <TableRow key={venta.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium text-slate-900">
                        {venta.clientes?.nombre ?? "Sin cliente"}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {venta.autos ? venta.autos.patente : "—"}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(venta.fecha).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-900">
                        {formatARS(Number(venta.total))}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-xs font-medium px-2 py-0.5 border-none ${badge.className}`}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {venta.metodo_pago ? metodoPagoLabels[venta.metodo_pago] ?? venta.metodo_pago : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleVerDetalle(venta.id)}
                            disabled={loadingDetalle === venta.id}
                            title="Ver detalle"
                          >
                            {loadingDetalle === venta.id ? (
                              <Loader2 className="size-3.5 animate-spin text-slate-500" />
                            ) : (
                              <Eye className="size-3.5 text-slate-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDescargarPDF(venta.id)}
                            disabled={downloadingPdf === venta.id}
                            title="Descargar comprobante PDF"
                          >
                            {downloadingPdf === venta.id ? (
                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                            ) : (
                              <FileDown className="size-3.5 text-blue-600" />
                            )}
                          </Button>
                          {venta.estado === "presupuesto" && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleEditar(venta.id)}
                              title="Editar presupuesto"
                            >
                              <Pencil className="size-3.5 text-slate-500" />
                            </Button>
                          )}
                          {venta.estado !== "cancelada" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-xs">
                                  <ArrowRightLeft className="size-3.5 text-slate-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {venta.estado === "presupuesto" && (
                                  <DropdownMenuItem onClick={() => handleCambiarEstado(venta.id, "confirmada")}>
                                    Confirmar venta
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleCambiarEstado(venta.id, "cancelada")}
                                  className="text-red-600"
                                >
                                  Cancelar venta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteTarget(venta)}
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
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
          />
        </div>
      )}

      <VentaModal
        open={modalOpen}
        onClose={handleCloseModal}
        clientes={clientes}
        autos={autos}
        productos={productos}
        ventaEdit={ventaEdit}
      />

      {/* Dialog eliminar */}
      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Eliminar Venta</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que querés eliminar esta venta por {formatARS(Number(deleteTarget.total))}?
                {deleteTarget.estado === "confirmada" && " Se devolverá el stock de los productos."}
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

      {/* Dialog detalle de venta */}
      {detalleData && (
        <Dialog open={!!detalleData} onOpenChange={(v) => !v && setDetalleData(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle de Venta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">N° Venta</p>
                  <p className="font-medium text-slate-900">{detalleData.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Fecha</p>
                  <p className="font-medium text-slate-900">
                    {new Date(detalleData.fecha).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Estado</p>
                  <Badge
                    className={`text-xs font-medium px-2 py-0.5 border-none mt-0.5 ${estadoBadgeStyles[detalleData.estado]?.className ?? ""}`}
                  >
                    {estadoBadgeStyles[detalleData.estado]?.label ?? detalleData.estado}
                  </Badge>
                </div>
                <div>
                  <p className="text-slate-500">Método de Pago</p>
                  <p className="font-medium text-slate-900">
                    {detalleData.metodo_pago ? metodoPagoLabels[detalleData.metodo_pago] ?? detalleData.metodo_pago : "—"}
                  </p>
                </div>
              </div>

              {detalleData.clientes && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-sm font-medium text-slate-900 mb-1">Cliente</p>
                  <div className="text-sm text-slate-600 space-y-0.5">
                    <p>{detalleData.clientes.nombre}</p>
                    {detalleData.clientes.telefono && <p>Tel: {detalleData.clientes.telefono}</p>}
                    {detalleData.clientes.email && <p>Email: {detalleData.clientes.email}</p>}
                  </div>
                </div>
              )}

              {detalleData.autos && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-sm font-medium text-slate-900 mb-1">Vehículo</p>
                  <p className="text-sm text-slate-600">
                    {detalleData.autos.patente} — {[detalleData.autos.marca, detalleData.autos.modelo, detalleData.autos.anio].filter(Boolean).join(" ")}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <p className="text-sm font-medium text-slate-900 mb-2">
                  Productos ({detalleData.items.length})
                </p>
                <div className="space-y-2">
                  {detalleData.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.productos?.nombre ?? "Producto"}</p>
                        {item.productos?.codigo && <p className="text-xs text-slate-400">{item.productos.codigo}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-900">{item.cantidad} x {formatARS(item.precio_unitario)}</p>
                        <p className="text-xs font-medium text-slate-900">{formatARS(item.cantidad * item.precio_unitario)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200 pt-3">
                <span className="text-base font-bold text-slate-900">Total</span>
                <span className="text-lg font-bold text-slate-900">{formatARS(Number(detalleData.total))}</span>
              </div>

              {detalleData.notas && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="text-sm text-slate-500">Notas</p>
                  <p className="text-sm text-slate-700">{detalleData.notas}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog >
      )
      }
    </>
  )
}
