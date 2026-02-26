import { Package, TrendingUp, AlertTriangle, Boxes } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import ProductoTable from "@/components/stock/ProductoTable"
import { formatARS } from "@/lib/utils"
import type { Producto, Proveedor } from "@/types/database"

export default async function StockPage() {
  const supabase = await createClient()

  const [productosResult, proveedoresResult] = await Promise.all([
    supabase.from("productos").select("*").order("nombre"),
    supabase.from("proveedores").select("*").order("nombre"),
  ])

  const productos = (productosResult.data ?? []) as Producto[]
  const proveedores = (proveedoresResult.data ?? []) as Proveedor[]

  // Cálculos de KPIs
  const totalProductos = productos.length
  const valorInventario = productos.reduce((acc, p) => acc + (Number(p.precio_costo ?? 0) * p.stock), 0)
  const stockBajoCount = productos.filter(p => p.stock <= p.stock_minimo).length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: "#F3E8FF" }}>
            <Package className="size-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Stock e Inventario
            </h1>
            <p className="text-sm text-slate-500">
              Gestión de repuestos y control de existencias
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up animation-delay-100">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Boxes className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Productos</p>
              <h3 className="text-2xl font-bold text-slate-900">{totalProductos}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <TrendingUp className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Valor Inventario</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatARS(valorInventario)}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <AlertTriangle className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Stock Bajo</p>
              <h3 className="text-2xl font-bold text-slate-900">{stockBajoCount}</h3>
            </div>
          </div>
        </div>
      </div>

      <div
        className="animate-fade-in-up animation-delay-200 p-5 bg-white border border-slate-200 rounded-xl shadow-sm"
      >
        <ProductoTable productos={productos} proveedores={proveedores} />
      </div>
    </div>
  )
}
