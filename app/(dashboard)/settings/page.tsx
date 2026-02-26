"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAppStore } from "@/store/useAppStore"

export default function SettingsPage() {
    const { settings, setSettings } = useAppStore()
    const [formData, setFormData] = useState(settings)
    const [isSaving, setIsSaving] = useState(false)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    function handleSave() {
        setIsSaving(true)
        setTimeout(() => {
            setSettings(formData)
            setIsSaving(false)
            toast.success("Configuración guardada")
        }, 500)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 ">Configuración del Taller</h1>
                <p className="text-sm text-slate-500 ">
                    Personaliza los detalles de tu taller, estos datos se mostrarán en los comprobantes PDF y en la navegación.
                </p>
            </div>

            <div className="bg-white  border border-slate-200  rounded-lg p-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Taller</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" name="address" value={formData.address} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="cuit">CUIT</Label>
                    <Input id="cuit" name="cuit" value={formData.cuit} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                </div>

                <div className="pt-4 flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving} className="bg-[#1E3A5F] text-white hover:bg-[#2d4a6f] text-white">
                        <Save className="size-4 mr-2" />
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
