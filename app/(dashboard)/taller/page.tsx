import { Wrench, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import TurnoTable from "@/components/taller/TurnoTable"
import type { Cliente, Auto, TurnoConDetalles } from "@/types/database"

export default async function TallerPage() {
    const supabase = await createClient()

    const [turnosResult, clientesResult, autosResult] = await Promise.all([
        supabase
            .from("turnos_taller")
            .select("*, clientes(nombre), autos(patente, marca, modelo)")
            .order("fecha_turno", { ascending: true }),
        supabase.from("clientes").select("*").order("nombre"),
        supabase.from("autos").select("*"),
    ])

    const turnos = (turnosResult.data ?? []) as TurnoConDetalles[]
    const clientes = (clientesResult.data ?? []) as Cliente[]
    const autos = (autosResult.data ?? []) as Auto[]

    // Estadísticas rápidas
    const pendientes = turnos.filter(t => t.estado === 'pendiente').length
    const enProgreso = turnos.filter(t => t.estado === 'en_progreso').length
    const completados = turnos.filter(t => t.estado === 'completado').length

    const stats = [
        { label: "Pendientes", value: pendientes, icon: Clock, color: "#F59E0B", bg: "#FEF3C7" },
        { label: "En Progreso", value: enProgreso, icon: Wrench, color: "#3B82F6", bg: "#DBEAFE" },
        { label: "Completados", value: completados, icon: CheckCircle2, color: "#10B981", bg: "#D1FAE5" },
    ]

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="animate-fade-in-down">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "#EDE9FE" }}>
                        <Wrench className="size-5" style={{ color: "#7C3AED" }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
                            Taller
                        </h1>
                        <p className="text-sm" style={{ color: "#64748B" }}>
                            Gestión de turnos y servicios mecánicos
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up animation-delay-100">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between"
                    >
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                        <div
                            className="p-2.5 rounded-lg"
                            style={{ backgroundColor: stat.bg }}
                        >
                            <stat.icon className="size-5" style={{ color: stat.color }} />
                        </div>
                    </div>
                ))}
            </div>

            <div
                className="animate-fade-in-up animation-delay-200 p-5"
                style={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E2E8F0",
                    borderRadius: "12px",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
            >
                <TurnoTable
                    turnos={turnos}
                    clientes={clientes}
                    autos={autos}
                />
            </div>
        </div>
    )
}
