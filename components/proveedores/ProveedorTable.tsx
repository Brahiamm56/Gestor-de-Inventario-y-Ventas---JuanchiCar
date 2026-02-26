"use client"

import { useState, useMemo, useEffect } from "react"
import { Search, Plus, Pencil, Trash2, Phone, Mail, UserCircle } from "lucide-react"
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
import Pagination from "@/components/shared/Pagination"
import { usePagination } from "@/hooks/usePagination"
import { useDebounce } from "@/hooks/useDebounce"
import type { Proveedor } from "@/types/database"
import ProveedorModal from "./ProveedorModal"
import DeleteProveedorDialog from "./DeleteProveedorDialog"

interface ProveedorTableProps {
  proveedores: Proveedor[]
}

export default function ProveedorTable({ proveedores }: ProveedorTableProps) {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)
  const [deletingProveedor, setDeletingProveedor] = useState<Proveedor | null>(null)

  const filtered = useMemo(() => {
    if (!debouncedSearch) return proveedores
    const term = debouncedSearch.toLowerCase()
    return proveedores.filter(
      (p) =>
        p.nombre.toLowerCase().includes(term) ||
        (p.contacto?.toLowerCase().includes(term) ?? false) ||
        (p.telefono?.toLowerCase().includes(term) ?? false) ||
        (p.email?.toLowerCase().includes(term) ?? false)
    )
  }, [proveedores, debouncedSearch])

  const pagination = usePagination(filtered, { pageSize: 20 })

  useEffect(() => { pagination.resetPage() }, [debouncedSearch])

  function handleEdit(proveedor: Proveedor) {
    setEditingProveedor(proveedor)
    setModalOpen(true)
  }

  function handleCloseModal() {
    setModalOpen(false)
    setEditingProveedor(null)
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar proveedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="gap-2 cursor-pointer bg-[#1E3A5F] text-white hover:bg-[#2d4a6f] text-white"
        >
          <Plus className="size-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCircle className="size-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {search ? "No se encontraron proveedores" : "No hay proveedores registrados"}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-slate-50">
                    <TableHead className="text-slate-500">Nombre</TableHead>
                    <TableHead className="text-slate-500 hidden sm:table-cell">Contacto</TableHead>
                    <TableHead className="text-slate-500 hidden md:table-cell">Teléfono</TableHead>
                    <TableHead className="text-slate-500 hidden md:table-cell">Email</TableHead>
                    <TableHead className="text-right text-slate-500">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedItems.map((proveedor) => (
                    <TableRow key={proveedor.id} className="hover:bg-gray-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 shrink-0">
                            <UserCircle className="size-4 text-amber-600" />
                          </div>
                          <span className="font-medium text-slate-900">{proveedor.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 hidden sm:table-cell">
                        {proveedor.contacto || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {proveedor.telefono ? (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="size-3.5" />
                            {proveedor.telefono}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {proveedor.email ? (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail className="size-3.5" />
                            {proveedor.email}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleEdit(proveedor)}
                            className="cursor-pointer"
                          >
                            <Pencil className="size-3.5 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeletingProveedor(proveedor)}
                            className="cursor-pointer"
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

      <ProveedorModal
        open={modalOpen}
        onClose={handleCloseModal}
        proveedor={editingProveedor}
      />

      <DeleteProveedorDialog
        proveedor={deletingProveedor}
        onClose={() => setDeletingProveedor(null)}
      />
    </>
  )
}
