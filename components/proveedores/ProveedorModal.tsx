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
import { proveedorSchema, type ProveedorFormData } from "@/schemas/proveedor"
import { crearProveedor, editarProveedor } from "@/app/(dashboard)/proveedores/actions"
import type { Proveedor } from "@/types/database"

interface ProveedorModalProps {
    open: boolean
    onClose: () => void
    proveedor?: Proveedor | null
}

export default function ProveedorModal({ open, onClose, proveedor }: ProveedorModalProps) {
    const [isPending, startTransition] = useTransition()
    const isEditing = !!proveedor

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProveedorFormData>({
        resolver: zodResolver(proveedorSchema),
        defaultValues: {
            nombre: "",
            contacto: "",
            telefono: "",
            email: "",
        },
    })

    useEffect(() => {
        if (proveedor) {
            reset({
                nombre: proveedor.nombre,
                contacto: proveedor.contacto ?? "",
                telefono: proveedor.telefono ?? "",
                email: proveedor.email ?? "",
            })
        } else {
            reset({
                nombre: "",
                contacto: "",
                telefono: "",
                email: "",
            })
        }
    }, [proveedor, reset])

    function onSubmit(data: ProveedorFormData) {
        startTransition(async () => {
            const result = isEditing
                ? await editarProveedor(proveedor!.id, data)
                : await crearProveedor(data)

            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(isEditing ? "Proveedor actualizado" : "Proveedor creado")
            onClose()
        })
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="nombre">Nombre *</Label>
                            <Input id="nombre" placeholder="Nombre del proveedor" {...register("nombre")} />
                            {errors.nombre && <p className="text-xs text-red-500">{errors.nombre.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="contacto">Contacto</Label>
                            <Input id="contacto" placeholder="Persona de contacto" {...register("contacto")} />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input id="telefono" placeholder="Ej: 011-4567-8901" {...register("telefono")} />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="email@ejemplo.com" {...register("email")} />
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>
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
