import Link from "next/link"
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Plus,
  CalendarPlus,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { formatARS, getMonthName, timeAgo } from "@/lib/utils"
import {
  VentasSemanalesChart,
  IngresosVsGastosChart,
  MetodosPagoChart,
  RecentActivity,
} from "@/components/dashboard/DashboardCharts"
import type { Producto, VentaConCliente, MetodoPago, TurnoConDetalles } from "@/types/database"

// Obtener inicio y fin del mes actual
function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  return { start, end }
}

// Obtener los últimos 6 meses como rango
function getLast6Months() {
  const months: Array<{ label: string; start: string; end: string }> = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const start = d.toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString()
    months.push({
      label: getMonthName(d.getMonth()).slice(0, 3),
      start,
      end,
    })
  }
  return months
}

// Obtener las últimas 8 semanas para el gráfico de ventas semanales
function getLast8Weeks() {
  const weeks: Array<{ label: string; start: string; end: string }> = []
  const now = new Date()

  for (let i = 7; i >= 0; i--) {
    const endDate = new Date(now)
    endDate.setDate(now.getDate() - i * 7)
    const startDate = new Date(endDate)
    startDate.setDate(endDate.getDate() - 6)

    const day = endDate.getDate()
    const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    const month = monthNames[endDate.getMonth()]

    weeks.push({
      label: `${day} ${month}`,
      start: startDate.toISOString(),
      end: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59).toISOString(),
    })
  }
  return weeks
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { start, end } = getCurrentMonthRange()
  const now = new Date()

  // Consultas en paralelo para mejor performance
  const [
    ventasMesResult,
    stockResult,
    ingresosResult,
    stockBajoResult,
    ultimasVentasResult,
    metodosPagoResult,
    turnosTallerResult,
  ] = await Promise.all([
    // Total ventas del mes actual (suma de totales)
    supabase
      .from("ventas")
      .select("total")
      .eq("estado", "confirmada")
      .gte("fecha", start)
      .lte("fecha", end),

    // Total stock disponible
    supabase.from("productos").select("stock"),

    // Ingresos del mes (ventas confirmadas)
    supabase
      .from("ventas")
      .select("total")
      .eq("estado", "confirmada")
      .gte("fecha", start)
      .lte("fecha", end),

    // Productos (para filtrar stock bajo)
    supabase
      .from("productos")
      .select("id, nombre, stock, stock_minimo")
      .order("stock", { ascending: true }),

    // Últimas 5 ventas
    supabase
      .from("ventas")
      .select("id, fecha, total, estado, clientes(nombre)")
      .order("fecha", { ascending: false })
      .limit(5),

    // Métodos de pago de ventas confirmadas
    supabase
      .from("ventas")
      .select("metodo_pago, total")
      .eq("estado", "confirmada"),

    // Turnos del taller
    supabase.from("turnos_taller").select("*"),
  ])

  // Calcular métricas
  const ventasMesTotal = (ventasMesResult.data ?? []).reduce((sum, v) => sum + Number(v.total), 0)
  const ingresosMes = (ingresosResult.data ?? []).reduce((sum, v) => sum + Number(v.total), 0)

  // Stock bajo
  const allProducts = (stockBajoResult.data ?? []) as Pick<Producto, "id" | "nombre" | "stock" | "stock_minimo">[]
  const stockBajoProducts = allProducts.filter((p) => p.stock <= p.stock_minimo)
  const stockCriticoCount = stockBajoProducts.length
  const stockUrgentes = stockBajoProducts.filter((p) => p.stock <= 2).length

  const ultimasVentas = (ultimasVentasResult.data ?? []) as unknown as VentaConCliente[]

  // Procesar métodos de pago
  const metodosPagoRaw = (metodosPagoResult.data ?? []) as Array<{ metodo_pago: MetodoPago | null; total: number }>
  const METODO_COLORS: Record<string, string> = {
    efectivo: "#10B981",
    transferencia: "#3B82F6",
    tarjeta: "#F59E0B",
  }
  const metodosPagoMap = new Map<string, { cantidad: number; monto: number }>()
  for (const v of metodosPagoRaw) {
    const metodo = v.metodo_pago ?? "efectivo"
    const prev = metodosPagoMap.get(metodo) ?? { cantidad: 0, monto: 0 }
    metodosPagoMap.set(metodo, {
      cantidad: prev.cantidad + 1,
      monto: prev.monto + Number(v.total),
    })
  }
  const totalMetodos = metodosPagoRaw.length || 1
  const metodosPagoData = Array.from(metodosPagoMap.entries()).map(([nombre, { cantidad, monto }]) => ({
    nombre,
    cantidad,
    monto,
    color: METODO_COLORS[nombre] ?? "#94A3B8",
    porcentaje: Math.round((cantidad / totalMetodos) * 100),
  }))

  const turnosTaller = (turnosTallerResult.data ?? [])
  const turnosActivos = turnosTaller.filter(t => t.estado === 'pendiente' || t.estado === 'en_progreso').length
  const listosHoy = turnosTaller.filter(t => t.estado === 'completado').length

  // Obtener datos de gráficos — ventas semanales (en paralelo para mejor performance)
  const last8Weeks = getLast8Weeks()
  const weeklyResults = await Promise.all(
    last8Weeks.map((week) =>
      supabase
        .from("ventas")
        .select("total")
        .eq("estado", "confirmada")
        .gte("fecha", week.start)
        .lte("fecha", week.end)
    )
  )
  const ventasSemanales = last8Weeks.map((week, i) => ({
    semana: week.label,
    total: (weeklyResults[i].data ?? []).reduce((s, v) => s + Number(v.total), 0),
  }))

  // Obtener datos de ingresos vs gastos (últimos 6 meses, en paralelo)
  const last6 = getLast6Months()
  const monthlyResults = await Promise.all(
    last6.map((month) =>
      supabase
        .from("ventas")
        .select("total")
        .eq("estado", "confirmada")
        .gte("fecha", month.start)
        .lte("fecha", month.end)
    )
  )
  const ingresosVsGastos = last6.map((month, i) => {
    const ventasMonth = monthlyResults[i]
    return {
      mes: month.label,
      ingresos: (ventasMonth.data ?? []).reduce((s, v) => s + Number(v.total), 0),
      gastos: 0,
    }
  })

  // Calcular variación vs mes anterior para ventas
  const mesAnteriorIngresos = ingresosVsGastos.length >= 2 ? ingresosVsGastos[ingresosVsGastos.length - 2].ingresos : 0
  const mesActualIngresos = ingresosVsGastos.length >= 1 ? ingresosVsGastos[ingresosVsGastos.length - 1].ingresos : 0
  const variacionVentas = mesAnteriorIngresos > 0
    ? Math.round(((mesActualIngresos - mesAnteriorIngresos) / mesAnteriorIngresos) * 100)
    : 0

  // Calcular ganancias totales
  const mesActualGastos = ingresosVsGastos.length >= 1 ? ingresosVsGastos[ingresosVsGastos.length - 1].gastos : 0
  const gananciasTotales = mesActualIngresos - mesActualGastos
  const mesAnteriorGastos = ingresosVsGastos.length >= 2 ? ingresosVsGastos[ingresosVsGastos.length - 2].gastos : 0
  const gananciaAnterior = mesAnteriorIngresos - mesAnteriorGastos
  const variacionGanancias = gananciaAnterior > 0
    ? Math.round(((gananciasTotales - gananciaAnterior) / gananciaAnterior) * 100)
    : 0

  // Preparar actividad reciente (Ventas + Turnos)
  const activityItems = [
    ...ultimasVentas.map(v => ({
      id: v.id,
      type: 'venta' as const,
      status: v.estado,
      name: v.clientes?.nombre || "Consumidor Final",
      amount: v.total,
      date: v.fecha
    })),
    ...((turnosTallerResult.data ?? []) as unknown as TurnoConDetalles[]).slice(0, 5).map(t => ({
      id: t.id,
      type: 'turno' as const,
      status: t.estado,
      name: t.clientes?.nombre || "Cliente",
      description: t.descripcion,
      date: t.fecha_turno
    }))
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(item => {
      let icon: "alert" | "wrench" | "check" | "cart" = "cart"
      let text = ""

      if (item.type === 'venta') {
        icon = item.status === 'confirmada' ? 'check' : item.status === 'cancelada' ? 'alert' : 'cart'
        text = `Venta ${item.status === 'presupuesto' ? 'Presupuesto' : ''}: ${item.name}`
      } else {
        icon = 'wrench'
        text = `Turno: ${item.name} (${item.description})`
      }

      return {
        id: item.id,
        icon,
        text,
        time: timeAgo(item.date)
      }
    })

  const allActivity = activityItems

  // KPI cards data — matching reference screenshot exactly
  const kpiCards = [
    {
      label: "Ventas del Mes",
      value: formatARS(ventasMesTotal),
      detail: variacionVentas >= 0
        ? `+${variacionVentas}% vs mes anterior`
        : `${variacionVentas}% vs mes anterior`,
      detailColor: variacionVentas >= 0 ? "#22C55E" : "#EF4444",
      iconBg: "#DCFCE7",
      iconColor: "#22C55E",
      Icon: TrendingUp,
    },
    {
      label: "Stock Crítico",
      value: `${stockCriticoCount}`,
      valueSuffix: " items",
      detail: `${stockUrgentes} urgentes`,
      detailColor: "#EF4444",
      iconBg: "#FEE2E2",
      iconColor: "#EF4444",
      Icon: AlertTriangle,
    },
    {
      label: "Vehículos en Taller",
      value: `${turnosActivos}`,
      valueSuffix: " activos",
      detail: `${listosHoy} listos hoy`,
      detailColor: "#22C55E",
      iconBg: "#F0FDF4",
      iconColor: "#22C55E",
      Icon: Wrench,
    },
    {
      label: "Ganancias Totales",
      value: formatARS(gananciasTotales),
      detail: variacionGanancias >= 0
        ? `+${variacionGanancias}% vs mes anterior`
        : `${variacionGanancias}% vs mes anterior`,
      detailColor: variacionGanancias >= 0 ? "#22C55E" : "#EF4444",
      iconBg: "#DCFCE7",
      iconColor: "#22C55E",
      Icon: TrendingUp,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in-down">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#0F172A", fontFamily: "var(--font-dm-sans)" }}>
            Dashboard <span className="text-gray-400 mx-1">·</span> <span className="font-semibold text-gray-500">Estadísticas</span>
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
            Resumen operativo · {getMonthName(now.getMonth())} {now.getFullYear()}
          </p>
        </div>

        {/* Quick Actions Dropdown */}
        <div className="relative group">
          <Button
            className="font-semibold cursor-pointer gap-2 pr-3 pl-4 h-10 shadow-sm transition-all hover:shadow-md"
            style={{ backgroundColor: "#1E3A5F", color: "#FFFFFF", borderRadius: "10px" }}
          >
            Quick Actions
            <ChevronDown className="size-4 opacity-80" />
          </Button>
          <div
            className="absolute right-0 top-full mt-2 w-52 rounded-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 border bg-white shadow-2xl scale-95 group-hover:scale-100 origin-top-right"
            style={{ borderColor: "#E2E8F0" }}
          >
            <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Accesos Rápidos
            </div>
            <Link
              href="/ventas"
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50 mx-2 rounded-xl"
              style={{ color: "#334155" }}
            >
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Plus className="size-4" />
              </div>
              Nueva Venta
            </Link>
            <Link
              href="/taller"
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50 mx-2 rounded-xl"
              style={{ color: "#334155" }}
            >
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <CalendarPlus className="size-4" />
              </div>
              Nuevo Turno
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, index) => (
          <div
            key={card.label}
            className={`flex flex-col justify-between animate-fade-in-up ${index === 1 ? "animation-delay-100" :
              index === 2 ? "animation-delay-200" :
                index === 3 ? "animation-delay-300" : ""
              } transition-all duration-300 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {card.label}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 tracking-tight">
                    {card.value}
                  </span>
                  {"valueSuffix" in card && (
                    <span className="text-sm font-medium text-gray-500">
                      {card.valueSuffix}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold mt-1" style={{ color: card.detailColor }}>
                  {card.detail}
                </p>
              </div>
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full shrink-0"
                style={{ backgroundColor: card.iconBg }}
              >
                <card.Icon className="size-6" style={{ color: card.iconColor }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section — 4 columnas con Metodos de Pago primero */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetodosPagoChart data={metodosPagoData} />
        <VentasSemanalesChart data={ventasSemanales} />
        <IngresosVsGastosChart data={ingresosVsGastos} />
        <RecentActivity items={allActivity} />
      </div>
    </div>
  )
}
