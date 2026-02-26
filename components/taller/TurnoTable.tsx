"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Plus, Pencil, Trash2, Calendar, Car, User, Filter } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
import Pagination from "@/components/shared/Pagination"
import { usePagination } from "@/hooks/usePagination"
import { useDebounce } from "@/hooks/useDebounce"
import type { Cliente, Auto, TurnoConDetalles, EstadoTurno } from "@/types/database"
import TurnoModal from "./TurnoModal"
import DeleteTurnoDialog from "./DeleteTurnoDialog"

interface TurnoTableProps {
  turnos: TurnoConDetalles[]
  clientes: Cliente[]
  autos: Auto[]
}

const ESTADOS: { label: string; value: EstadoTurno | "todos"; color: string; bg: string }[] = [
  { label: "Todos", value: "todos", color: "#64748B", bg: "#F1F5F9" },
  { label: "Pendiente", value: "pendiente", color: "#D97706", bg: "#FEF3C7" },
  { label: "En Progreso", value: "en_progreso", color: "#2563EB", bg: "#DBEAFE" },
  { label: "Completado", value: "completado", color: "#059669", bg: "#D1FAE5" },
  { label: "Cancelado", value: "cancelado", color: "#DC2626", bg: "#FEE2E2" },
]

export default function TurnoTable({ turnos, clientes, autos }: TurnoTableProps) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search)
  const [filtroEstado, setFiltroEstado] = useState<EstadoTurno | "todos">("todos")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTurno, setEditingTurno] = useState<TurnoConDetalles | null>(null)
  const [deletingTurno, setDeletingTurno] = useState<TurnoConDetalles | null>(null)

  const filtered = useMemo(() => {
    return turnos.filter((t) => {
      const term = debouncedSearch.toLowerCase()
      const matchSearch =
        !debouncedSearch ||
        t.descripcion.toLowerCase().includes(term) ||
        (t.clientes?.nombre.toLowerCase().includes(term) ?? false) ||
        (t.autos?.patente.toLowerCase().includes(term) ?? false)

      const matchEstado = filtroEstado === "todos" || t.estado === filtroEstado

      return matchSearch && matchEstado
    })
  }, [turnos, debouncedSearch, filtroEstado])

  const pagination = usePagination(filtered, { pageSize: 20 })

  useEffect(() => { pagination.resetPage() }, [debouncedSearch, filtroEstado])

  function handleEdit(turno: TurnoConDetalles) {
    setEditingTurno(turno)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setEditingTurno(null)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente, patente o trabajo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as EstadoTurno | "todos")}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-gray-500" />
                <SelectValue placeholder="Estado" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="gap-2 cursor-pointer bg-[#1E3A5F] text-white hover:bg-[#2d4a6f] text-white"
        >
          <Plus className="size-4" />
          Nuevo Turno
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="size-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {search || filtroEstado !== "todos" ? "No se encontraron turnos" : "No hay turnos registrados"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50">
                    <TableHead className="text-slate-500">Cliente / Vehículo</TableHead>
                    <TableHead className="text-slate-500">Descripción del Trabajo</TableHead>
                    <TableHead className="text-slate-500">Fecha / Hora</TableHead>
                    <TableHead className="text-slate-500">Estado</TableHead>
                    <TableHead className="text-right text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((turno) => {
                    const configEstado = ESTADOS.find(e => e.value === turno.estado)
                    return (
                      <TableRow key={turno.id} className="hover:bg-gray-50/50">
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-medium text-slate-900">
                              <User className="size-3.5 text-slate-400" />
                              {turno.clientes?.nombre || "Sin cliente"}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Car className="size-3.5" />
                              {turno.autos ? `${turno.autos.marca} ${turno.autos.modelo} (${turno.autos.patente})` : "Sin vehículo"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <p className="text-slate-700 line-clamp-1">{turno.descripcion}</p>
                          {turno.notas && <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{turno.notas}</p>}
                        </TableCell>
                        <TableCell className="py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Calendar className="size-3.5 text-slate-400" />
                            {format(new Date(turno.fecha_turno), "dd MMM, HH:mm'hs'", { locale: es })}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className="font-semibold text-[11px] border-transparent"
                            style={{ backgroundColor: configEstado?.bg, color: configEstado?.color }}
                          >
                            {configEstado?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleEdit(turno)}
                              className="cursor-pointer"
                            >
                              <Pencil className="size-3.5 text-slate-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setDeletingTurno(turno)}
                              className="cursor-pointer"
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

      <TurnoModal
        open={modalOpen}
        onClose={handleCloseModal}
        turno={editingTurno}
        clientes={clientes}
        autos={autos}
      />

      <DeleteTurnoDialog
        turno={deletingTurno}
        onClose={() => setDeletingTurno(null)}
      />
    </>
  )
}
