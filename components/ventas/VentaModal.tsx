"use client"

import { useState, useEffect, useTransition } from "react"
import { Loader2, Plus, Trash2, Wrench, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { crearVenta, editarVenta, crearClienteRapido } from "@/app/(dashboard)/ventas/actions"
import type { Cliente, Auto, Producto } from "@/types/database"
import type { VentaItemFormData, ServicioItemFormData } from "@/schemas/venta"
import { formatARS } from "@/lib/utils"

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

// Parsea notas que puedan contener servicios codificados
function parseNotas(notas: string | null): { notas: string; servicios: ServicioItemFormData[] } {
  if (!notas || !notas.startsWith("__sv__")) return { notas: notas || "", servicios: [] }
  try {
    const data = JSON.parse(notas.slice(6))
    return { notas: data.n || "", servicios: data.s || [] }
  } catch {
    return { notas, servicios: [] }
  }
}

export default function VentaModal({ open, onClose, clientes, autos, productos, ventaEdit }: VentaModalProps) {
  const [isPending, startTransition] = useTransition()
  const [clienteId, setClienteId] = useState("")
  const [autoId, setAutoId] = useState("")
  const [estado, setEstado] = useState<"presupuesto" | "confirmada">("confirmada")
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia" | "tarjeta">("efectivo")
  const [notas, setNotas] = useState("")
  const [items, setItems] = useState<VentaItemFormData[]>([])
  const [servicios, setServicios] = useState<ServicioItemFormData[]>([])
  const [error, setError] = useState("")

  // Estado para agregar cliente inline
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("")
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState("")
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [clientesLocal, setClientesLocal] = useState<Cliente[]>(clientes)

  const isEditing = !!ventaEdit

  // Sincronizar clientes prop con estado local
  useEffect(() => {
    setClientesLocal(clientes)
  }, [clientes])

  // Filtrar autos del cliente seleccionado
  const clienteAutos = autos.filter((a) => a.cliente_id === clienteId)

  useEffect(() => {
    if (open && ventaEdit) {
      setClienteId(ventaEdit.cliente_id ?? "")
      setAutoId(ventaEdit.auto_id ?? "")
      setEstado(ventaEdit.estado === "cancelada" ? "presupuesto" : ventaEdit.estado)
      setMetodoPago(ventaEdit.metodo_pago ?? "efectivo")
      setItems(ventaEdit.items)

      // Parsear servicios de notas
      const parsed = parseNotas(ventaEdit.notas)
      setNotas(parsed.notas)
      setServicios(parsed.servicios)
    } else if (!open) {
      setClienteId("")
      setAutoId("")
      setEstado("confirmada")
      setMetodoPago("efectivo")
      setNotas("")
      setItems([])
      setServicios([])
      setError("")
      setShowNuevoCliente(false)
      setNuevoClienteNombre("")
      setNuevoClienteTelefono("")
    }
  }, [open, ventaEdit])

  // Resetear auto cuando cambia el cliente
  useEffect(() => {
    if (!ventaEdit) setAutoId("")
  }, [clienteId, ventaEdit])

  // Crear cliente rápido desde la modal de ventas
  async function handleCrearClienteRapido() {
    if (!nuevoClienteNombre.trim()) {
      toast.error("El nombre del cliente es obligatorio")
      return
    }
    setCreandoCliente(true)
    const result = await crearClienteRapido({
      nombre: nuevoClienteNombre.trim(),
      telefono: nuevoClienteTelefono.trim() || undefined,
    })
    setCreandoCliente(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    if (result.cliente) {
      // Agregar al listado local y seleccionarlo
      const newCliente: Cliente = {
        id: result.cliente.id,
        nombre: result.cliente.nombre,
        telefono: nuevoClienteTelefono.trim() || null,
        email: null,
        created_at: new Date().toISOString(),
      }
      setClientesLocal((prev) => [...prev, newCliente].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setClienteId(result.cliente.id)
      toast.success(`Cliente "${result.cliente.nombre}" creado`)
    }

    setShowNuevoCliente(false)
    setNuevoClienteNombre("")
    setNuevoClienteTelefono("")
  }

  function addServicio() {
    setServicios((prev) => [...prev, { descripcion: "", precio: 0 }])
  }

  function updateServicio(index: number, field: keyof ServicioItemFormData, value: string | number) {
    setServicios((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function removeServicio(index: number) {
    setServicios((prev) => prev.filter((_, i) => i !== index))
  }

  const totalProductos = items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0)
  const totalServicios = servicios.reduce((sum, s) => sum + Number(s.precio || 0), 0)
  const totalGeneral = totalProductos + totalServicios

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (items.length === 0 && servicios.length === 0) {
      setError("Agregá al menos un producto o servicio")
      return
    }

    // Validar servicios
    const serviciosInvalidos = servicios.some((s) => !s.descripcion.trim())
    if (serviciosInvalidos) {
      setError("Todos los servicios deben tener una descripción")
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
        servicios: servicios.length > 0 ? servicios : undefined,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Presupuesto" : "Nueva Venta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <div className="flex gap-1.5">
                <Select value={clienteId || "none"} onValueChange={(v) => setClienteId(v === "none" ? "" : v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin cliente</SelectItem>
                    {clientesLocal.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNuevoCliente(!showNuevoCliente)}
                  title="Agregar nuevo cliente"
                  className="shrink-0"
                >
                  <UserPlus className="size-4 text-slate-600" />
                </Button>
              </div>
              {showNuevoCliente && (
                <div className="rounded-lg border border-slate-200 p-3 space-y-2 bg-slate-50/50 mt-1.5">
                  <p className="text-xs font-medium text-slate-700">Nuevo cliente</p>
                  <Input
                    placeholder="Nombre del cliente *"
                    value={nuevoClienteNombre}
                    onChange={(e) => setNuevoClienteNombre(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Teléfono (opcional)"
                    value={nuevoClienteTelefono}
                    onChange={(e) => setNuevoClienteTelefono(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowNuevoCliente(false); setNuevoClienteNombre(""); setNuevoClienteTelefono("") }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCrearClienteRapido}
                      disabled={creandoCliente || !nuevoClienteNombre.trim()}
                      className="bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]"
                    >
                      {creandoCliente && <Loader2 className="size-3 animate-spin" />}
                      Crear
                    </Button>
                  </div>
                </div>
              )}
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

          {/* Productos */}
          <VentaItems items={items} onChange={setItems} productos={productos} />

          {/* Servicios y Trabajos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "#0F172A" }}>
                <Wrench className="size-3.5 text-slate-500" />
                Servicios y Trabajos ({servicios.length})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addServicio}
              >
                <Plus className="size-3.5" />
                Agregar servicio
              </Button>
            </div>

            {servicios.length > 0 && (
              <div className="space-y-2">
                {servicios.map((servicio, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg border border-amber-100 bg-amber-50/40"
                  >
                    <Wrench className="size-3.5 text-amber-500 shrink-0" />
                    <Input
                      placeholder="Descripción del trabajo (ej: Cambio de aceite)"
                      value={servicio.descripcion}
                      onChange={(e) => updateServicio(index, "descripcion", e.target.value)}
                      className="flex-1 h-7 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Precio"
                      value={servicio.precio || ""}
                      onChange={(e) => updateServicio(index, "precio", parseFloat(e.target.value) || 0)}
                      className="w-28 h-7 text-sm text-right"
                    />
                    <span className="text-sm font-medium w-24 text-right" style={{ color: "#0F172A" }}>
                      {formatARS(Number(servicio.precio || 0))}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeServicio(index)}
                    >
                      <Trash2 className="size-3.5 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total general (cuando hay servicios) */}
          {servicios.length > 0 && (
            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 space-y-1">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Productos</span>
                <span>{formatARS(totalProductos)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Servicios</span>
                <span>{formatARS(totalServicios)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total</span>
                <span>{formatARS(totalGeneral)}</span>
              </div>
            </div>
          )}

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
