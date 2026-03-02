import { ShoppingCart, CreditCard, CalendarDays, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import VentaTable from "@/components/ventas/VentaTable"
import { formatARS } from "@/lib/utils"
import type { Cliente, Auto, Producto } from "@/types/database"

export default async function VentasPage() {
  const supabase = await createClient()

  const [ventasResult, clientesResult, autosResult, productosResult] = await Promise.all([
    supabase
      .from("ventas")
      .select("*, clientes(nombre), autos(patente, marca, modelo), items:venta_items(cantidad, precio_unitario, productos(precio_costo))")
      .order("fecha", { ascending: false }),
    supabase.from("clientes").select("*").order("nombre"),
    supabase.from("autos").select("*"),
    supabase.from("productos").select("*").order("nombre"),
  ])

  const ventas = ventasResult.data ?? []
  const clientes = (clientesResult.data ?? []) as Cliente[]
  const autos = (autosResult.data ?? []) as Auto[]
  const productos = (productosResult.data ?? []) as Producto[]

  // Cálculos de KPIs
  const ventasConfirmadas = ventas.filter((v) => v.estado === "confirmada")
  const ventasTotales = ventasConfirmadas.reduce((sum, v) => sum + Number(v.total), 0)

  // Obtener fecha actual en formato string timezone server (ajustar si es necesario, tomando hoy "YYYY-MM-DD")
  // Una forma simple, confiable e independiente de librerías para Argentina (por si está alojado afuera)
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const localDate = new Date(now.getTime() - (offset * 60 * 1000))
  const todayStr = localDate.toISOString().split("T")[0]
  const monthStr = todayStr.substring(0, 7) // "YYYY-MM"

  const ventasHoy = ventasConfirmadas.filter((v) => v.fecha.startsWith(todayStr))
  const totalHoy = ventasHoy.reduce((sum, v) => sum + Number(v.total), 0)

  const ventasMes = ventasConfirmadas.filter((v) => v.fecha.startsWith(monthStr))
  const totalMes = ventasMes.reduce((sum, v) => sum + Number(v.total), 0)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-in-down">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-lg bg-blue-100">
            <ShoppingCart className="size-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Ventas
            </h1>
            <p className="text-sm text-slate-500">
              Registro de ventas y presupuestos · {ventas.length} registro{ventas.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up animation-delay-100">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <CreditCard className="size-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Ventas Totales</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatARS(ventasTotales)}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <CalendarDays className="size-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Ventas de Hoy</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatARS(totalHoy)}</h3>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-amber-500">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <TrendingUp className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Ingresos del Mes</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatARS(totalMes)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-fade-in-up animation-delay-200 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
        <VentaTable
          ventas={ventas as Parameters<typeof VentaTable>[0]["ventas"]}
          clientes={clientes}
          autos={autos}
          productos={productos}
        />
      </div>
    </div>
  )
}
