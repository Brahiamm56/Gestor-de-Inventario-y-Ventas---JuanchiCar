"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
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
import { turnoSchema, type TurnoFormData } from "@/schemas/turno"
import { crearTurno, editarTurno } from "@/app/(dashboard)/taller/actions"
import type { Cliente, Auto, TurnoConDetalles } from "@/types/database"

interface TurnoModalProps {
    open: boolean
    onClose: () => void
    turno?: TurnoConDetalles | null
    clientes: Cliente[]
    autos: Auto[]
}

export default function TurnoModal({ open, onClose, turno, clientes, autos }: TurnoModalProps) {
    const [isPending, startTransition] = useTransition()
    const isEditing = !!turno
    const [selectedClienteId, setSelectedClienteId] = useState<string | undefined>(turno?.cliente_id || undefined)

    // Filtrar autos por cliente seleccionado
    const filteredAutos = autos.filter(a => a.cliente_id === selectedClienteId)

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<TurnoFormData>({
        resolver: zodResolver(turnoSchema),
        defaultValues: {
            cliente_id: "",
            auto_id: "",
            descripcion: "",
            estado: "pendiente",
            fecha_turno: "",
            fecha_entrega: "",
            notas: "",
        },
    })

    useEffect(() => {
        if (turno) {
            setSelectedClienteId(turno.cliente_id || undefined)
            reset({
                cliente_id: turno.cliente_id || "",
                auto_id: turno.auto_id || "",
                descripcion: turno.descripcion,
                estado: turno.estado,
                fecha_turno: turno.fecha_turno ? new Date(turno.fecha_turno).toISOString().slice(0, 16) : "",
                fecha_entrega: turno.fecha_entrega ? new Date(turno.fecha_entrega).toISOString().slice(0, 16) : "",
                notas: turno.notas ?? "",
            })
        } else {
            setSelectedClienteId(undefined)
            reset({
                cliente_id: "",
                auto_id: "",
                descripcion: "",
                estado: "pendiente",
                fecha_turno: "",
                fecha_entrega: "",
                notas: "",
            })
        }
    }, [turno, reset])

    function onSubmit(data: TurnoFormData) {
        // Formatear fechas a ISO para Supabase
        const payload = {
            ...data,
            fecha_turno: new Date(data.fecha_turno).toISOString(),
            fecha_entrega: data.fecha_entrega ? new Date(data.fecha_entrega).toISOString() : null,
        }

        startTransition(async () => {
            const result = isEditing
                ? await editarTurno(turno!.id, payload)
                : await crearTurno(payload)

            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(isEditing ? "Turno actualizado" : "Turno creado")
            onClose()
        })
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Turno" : "Nuevo Turno"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Cliente */}
                        <div className="space-y-1.5">
                            <Label>Cliente</Label>
                            <Select
                                value={watch("cliente_id") || "none"}
                                onValueChange={(v) => {
                                    const val = v === "none" ? "" : v
                                    setValue("cliente_id", val)
                                    setSelectedClienteId(val)
                                    setValue("auto_id", "") // Reset auto al cambiar cliente
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cliente" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin cliente</SelectItem>
                                    {clientes.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vehículo */}
                        <div className="space-y-1.5">
                            <Label>Vehículo</Label>
                            <Select
                                value={watch("auto_id") || "none"}
                                onValueChange={(v) => setValue("auto_id", v === "none" ? "" : v)}
                                disabled={!selectedClienteId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={selectedClienteId ? "Seleccionar vehículo" : "Elegí primero un cliente"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin vehículo</SelectItem>
                                    {filteredAutos.map((a) => (
                                        <SelectItem key={a.id} value={a.id}>
                                            {a.marca} {a.modelo} ({a.patente})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Descripción */}
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="descripcion">Descripción del trabajo *</Label>
                            <Input
                                id="descripcion"
                                placeholder="Ej: Cambio de aceite y filtros, tren delantero..."
                                {...register("descripcion")}
                            />
                            {errors.descripcion && <p className="text-xs text-red-500">{errors.descripcion.message}</p>}
                        </div>

                        {/* Fecha Turno */}
                        <div className="space-y-1.5">
                            <Label htmlFor="fecha_turno">Fecha y Hora de Turno *</Label>
                            <Input
                                id="fecha_turno"
                                type="datetime-local"
                                {...register("fecha_turno")}
                            />
                            {errors.fecha_turno && <p className="text-xs text-red-500">{errors.fecha_turno.message}</p>}
                        </div>

                        {/* Estado */}
                        <div className="space-y-1.5">
                            <Label>Estado</Label>
                            <Select
                                value={watch("estado")}
                                onValueChange={(v) => setValue("estado", v as any)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendiente">Pendiente</SelectItem>
                                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                                    <SelectItem value="completado">Completado</SelectItem>
                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Fecha Entrega Est. */}
                        <div className="space-y-1.5">
                            <Label htmlFor="fecha_entrega">Entrega estimada (Opcional)</Label>
                            <Input
                                id="fecha_entrega"
                                type="datetime-local"
                                {...register("fecha_entrega")}
                            />
                        </div>

                        {/* Notas */}
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="notas">Notas adicionales</Label>
                            <Textarea
                                id="notas"
                                placeholder="Detalles técnicos, repuestos necesarios, etc."
                                className="resize-none h-20"
                                {...register("notas")}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending} style={{ backgroundColor: "#1E3A5F" }}>
                            {isPending && <Loader2 className="size-4 animate-spin" />}
                            {isEditing ? "Guardar cambios" : "Crear turno"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
