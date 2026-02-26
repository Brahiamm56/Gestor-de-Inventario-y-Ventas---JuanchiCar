"use client"

import { useState, useTransition } from "react"
import { Car, Plus, Pencil, Trash2, Receipt, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AutoModal from "./AutoModal"
import { eliminarAuto } from "@/app/(dashboard)/clientes/actions"
import { formatARS } from "@/lib/utils"
import type { Auto, Venta } from "@/types/database"

interface VentaConDetalles extends Venta {
  autos: { patente: string } | null
}

interface ClienteDetailProps {
  clienteId: string
  clienteNombre: string
  autos: Auto[]
  ventas: VentaConDetalles[]
}

const estadoBadgeStyles: Record<string, { bg: string; color: string; label: string }> = {
  confirmada: { bg: "#DCFCE7", color: "#16A34A", label: "Confirmada" },
  presupuesto: { bg: "#DBEAFE", color: "#2563EB", label: "Presupuesto" },
  cancelada: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelada" },
}

export default function ClienteDetail({ clienteId, clienteNombre, autos, ventas }: ClienteDetailProps) {
  const [autoModalOpen, setAutoModalOpen] = useState(false)
  const [editingAuto, setEditingAuto] = useState<Auto | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEliminarAuto(autoId: string) {
    startTransition(async () => {
      const result = await eliminarAuto(autoId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Vehículo eliminado")
    })
  }

  function handleEditAuto(auto: Auto) {
    setEditingAuto(auto)
    setAutoModalOpen(true)
  }

  function handleCloseAutoModal() {
    setAutoModalOpen(false)
    setEditingAuto(null)
  }

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Autos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Car className="size-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">
              Vehículos ({autos.length})
            </span>
          </div>
          <Button variant="outline" size="xs" onClick={() => { setEditingAuto(null); setAutoModalOpen(true) }}>
            <Plus className="size-3" />
            Agregar
          </Button>
        </div>
        {autos.length === 0 ? (
          <p className="text-xs text-slate-400">Sin vehículos registrados</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {autos.map((auto) => (
              <div
                key={auto.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{auto.patente}</p>
                  <p className="text-xs text-slate-500">
                    {[auto.marca, auto.modelo, auto.anio].filter(Boolean).join(" ") || "—"}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleEditAuto(auto)}
                  >
                    <Pencil className="size-3 text-slate-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleEliminarAuto(auto.id)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Trash2 className="size-3 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de ventas */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="size-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-900">
            Historial de Ventas ({ventas.length})
          </span>
        </div>
        {ventas.length === 0 ? (
          <p className="text-xs text-slate-400">Sin ventas registradas</p>
        ) : (
          <div className="space-y-1.5">
            {ventas.slice(0, 5).map((venta) => {
              const badge = estadoBadgeStyles[venta.estado] ?? estadoBadgeStyles.presupuesto
              return (
                <div
                  key={venta.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {new Date(venta.fecha).toLocaleDateString("es-AR")}
                    </span>
                    {venta.autos && (
                      <span className="text-xs text-slate-400">{venta.autos.patente}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900">
                      {formatARS(Number(venta.total))}
                    </span>
                    <Badge
                      className="text-xs px-1.5 py-0 border-none"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
            {ventas.length > 5 && (
              <p className="text-xs text-center pt-1 text-slate-400">
                +{ventas.length - 5} ventas más
              </p>
            )}
          </div>
        )}
      </div>

      <AutoModal
        open={autoModalOpen}
        onClose={handleCloseAutoModal}
        clienteId={clienteId}
        clienteNombre={clienteNombre}
        auto={editingAuto}
      />
    </div>
  )
}
