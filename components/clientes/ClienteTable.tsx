"use client"

import { useState, useMemo, useEffect, useTransition, Fragment } from "react"
import { Search, Plus, Pencil, Trash2, Users, ChevronDown, ChevronRight, Loader2, AlertTriangle, Download } from "lucide-react"
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
import ClienteModal from "./ClienteModal"
import ClienteDetail from "./ClienteDetail"
import Pagination from "@/components/shared/Pagination"
import { usePagination } from "@/hooks/usePagination"
import { useDebounce } from "@/hooks/useDebounce"
import { eliminarCliente } from "@/app/(dashboard)/clientes/actions"
import { exportarCSV } from "@/lib/exportCSV"
import type { Cliente, Auto, Venta, TurnoTaller } from "@/types/database"

interface VentaConAuto extends Venta {
  autos: { patente: string } | null
}

interface ClienteTableProps {
  clientes: Cliente[]
  autos: Auto[]
  ventas: VentaConAuto[]
  turnos: TurnoTaller[]
}

export default function ClienteTable({ clientes, autos, ventas, turnos }: ClienteTableProps) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const autosMap = useMemo(() => {
    const map = new Map<string, Auto[]>()
    autos.forEach((a) => {
      if (!a.cliente_id) return
      const list = map.get(a.cliente_id) ?? []
      list.push(a)
      map.set(a.cliente_id, list)
    })
    return map
  }, [autos])

  const ventasMap = useMemo(() => {
    const map = new Map<string, VentaConAuto[]>()
    ventas.forEach((v) => {
      if (v.cliente_id) {
        const list = map.get(v.cliente_id) ?? []
        list.push(v)
        map.set(v.cliente_id, list)
      }
    })
    return map
  }, [ventas])

  const turnosMap = useMemo(() => {
    const map = new Map<string, TurnoTaller[]>()
    turnos.forEach((t) => {
      if (t.auto_id) {
        const list = map.get(t.auto_id) ?? []
        list.push(t)
        map.set(t.auto_id, list)
      }
    })
    return map
  }, [turnos])

  const filtered = useMemo(() => {
    if (!debouncedSearch) return clientes
    const term = debouncedSearch.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        (c.telefono && c.telefono.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    )
  }, [clientes, debouncedSearch])

  const pagination = usePagination(filtered, { pageSize: 20 })

  useEffect(() => { pagination.resetPage() }, [debouncedSearch])

  function handleEliminar() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await eliminarCliente(deleteTarget.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Cliente eliminado")
      setDeleteTarget(null)
    })
  }

  function handleExportCSV() {
    exportarCSV(
      filtered as unknown as Record<string, unknown>[],
      [
        { key: "nombre" as keyof Record<string, unknown>, label: "Nombre" },
        { key: "telefono" as keyof Record<string, unknown>, label: "Teléfono", format: (v) => String(v ?? "") },
        { key: "email" as keyof Record<string, unknown>, label: "Email", format: (v) => String(v ?? "") },
      ],
      "clientes"
    )
    toast.success("CSV exportado")
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="shrink-0" title="Exportar CSV">
          <Download className="size-4" />
          <span className="hidden sm:inline">CSV</span>
        </Button>
        <Button
          onClick={() => { setEditingCliente(null); setModalOpen(true) }}
          className="shrink-0 bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]"
        >
          <Plus className="size-4" />
          Nuevo Cliente
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="size-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No se encontraron clientes</p>
          <p className="text-xs mt-1 text-slate-400">
            {search ? "Intentá con otro término" : "Agregá tu primer cliente"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-slate-50">
                  <TableHead className="w-8" />
                  <TableHead className="text-slate-500">Nombre</TableHead>
                  <TableHead className="text-slate-500">Teléfono</TableHead>
                  <TableHead className="text-slate-500">Email</TableHead>
                  <TableHead className="text-center text-slate-500">Vehículos</TableHead>
                  <TableHead className="text-right text-slate-500">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map((cliente) => {
                  const clienteAutos = autosMap.get(cliente.id) ?? []
                  const clienteVentas = ventasMap.get(cliente.id) ?? []
                  const isExpanded = expandedId === cliente.id
                  return (
                    <Fragment key={cliente.id}>
                      <TableRow
                        className="hover:bg-gray-50/50 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : cliente.id)}
                      >
                        <TableCell className="w-8 px-2">
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="size-4 text-slate-400" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {cliente.nombre}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {cliente.telefono || "—"}
                        </TableCell>
                        <TableCell className="text-slate-500">
                          {cliente.email || "—"}
                        </TableCell>
                        <TableCell className="text-center text-slate-900">
                          {clienteAutos.length}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => { setEditingCliente(cliente); setModalOpen(true) }}
                            >
                              <Pencil className="size-3.5 text-slate-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setDeleteTarget(cliente)}
                            >
                              <Trash2 className="size-3.5 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0 bg-slate-50/50">
                            <ClienteDetail
                              clienteId={cliente.id}
                              clienteNombre={cliente.nombre}
                              autos={clienteAutos}
                              ventas={clienteVentas}
                              turnosMap={turnosMap}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
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
        </>
      )}

      <ClienteModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingCliente(null) }}
        cliente={editingCliente}
      />

      {deleteTarget && (
        <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-500" />
                Eliminar Cliente
              </DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que querés eliminar a <strong>{deleteTarget.nombre}</strong>? Se eliminarán también sus vehículos asociados.
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
    </>
  )
}
