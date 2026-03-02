"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { clienteSchema, type ClienteFormData } from "@/schemas/cliente"
import { crearCliente, editarCliente } from "@/app/(dashboard)/clientes/actions"
import type { Cliente } from "@/types/database"

interface ClienteModalProps {
  open: boolean
  onClose: () => void
  cliente?: Cliente | null
}

export default function ClienteModal({ open, onClose, cliente }: ClienteModalProps) {
  const [isPending, startTransition] = useTransition()
  const isEditing = !!cliente

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: { nombre: "", telefono: "" },
  })

  useEffect(() => {
    if (cliente) {
      reset({
        nombre: cliente.nombre,
        telefono: cliente.telefono ?? "",
      })
    } else {
      reset({ nombre: "", telefono: "" })
    }
  }, [cliente, reset])

  function onSubmit(data: ClienteFormData) {
    startTransition(async () => {
      const result = isEditing
        ? await editarCliente(cliente!.id, data)
        : await crearCliente(data)

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(isEditing ? "Cliente actualizado" : "Cliente creado")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre *</Label>
            <Input id="nombre" placeholder="Nombre completo" {...register("nombre")} />
            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" placeholder="Ej: 11-1234-5678" {...register("telefono")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} style={{ backgroundColor: "#1E3A5F" }}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
