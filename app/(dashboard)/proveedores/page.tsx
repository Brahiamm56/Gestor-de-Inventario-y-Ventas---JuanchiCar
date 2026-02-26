import { Truck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import ProveedorTable from "@/components/proveedores/ProveedorTable"
import type { Proveedor } from "@/types/database"

export default async function ProveedoresPage() {
    const supabase = await createClient()

    const { data } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre")

    const proveedores = (data ?? []) as Proveedor[]

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="animate-fade-in-down">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: "#FEF3C7" }}>
                        <Truck className="size-5" style={{ color: "#D97706" }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
                            Proveedores
                        </h1>
                        <p className="text-sm" style={{ color: "#64748B" }}>
                            Gestión de proveedores · {proveedores.length} proveedor{proveedores.length !== 1 ? "es" : ""}
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
                <ProveedorTable proveedores={proveedores} />
            </div>
        </div>
    )
}
