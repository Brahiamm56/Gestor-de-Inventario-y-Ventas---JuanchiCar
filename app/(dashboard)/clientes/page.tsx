import { UserCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import ClienteTable from "@/components/clientes/ClienteTable"
import type { Cliente, Auto, TurnoTaller } from "@/types/database"

export default async function ClientesPage() {
  const supabase = await createClient()

  const [clientesResult, autosResult, ventasResult, turnosResult] = await Promise.all([
    supabase.from("clientes").select("*").order("nombre"),
    supabase.from("autos").select("*"),
    supabase
      .from("ventas")
      .select("*, autos(patente)")
      .order("fecha", { ascending: false }),
    supabase
      .from("turnos_taller")
      .select("*")
      .order("fecha_turno", { ascending: false }),
  ])

  const clientes = (clientesResult.data ?? []) as Cliente[]
  const autos = (autosResult.data ?? []) as Auto[]
  const ventas = ventasResult.data ?? []
  const turnos = (turnosResult.data ?? []) as TurnoTaller[]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "#D1FAE5" }}>
            <UserCheck className="size-5" style={{ color: "#059669" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
              Clientes
            </h1>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Gestión de clientes y vehículos · {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div
        className="animate-fade-in-up animation-delay-100 p-5"
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: "12px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <ClienteTable
          clientes={clientes}
          autos={autos}
          ventas={ventas as Parameters<typeof ClienteTable>[0]["ventas"]}
          turnos={turnos}
        />
      </div>
    </div>
  )
}
