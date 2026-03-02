"use client"

import { useEffect, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Car } from "lucide-react"
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
import { crearTurno, editarTurno, crearAutoRapido } from "@/app/(dashboard)/taller/actions"
import type { Cliente, Auto, TurnoConDetalles } from "@/types/database"

interface TurnoModalProps {
    open: boolean
    onClose: () => void
    turno?: TurnoConDetalles | null
    clientes: Cliente[]
    autos: Auto[]
}

interface NuevoVehiculo {
    patente: string
    marca: string
    modelo: string
    anio: string
    km: string
}

export default function TurnoModal({ open, onClose, turno, clientes, autos }: TurnoModalProps) {
    const [isPending, startTransition] = useTransition()
    const isEditing = !!turno
    const [selectedClienteId, setSelectedClienteId] = useState<string | undefined>(turno?.cliente_id || undefined)
    const [modoVehiculo, setModoVehiculo] = useState<"existente" | "nuevo">("existente")
    const [nuevoVehiculo, setNuevoVehiculo] = useState<NuevoVehiculo>({
        patente: "", marca: "", modelo: "", anio: "", km: ""
    })
    const [vehiculoError, setVehiculoError] = useState("")

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
        if (open) {
            if (turno) {
                setSelectedClienteId(turno.cliente_id || undefined)
                setModoVehiculo("existente")
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
                setModoVehiculo("existente")
                setNuevoVehiculo({ patente: "", marca: "", modelo: "", anio: "", km: "" })
                setVehiculoError("")
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
        }
    }, [open, turno, reset])

    async function onSubmit(data: TurnoFormData) {
        setVehiculoError("")

        const payload = {
            ...data,
            fecha_turno: new Date(data.fecha_turno).toISOString(),
            fecha_entrega: data.fecha_entrega ? new Date(data.fecha_entrega).toISOString() : null,
        }

        startTransition(async () => {
            // Si el usuario ingresó datos de vehículo nuevo
            if (modoVehiculo === "nuevo" && nuevoVehiculo.patente.trim()) {
                const anioNum = nuevoVehiculo.anio ? parseInt(nuevoVehiculo.anio) : undefined
                const vehiculoResult = await crearAutoRapido(selectedClienteId || null, {
                    patente: nuevoVehiculo.patente.trim(),
                    marca: nuevoVehiculo.marca.trim() || undefined,
                    modelo: nuevoVehiculo.modelo.trim() || undefined,
                    anio: anioNum && !isNaN(anioNum) ? anioNum : undefined,
                })

                if (vehiculoResult.error) {
                    setVehiculoError(vehiculoResult.error)
                    return
                }

                // Armar notas con km si corresponde
                const kmNote = nuevoVehiculo.km ? `Km: ${nuevoVehiculo.km}` : ""
                const notasFinales = [kmNote, payload.notas].filter(Boolean).join(" | ")

                const result = isEditing
                    ? await editarTurno(turno!.id, { ...payload, auto_id: vehiculoResult.autoId, notas: notasFinales || undefined })
                    : await crearTurno({ ...payload, auto_id: vehiculoResult.autoId, notas: notasFinales || undefined })

                if (result.error) {
                    toast.error(result.error)
                    return
                }
                toast.success(isEditing ? "Auto actualizado" : "Auto ingresado")
                onClose()
                return
            }

            const result = isEditing
                ? await editarTurno(turno!.id, payload)
                : await crearTurno(payload)

            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(isEditing ? "Auto actualizado" : "Auto ingresado")
            onClose()
        })
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Auto" : "Nuevo Auto"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Cliente */}
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label>Cliente</Label>
                            <Select
                                value={watch("cliente_id") || "none"}
                                onValueChange={(v) => {
                                    const val = v === "none" ? "" : v
                                    setValue("cliente_id", val)
                                    setSelectedClienteId(val || undefined)
                                    setValue("auto_id", "")
                                }}
                            >
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

                        {/* Sección de Vehículo */}
                        <div className="sm:col-span-2 space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-1.5">
                                    <Car className="size-3.5 text-slate-500" />
                                    Vehículo
                                </Label>
                                <div className="flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => { setModoVehiculo("existente"); setValue("auto_id", "") }}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${modoVehiculo === "existente"
                                            ? "bg-slate-800 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        Seleccionar existente
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setModoVehiculo("nuevo"); setValue("auto_id", "") }}
                                        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${modoVehiculo === "nuevo"
                                            ? "bg-slate-800 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                    >
                                        Nuevo vehículo
                                    </button>
                                </div>
                            </div>

                            {modoVehiculo === "existente" ? (
                                <Select
                                    value={watch("auto_id") || "none"}
                                    onValueChange={(v) => setValue("auto_id", v === "none" ? "" : v)}
                                    disabled={filteredAutos.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !selectedClienteId
                                                ? "Elegí primero un cliente"
                                                : filteredAutos.length === 0
                                                    ? "Sin vehículos registrados — usá Nuevo vehículo"
                                                    : "Seleccionar vehículo"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin vehículo</SelectItem>
                                        {filteredAutos.map((a) => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {[a.marca, a.modelo].filter(Boolean).join(" ") || "Vehículo"} — {a.patente}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="rounded-lg border border-slate-200 p-3 space-y-3 bg-slate-50/50">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Patente *</Label>
                                            <Input
                                                placeholder="Ej: ABC123"
                                                value={nuevoVehiculo.patente}
                                                onChange={(e) => setNuevoVehiculo(v => ({ ...v, patente: e.target.value.toUpperCase() }))}
                                                className="h-8 text-sm uppercase"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Kilometraje</Label>
                                            <Input
                                                placeholder="Ej: 85000"
                                                type="number"
                                                value={nuevoVehiculo.km}
                                                onChange={(e) => setNuevoVehiculo(v => ({ ...v, km: e.target.value }))}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Marca</Label>
                                            <Input
                                                placeholder="Ej: Toyota"
                                                value={nuevoVehiculo.marca}
                                                onChange={(e) => setNuevoVehiculo(v => ({ ...v, marca: e.target.value }))}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Modelo</Label>
                                            <Input
                                                placeholder="Ej: Corolla"
                                                value={nuevoVehiculo.modelo}
                                                onChange={(e) => setNuevoVehiculo(v => ({ ...v, modelo: e.target.value }))}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Año</Label>
                                            <Input
                                                placeholder="Ej: 2018"
                                                type="number"
                                                min={1900}
                                                max={new Date().getFullYear() + 1}
                                                value={nuevoVehiculo.anio}
                                                onChange={(e) => setNuevoVehiculo(v => ({ ...v, anio: e.target.value }))}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                    {vehiculoError && (
                                        <p className="text-xs text-red-500">{vehiculoError}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Problema del cliente — campo obligatorio */}
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="notas">Problema del cliente *</Label>
                            <Textarea
                                id="notas"
                                placeholder="Describí el problema que reporta el cliente..."
                                className="resize-none h-20"
                                {...register("notas")}
                            />
                            {errors.notas && <p className="text-xs text-red-500">{errors.notas.message}</p>}
                        </div>

                        {/* Descripción del trabajo — campo opcional */}
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="descripcion">Descripción del trabajo realizado (opcional)</Label>
                            <Input
                                id="descripcion"
                                placeholder="Ej: Cambio de aceite y filtros, tren delantero..."
                                {...register("descripcion")}
                            />
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
                                onValueChange={(v) => setValue("estado", v as TurnoFormData["estado"])}
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

                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t mt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending} style={{ backgroundColor: "#1E3A5F" }}>
                            {isPending && <Loader2 className="size-4 animate-spin" />}
                            {isEditing ? "Guardar cambios" : "Ingresar auto"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
