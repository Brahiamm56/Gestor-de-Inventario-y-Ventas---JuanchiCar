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
import CompraItems from "./CompraItems"
import { crearCompra } from "@/app/(dashboard)/compras/actions"
import type { Proveedor, Producto } from "@/types/database"
import type { CompraItemFormData } from "@/schemas/compra"

interface CompraModalProps {
  open: boolean
  onClose: () => void
  proveedores: Proveedor[]
  productos: Producto[]
}

export default function CompraModal({ open, onClose, proveedores, productos }: CompraModalProps) {
  const [isPending, startTransition] = useTransition()
  const [proveedorId, setProveedorId] = useState("")
  const [notas, setNotas] = useState("")
  const [items, setItems] = useState<CompraItemFormData[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) {
      setProveedorId("")
      setNotas("")
      setItems([])
      setError("")
    }
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!proveedorId) {
      setError("Seleccioná un proveedor")
      return
    }

    if (items.length === 0) {
      setError("Agregá al menos un producto")
      return
    }

    startTransition(async () => {
      const result = await crearCompra({
        proveedor_id: proveedorId,
        notas: notas || undefined,
        items,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Compra registrada — stock actualizado")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Compra</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Proveedor *</Label>
            <Select value={proveedorId || "none"} onValueChange={(v) => setProveedorId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar...</SelectItem>
                {proveedores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CompraItems items={items} onChange={setItems} productos={productos} />

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Textarea
              placeholder="Observaciones de la compra..."
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
              Registrar Compra
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
