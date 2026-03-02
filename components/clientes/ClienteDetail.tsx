"use client"

import { useState, useMemo, useTransition } from "react"
import {
  Car, Plus, Pencil, Trash2, Receipt, Loader2,
  ChevronDown, ChevronRight, ShoppingCart, Wrench
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import AutoModal from "./AutoModal"
import { eliminarAuto } from "@/app/(dashboard)/clientes/actions"
import { formatARS } from "@/lib/utils"
import type { Auto, Venta, TurnoTaller } from "@/types/database"

interface VentaConDetalles extends Venta {
  autos: { patente: string } | null
}

interface ClienteDetailProps {
  clienteId: string
  clienteNombre: string
  autos: Auto[]
  ventas: VentaConDetalles[]
  turnosMap: Map<string, TurnoTaller[]>
}

// Estilos para badges de estado de ventas
const ventaEstadoBadge: Record<string, { bg: string; color: string; label: string }> = {
  confirmada: { bg: "#DCFCE7", color: "#16A34A", label: "Confirmada" },
  presupuesto: { bg: "#DBEAFE", color: "#2563EB", label: "Presupuesto" },
  cancelada: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelada" },
}

// Estilos para badges de estado de turnos de taller
const turnoEstadoBadge: Record<string, { bg: string; color: string; label: string }> = {
  pendiente: { bg: "#FEF3C7", color: "#D97706", label: "Pendiente" },
  en_progreso: { bg: "#DBEAFE", color: "#2563EB", label: "En progreso" },
  completado: { bg: "#DCFCE7", color: "#16A34A", label: "Completado" },
  cancelado: { bg: "#FEE2E2", color: "#DC2626", label: "Cancelado" },
}

// Tipo unificado para historial combinado por vehículo
type HistorialItem =
  | { tipo: "venta"; fecha: string; data: VentaConDetalles }
  | { tipo: "taller"; fecha: string; data: TurnoTaller }

export default function ClienteDetail({
  clienteId, clienteNombre, autos, ventas, turnosMap
}: ClienteDetailProps) {
  const [autoModalOpen, setAutoModalOpen] = useState(false)
  const [editingAuto, setEditingAuto] = useState<Auto | null>(null)
  const [expandedAutoId, setExpandedAutoId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Ventas agrupadas por auto_id
  const ventasPorAuto = useMemo(() => {
    const map = new Map<string, VentaConDetalles[]>()
    ventas.forEach((v) => {
      if (v.auto_id) {
        const list = map.get(v.auto_id) ?? []
        list.push(v)
        map.set(v.auto_id, list)
      }
    })
    return map
  }, [ventas])

  // Ventas sin auto asociado (se muestran en sección general)
  const ventasSinAuto = useMemo(() => ventas.filter((v) => !v.auto_id), [ventas])

  // Construir historial combinado para un auto
  function getHistorialAuto(autoId: string): HistorialItem[] {
    const ventasAuto = ventasPorAuto.get(autoId) ?? []
    const turnosAuto = turnosMap.get(autoId) ?? []

    const items: HistorialItem[] = [
      ...ventasAuto.map((v) => ({ tipo: "venta" as const, fecha: v.fecha, data: v })),
      ...turnosAuto.map((t) => ({ tipo: "taller" as const, fecha: t.fecha_turno, data: t })),
    ]

    // Ordenar por fecha descendente
    items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    return items
  }

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

  function toggleAutoExpand(autoId: string) {
    setExpandedAutoId((prev) => (prev === autoId ? null : autoId))
  }

  return (
    <div className="px-4 pb-4 space-y-4">
      {/* Vehículos con historial expandible */}
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
          <div className="space-y-2">
            {autos.map((auto) => {
              const historial = getHistorialAuto(auto.id)
              const isExpanded = expandedAutoId === auto.id
              const turnosCount = turnosMap.get(auto.id)?.length ?? 0
              const ventasCount = ventasPorAuto.get(auto.id)?.length ?? 0

              return (
                <div
                  key={auto.id}
                  className="rounded-lg border border-slate-200 overflow-hidden"
                >
                  {/* Cabecera del auto */}
                  <div
                    className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                    onClick={() => toggleAutoExpand(auto.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="size-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="size-3.5 text-slate-400 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{auto.patente}</p>
                        <p className="text-xs text-slate-500">
                          {[auto.marca, auto.modelo, auto.anio].filter(Boolean).join(" ") || "—"}
                        </p>
                      </div>
                      {/* Contadores rápidos */}
                      {(ventasCount > 0 || turnosCount > 0) && (
                        <div className="flex items-center gap-1.5 ml-2">
                          {ventasCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <ShoppingCart className="size-3" />
                              {ventasCount}
                            </span>
                          )}
                          {turnosCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                              <Wrench className="size-3" />
                              {turnosCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
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

                  {/* Historial expandible del auto */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-3 py-2">
                      {historial.length === 0 ? (
                        <p className="text-xs text-slate-400 py-1">Sin historial de servicios</p>
                      ) : (
                        <div className="space-y-1.5">
                          {historial.map((item) => {
                            if (item.tipo === "venta") {
                              const v = item.data as VentaConDetalles
                              const badge = ventaEstadoBadge[v.estado] ?? ventaEstadoBadge.presupuesto
                              return (
                                <div
                                  key={`v-${v.id}`}
                                  className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-100"
                                >
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart className="size-3.5 text-blue-500 shrink-0" />
                                    <span className="text-xs text-slate-500">
                                      {new Date(v.fecha).toLocaleDateString("es-AR")}
                                    </span>
                                    <span className="text-xs text-slate-400">Venta</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-900">
                                      {formatARS(Number(v.total))}
                                    </span>
                                    <Badge
                                      className="text-[10px] px-1.5 py-0 border-none"
                                      style={{ backgroundColor: badge.bg, color: badge.color }}
                                    >
                                      {badge.label}
                                    </Badge>
                                  </div>
                                </div>
                              )
                            } else {
                              const t = item.data as TurnoTaller
                              const badge = turnoEstadoBadge[t.estado] ?? turnoEstadoBadge.pendiente
                              return (
                                <div
                                  key={`t-${t.id}`}
                                  className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-100"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Wrench className="size-3.5 text-amber-500 shrink-0" />
                                    <span className="text-xs text-slate-500 shrink-0">
                                      {new Date(t.fecha_turno).toLocaleDateString("es-AR")}
                                    </span>
                                    <span className="text-xs text-slate-700 truncate">
                                      {t.descripcion}
                                    </span>
                                  </div>
                                  <Badge
                                    className="text-[10px] px-1.5 py-0 border-none shrink-0 ml-2"
                                    style={{ backgroundColor: badge.bg, color: badge.color }}
                                  >
                                    {badge.label}
                                  </Badge>
                                </div>
                              )
                            }
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ventas sin auto asociado */}
      {ventasSinAuto.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="size-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900">
              Ventas sin vehículo ({ventasSinAuto.length})
            </span>
          </div>
          <div className="space-y-1.5">
            {ventasSinAuto.slice(0, 5).map((venta) => {
              const badge = ventaEstadoBadge[venta.estado] ?? ventaEstadoBadge.presupuesto
              return (
                <div
                  key={venta.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                >
                  <span className="text-xs text-slate-500">
                    {new Date(venta.fecha).toLocaleDateString("es-AR")}
                  </span>
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
            {ventasSinAuto.length > 5 && (
              <p className="text-xs text-center pt-1 text-slate-400">
                +{ventasSinAuto.length - 5} ventas más
              </p>
            )}
          </div>
        </div>
      )}

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
