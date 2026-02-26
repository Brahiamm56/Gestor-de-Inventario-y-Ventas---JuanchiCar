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
import { autoSchema, type AutoFormData } from "@/schemas/cliente"
import { crearAuto, editarAuto } from "@/app/(dashboard)/clientes/actions"
import type { Auto } from "@/types/database"

interface AutoModalProps {
  open: boolean
  onClose: () => void
  clienteId: string
  clienteNombre: string
  auto?: Auto | null
}

export default function AutoModal({ open, onClose, clienteId, clienteNombre, auto }: AutoModalProps) {
  const [isPending, startTransition] = useTransition()
  const isEditing = !!auto

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AutoFormData>({
    resolver: zodResolver(autoSchema) as any,
    defaultValues: { patente: "", marca: "", modelo: "" },
  })

  useEffect(() => {
    if (open && auto) {
      reset({
        patente: auto.patente,
        marca: auto.marca ?? "",
        modelo: auto.modelo ?? "",
        anio: auto.anio ?? undefined,
      })
    } else if (open) {
      reset({ patente: "", marca: "", modelo: "" })
    }
  }, [open, auto, reset])

  function onSubmit(data: AutoFormData) {
    startTransition(async () => {
      const result = isEditing
        ? await editarAuto(auto!.id, data)
        : await crearAuto(clienteId, data)

      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(isEditing ? "Vehículo actualizado" : "Vehículo agregado")
      onClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Vehículo" : "Agregar Vehículo"}</DialogTitle>
          <p className="text-sm text-slate-500">
            Para {clienteNombre}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="patente">Patente *</Label>
              <Input id="patente" placeholder="Ej: ABC 123" {...register("patente")} />
              {errors.patente && <p className="text-xs text-red-500">{errors.patente.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca</Label>
              <Input id="marca" placeholder="Ej: Ford" {...register("marca")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo</Label>
              <Input id="modelo" placeholder="Ej: Focus" {...register("modelo")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="anio">Año</Label>
              <Input id="anio" type="number" placeholder="Ej: 2020" {...register("anio")} />
              {errors.anio && <p className="text-xs text-red-500">{errors.anio.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-[#1E3A5F] text-white hover:bg-[#2d4a6f]">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Guardar" : "Agregar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
