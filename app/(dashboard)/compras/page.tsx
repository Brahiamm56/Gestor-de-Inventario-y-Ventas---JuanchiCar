import { ClipboardList, TrendingDown, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import CompraTable from "@/components/compras/CompraTable"
import { formatARS } from "@/lib/utils"
import type { Proveedor, Producto } from "@/types/database"

export default async function ComprasPage() {
  const supabase = await createClient()

  const [comprasResult, proveedoresResult, productosResult] = await Promise.all([
    supabase
      .from("compras")
      .select("*, proveedores(nombre)")
      .order("fecha", { ascending: false }),
    supabase.from("proveedores").select("*").order("nombre"),
    supabase.from("productos").select("*").order("nombre"),
  ])

  const compras = comprasResult.data ?? []
  const proveedores = (proveedoresResult.data ?? []) as Proveedor[]
  const productos = (productosResult.data ?? []) as Producto[]

  // KPIs
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const comprasMes = compras.filter((c) => c.fecha >= startOfMonth)
  const totalMes = comprasMes.reduce((sum, c) => sum + Number(c.total), 0)
  const totalProductosComprados = compras.length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-orange-100">
            <ClipboardList className="size-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Compras
            </h1>
            <p className="text-sm text-slate-500">
              Registro de compras a proveedores · {compras.length} registro{compras.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up animation-delay-100">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <TrendingDown className="size-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Gastos del Mes</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatARS(totalMes)}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <ClipboardList className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Compras del Mes</p>
              <h3 className="text-2xl font-bold text-slate-900">{comprasMes.length}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <Package className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Compras</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalProductosComprados}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-fade-in-up animation-delay-200 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <CompraTable
          compras={compras as Parameters<typeof CompraTable>[0]["compras"]}
          proveedores={proveedores}
          productos={productos}
        />
      </div>
    </div>
  )
}
