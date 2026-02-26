"use client"

import { useState, useEffect, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import VentaItems from "./VentaItems"
import { crearVenta, editarVenta } from "@/app/(dashboard)/ventas/actions"
import type { Cliente, Auto, Producto } from "@/types/database"
import type { VentaItemFormData } from "@/schemas/venta"

interface VentaEditData {
  id: string
  cliente_id: string | null
  auto_id: string | null
  estado: "presupuesto" | "confirmada" | "cancelada"
  metodo_pago: "efectivo" | "transferencia" | "tarjeta" | null
  notas: string | null
  items: VentaItemFormData[]
}

interface VentaModalProps {
  open: boolean
  onClose: () => void
  clientes: Cliente[]
  autos: Auto[]
  productos: Producto[]
  ventaEdit?: VentaEditData | null
}

export default function VentaModal({ open, onClose, clientes, autos, productos, ventaEdit }: VentaModalProps) {
  const [isPending, startTransition] = useTransition()
  const [clienteId, setClienteId] = useState("")
  const [autoId, setAutoId] = useState("")
  const [estado, setEstado] = useState<"presupuesto" | "confirmada">("confirmada")
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia" | "tarjeta">("efectivo")
  const [notas, setNotas] = useState("")
  const [items, setItems] = useState<VentaItemFormData[]>([])
  const [error, setError] = useState("")

  const isEditing = !!ventaEdit

  // Filtrar autos del cliente seleccionado
  const clienteAutos = autos.filter((a) => a.cliente_id === clienteId)

  useEffect(() => {
    if (open && ventaEdit) {
      setClienteId(ventaEdit.cliente_id ?? "")
      setAutoId(ventaEdit.auto_id ?? "")
      setEstado(ventaEdit.estado === "cancelada" ? "presupuesto" : ventaEdit.estado)
      setMetodoPago(ventaEdit.metodo_pago ?? "efectivo")
      setNotas(ventaEdit.notas ?? "")
      setItems(ventaEdit.items)
    } else if (!open) {
      setClienteId("")
      setAutoId("")
      setEstado("confirmada")
      setMetodoPago("efectivo")
      setNotas("")
      setItems([])
      setError("")
    }
  }, [open, ventaEdit])

  // Resetear auto cuando cambia el cliente
  useEffect(() => {
    if (!ventaEdit) {
      setAutoId("")
    }
  }, [clienteId, ventaEdit])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (items.length === 0) {
      setError("Agregá al menos un producto")
      return
    }

    startTransition(async () => {
      const payload = {
        cliente_id: clienteId || undefined,
        auto_id: autoId || undefined,
        estado,
        metodo_pago: metodoPago,
        notas: notas || undefined,
        items,
      }

      const result = isEditing
        ? await editarVenta(ventaEdit!.id, payload)
        : await crearVenta(payload)

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(isEditing ? "Venta actualizada" : "Venta creada correctamente")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Presupuesto" : "Nueva Venta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clienteId || "none"} onValueChange={(v) => setClienteId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Vehículo</Label>
              <Select
                value={autoId || "none"}
                onValueChange={(v) => setAutoId(v === "none" ? "" : v)}
                disabled={!clienteId || clienteAutos.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={clienteId ? "Seleccionar vehículo" : "Elegí un cliente"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vehículo</SelectItem>
                  {clienteAutos.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.patente} — {a.marca} {a.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as "presupuesto" | "confirmada")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="presupuesto">Presupuesto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Método de Pago</Label>
              <Select value={metodoPago} onValueChange={(v) => setMetodoPago(v as "efectivo" | "transferencia" | "tarjeta")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <VentaItems items={items} onChange={setItems} productos={productos} />

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observaciones..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Venta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
